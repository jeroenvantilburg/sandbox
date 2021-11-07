// All code runs in this anonymous function
// to avoid cluttering the global variables
(function() {

  let dataCont = []; //data container, every signal (hit) goes into it
  let portNames = [];

  function addData( name ){
    // Create a new data item and add to the container
    let dataItem = { name: name, hits: [], port: null, reader: null, inputDone: null};
    dataCont.push(dataItem);

    // Add an extra column to the summary table
    addColumn( name );

    // return the current index
    return dataCont.length-1;
  }

  function addColumn(name) {
    let iter = dataCont.length-1;
    $('#summaryTable').find('tr').each(function(){
      let row = $(this);
      let content = " ";
      if( row.index() === 0 ) content = name;
      if( this.id == "startMeas" && name.startsWith("usb")) 
        content = '<button id="start'+iter+'">Start</button>';
      if( this.id == "stopMeas" && name.startsWith("usb")) 
        content = '<button id="stop'+iter+'">Stop</button>';
      if( this.id == "removeMeas" ) 
        content = '<button id="remove'+iter+'">Remove</button>';
      row.append('<td id="'+this.id+"_n"+iter+'">'+content+'</td>');
    });
  }

  let loglinear = "linear";

  let amplChart = Highcharts.chart('amplChart', {
    chart: {
      //type: 'column',
      type: 'area',
      margin: [100, 25, 50, 50],
      height: 300,
    },
    title: {
      text: 'Signal amplitude',
    },
    legend: {
      enabled: true,
      align: 'right',
      verticalAlign: 'top',
      layout: 'vertical',
      floating: true
    },
    credits: {
      enabled: false
    },
    plotOptions: {
      column: {
        grouping: false,
        shadow: false,
        opacity: 0.5,
      },
      series: {
        //minPointLength: 2,
        marker: {
          enabled: false
        },
        //type: "line",
        step: true,
        pointPadding: 0,
        groupPadding: 0,
        borderWidth: 1,
      }
    },
    xAxis: {
      title: {
        text: 'peak height (mV)'
      }
    },
    yAxis: {
      title: {
        text: 'number of events'
      },
      maxPadding: 0,
      endOnTick: false,
      type: loglinear
    },
  });

  // Event listener for connecting to serial port
  $("#connect").click( async () => { 
    if ('serial' in navigator) {
      try {
        let port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        let signals = await port.getSignals();
        //console.log(port.getInfo());
        //console.log(signals);
        let portName = "usb"+portNames.length;
        portNames.push(portName);
        let i = addData( portName );
        dataCont[i].port = port;
        addSeriesToAmplHist( portName );
      }
      catch (err) {
        console.error('There was an error opening the serial port:', err);
      }
    } else {
      console.error('Web serial doesn\'t seem to be enabled in your browser.'+
                    ' Try enabling it by visiting:');
      console.error('chrome://flags/#enable-experimental-web-platform-features');
      console.error('opera://flags/#enable-experimental-web-platform-features');
      console.error('edge://flags/#enable-experimental-web-platform-features');
    }
  });

  $('[id^="start"]').click( async (event) => {
    console.log(event.target.id);
    let i = parseInt(event.target.id.slice(5));

    if( !dataCont[i].port ) return;


    // See https://codelabs.developers.google.com/codelabs/web-serial/#3
    // CODELAB: Add code to read the stream here.
    let decoder = new TextDecoderStream();
    dataCont[i].inputDone = dataCont[i].port.readable.pipeTo(decoder.writable);
    dataCont[i].reader = decoder.readable.getReader();
    //console.log(port);

    $("#receiveText").val( "" ) ;

    let line = "";
    while (true) {
      const { value, done } = await dataCont[i].reader.read();
      if (value) {
        $("#receiveText").append( value ) ;
        line += value;
        if( line.substr(line.length - 1) === "\n" ) {
          line = line.split("\n").at(-2);
          //console.log( line );
          $("#receiveText").val( $("#receiveText").val() + line + "\n" ) ;
          let sipmVal = processLine( line, dataCont[i].hits );
          updateRate( line, i );
          addHitToAmplHist( i, sipmVal );
          
          //updateAmplHist( dataCont[i].hits );
          line = "";
        }

        $("#receiveText").scrollTop( $("#receiveText")[0].scrollHeight ) ;
      }
      if (done) {
        console.log('[readLoop] DONE', done);
        dataCont[i].reader.releaseLock();
        break;
      }
    }
  });

  $('[id^="stop"]').click( async (event) => {
    console.log(event.target.id);
    let i = parseInt(event.target.id.slice(4));
    if (dataCont[i].reader) {
      await dataCont[i].reader.cancel();
      await dataCont[i].inputDone.catch(() => {});
      dataCont[i].reader = null;
      dataCont[i].inputDone = null;
    }
    return;
  });

  $('[id^="remove"]').click( async (event) => {
    console.log(event.target.id);
    let i = parseInt(event.target.id.slice(6));
    clearData( i );
    //console.log(i);
  });

  async function clearData( i ) {
    // Clear the port
    if (dataCont[i].port) {
      if (dataCont[i].reader) {
        await dataCont[i].reader.cancel();
        await dataCont[i].inputDone.catch(() => {});
        dataCont[i].reader = null;
        dataCont[i].inputDone = null;
      }
      await dataCont[i].port.close();
      dataCont[i].port = null;
    }

    // Clear data and remove from charts
    dataCont[i].hits = [];
    amplChart.series[i].setData([],true,true);
    $('#summaryTable').find('td').each(function(){
      if( this.id.endsWith("n"+i) ) $(this).remove();
    });
  }

  // When import is clicked (dummy button) trigger input  
  $("#import").click( () => {
    // Reset the file input such that it triggers any change
    $("#input").val('');

    // Progagate to (hidden) DOM element
    $("#input").click();
  });


  $("#input").change( async function() {

    // Get the file
    let file = this.files[0]; 

    // Create a new hits container and add to the series
    let i = addData( file.name );
    let hits = dataCont[i].hits;

    let text = await file.text();
    let textArray = text.split("\n");
    textArray.splice(0,6);
    //console.log("Length = " + textArray.length.toString() );
    //console.log( textArray );

    // Loop over the lines in the text file
    for( let i=0; i < textArray.length-1; ++i ) {
      if( i%1000 === 0 ) console.log(i.toString() + " = " + 
      (i/textArray.length*100).toFixed(1) + "%" );

      let sipmVal = processLine( textArray[i], hits );
    }

    let lastLine = textArray[ textArray.length-2 ];
    console.log( lastLine );
    updateRate( lastLine, i );

    addSeriesToAmplHist( file.name );
    updateAmplHist( i );
    $("#receiveText").val( text );
    
  });

  function updateRate( line, numSerie ) {
    // Split the line into different items
    let items = line.split(" ");

    let nEvents, ardTime, deadTime;

    // Guess the format
    if( items.length === 9 ) { // With computer time/date
      nEvents = items[2];
      ardTime = items[3]*0.001;
      deadTime = items[6]*0.001;
    } else if ( items.length === 6 ) { // Without computer time/date
      nEvents = items[0];
      ardTime = items[1]*0.001;
      deadTime = items[4]*0.001;
    } else {
      return;
    }

    //console.log( nEvents );

    let timeHours = ardTime/3600
    let upTime = ardTime - deadTime
    let rate = nEvents / upTime
    let rate_error = Math.sqrt(nEvents) / upTime
    let significance = Math.floor(Math.log10(rate_error))-1

    $("#nEvents_n"+numSerie).html( nEvents );
    $("#ardtime_n"+numSerie).html( ardTime.toFixed(3) + " s ("+
                                 timeHours.toFixed(3) + " h)" );
    $("#deadtime_n"+numSerie).html( deadTime.toFixed(3)+ " s" );
    $("#uptime_n"+numSerie).html( upTime.toFixed(3) + " s");
    $("#rate_n"+numSerie).html( rate.toFixed( -significance ) + "&#177;" + 
                              rate_error.toFixed( -significance ) + " Hz" );

  }

  function processLine( line, hits ) {

    // Split the line into different items
    let items = line.split(" ");

    // Initialize the data
    let sipmVal;

    // Guess the format
    if( items.length === 9 ) { // With computer time/date
      sipmVal = items[5];
    } else if ( items.length === 6 ) { // Without computer time/date
      sipmVal = items[3];
    }

    if( sipmVal ) {
      hits.push( { ampl: parseFloat( sipmVal ) } );
      //hits.push( parseFloat( sipmVal )  );

      /*hits.push({index: parseInt(columns[2]), 
                   time: moment(columns[0]+' '+columns[1],'YYYY-MM-DD HH:mm:ss.SSSSSS'),
                   ard_stamp: parseFloat(columns[3]),
                   ard_ampl: parseFloat(columns[4]),
                   ampl: parseFloat(columns[5]),
                   dead: parseFloat(columns[6])
        });*/
      return sipmVal;
    }
    return 0;
  }

  function addSeriesToAmplHist( name ) {
    let max = $("#maxAmpl").val();
    let num_bins=$("#nBins").val();;
    let binswithx = []; //with x positions of bins
    for (k=0;k<num_bins;k++){
      binswithx[k]=[(k+0.5)*max/num_bins, 0.01 ];
    }
    amplChart.addSeries({
      name: name,
      data: binswithx
    });
    return amplChart.series.length-1;
  }

  function addHitToAmplHist( iSeries, sipmVal ) {
    let data = amplChart.series[iSeries].data;
    let max = amplChart.xAxis[0].max;
    let ibin = Math.floor((sipmVal/max)*(data.length-1));
    if( ibin >= data.length ) return;
    data[ibin].update({y : data[ibin].y+1});
    return;
  }

  function updateAmplHist( iSeries ) {

    let hits = dataCont[iSeries].hits;
    if( hits.length === 0 ) return;

    let max = $("#maxAmpl").val();
    let num_bins=$("#nBins").val();;
    let bins = [];
    for (var k=0;k<num_bins;k++){
      bins[k]=0.01;
    }
    for (var i=0;i<hits.length;i++){
      var ibin = Math.floor((hits[i].ampl/max)*(num_bins-1));
      bins[ibin]++;
    }
    var binswithx = [];//with x positions of bins
    for (k=0;k<num_bins;k++){
      binswithx[k]=[(k+0.5)*max/num_bins,bins[k]];
    }
    console.log("series = " + iSeries);
    amplChart.series[iSeries].setData(binswithx, true, true);
  }

  $("#loglinear").click( () => {
    if( loglinear === "linear" ) loglinear = "logarithmic";
    else loglinear = "linear"; 
    amplChart.update( { yAxis : {type: loglinear } } );
  });

  $("#clear").click( () => {
    for( let i = 0; i < dataCont.length; ++i ) {
      clearData( i );
    }
    dataCont = [];
    portNames = [];
    $("#receiveText").val("") ;
  });

  $("#maxAmpl,#nBins").change( function() {
    for( let i=0; i<dataCont.length; ++i) {
      updateAmplHist( i ); 
    }
  });

})();

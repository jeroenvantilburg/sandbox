// TODO: License

// All code runs in this anonymous function
// to avoid cluttering the global variables
(function() {

/* ========== GLOBAL SECTION =================
   Global variables are defined here
   =========================================== */
  
    // HTML elements
  let video          = document.getElementById('video');
  let fpsInput       = document.getElementById('fpsInput');
  let originXInput   = document.getElementById('originXInput');
  let originYInput   = document.getElementById('originYInput');  
  let scaleInput     = document.getElementById('scaleInput');  

  //let statusMsg      = document.getElementById("statusMsg");
  //let videoInput     = document.getElementById('videoInput');
  //let showMediaInfo  = document.getElementById('showMediaInfo');
  //let originButton   = document.getElementById('origin');
  //let scaleButton    = document.getElementById('scale');
  //let prevButton     = document.getElementById('prev');
  //let playButton     = document.getElementById('play');
  //let nextButton     = document.getElementById('next');
  //let slider         = document.getElementById('slider');
  //let zoomOut        = document.getElementById('zoomOut');
  //let zoomIn         = document.getElementById('zoomIn');
  //let canvasOutput   = document.getElementById('canvasOutput');
  //let canvasContext  = canvasOutput.getContext('2d');
  //let frameCounter   = document.getElementById("frameNumber")  
  let startAndStopAuto = document.getElementById('startAndStopAuto');
  let startAndStopManual = document.getElementById('startAndStopManual');
  
  let startText = startAndStopManual.innerText;
  let stopText = "Stop analysis";

  var canvas = this.__canvas = new fabric.StaticCanvas('canvasOutput');
  fabric.Object.prototype.originX = fabric.Object.prototype.originY = 'center';
  
  let markerPoint = new fabric.Circle({ radius: 3, stroke: 'rgba(200,0,0)', strokeWidth: 1, 
                                        fill: 'rgba(0,0,0,0)' });
  function highlightMarker( markerP ) {
    markerP.set({stroke: 'red', strokeWidth: 2});
  }

  /*canvas.add(
    new fabric.Rect({ top: 100, left: 100, width: 50, height: 50, fill: '#f55' }),
    new fabric.Circle({ top: 140, left: 230, radius: 75, fill: 'green' }),
    new fabric.Triangle({ top: 300, left: 210, width: 100, height: 100, fill: 'blue' })
  );*/

  // Global video parameters
  let playing = false;
  let streaming = false;
  let width = 0;
  let height = 0;
  let frameNumber = 0;
  let FPS;
  let t0 = 0.0;
  let rawData = [];
  let videoName = "";

  // ...  
  let scale1, scale2;
  let pixelsPerMeter;
  let originX, originY; // in pixels
  
  /* ========== USER SETTINGS ======================
     These settings can be changed in settings menu
   ================================================= */

  let drawAllPoints = true;
  $('#drawAllPoints').prop('checked',drawAllPoints);
  $('#drawAllPoints').on('change', function(e) {
    drawAllPoints = $('#drawAllPoints').is(':checked');
    gotoFrame( frameNumber );
  });

  let framesToSkip = 1;
  $("#framesToSkip").val( framesToSkip );
  $("#framesToSkip").on("keydown",blurOnEnter);
  $("#framesToSkip").change( function() {
    if( isNumeric(this.value) ) {
      framesToSkip = Math.round( toNumber(this.value) );
    } else {
      this.value = framesToSkip || "";      
    }
  });
  
  let integrationTime = 2;
  $("#integrationTimeInput").val( integrationTime );
  $("#integrationTimeInput").on("keydown",blurOnEnter);
  $("#integrationTimeInput").change( function() {
    if( isNumeric(this.value) && toNumber(this.value) > 0.5) {
      integrationTime = Math.round( toNumber(this.value) );
      updatePlots(); 
    }
    this.value = integrationTime || "";
  });

  let showVelocity = ($('#velocityChart').css('display') != 'none' );
  $('#showVelocity').prop('checked',showVelocity);
  $('#showVelocity').on('change', function(e) {
    showVelocity = $('#showVelocity').is(':checked');
    $('#velocityChart').toggle();
  });
  
  let showAcceleration = ($('#accelerationChart').css('display') != 'none' );
  $('#showAcceleration').prop('checked',showAcceleration);
  $('#showAcceleration').on('change', function(e) {
    showAcceleration = $('#showAcceleration').is(':checked');
    $('#accelerationChart').toggle();
  });
  
  
  let decimalSeparator = getDecimalSeparator();
  $("#decimalSeparatorInput").val( decimalSeparator );
  $("decimalSep").html( decimalSeparator );
  $("#decimalSeparatorInput").change( function() { 
    decimalSeparator = this.value ;
    $("decimalSep").html( decimalSeparator );
  });
  
  let delimiter = ",";
  $("#delimiterInput").val( delimiter );
  $("delimiter").html( delimiter );
  $("#delimiterInput").change( function() { 
    delimiter = this.value ; 
    $("delimiter").html( delimiter === "tab" ? "&nbsp;&nbsp;&nbsp;&nbsp;" : delimiter );  
  });

  let avoidEmptyCells = false;
  $('#avoidEmptyCells').on('change', function(e) {
    avoidEmptyCells = $('#avoidEmptyCells').is(':checked');
  });

  
  /*$('input[name=decimalSeparatorInput][value="' + decimalSeparator +'"]').prop('checked',true);
  $('input[name=decimalSeparatorInput]').on('change', function(e) {
    decimalSeparator = document.querySelector('input[name="decimalSeparatorInput"]:checked').value;
  });*/
  

  //zoomOut.addEventListener('click', () => {
  $("#zoomOut").click( () => {
    /*console.log("zoom: " + canvasOutput.width / width );
    if( canvasOutput.width > 200 ) { // minimum 200 px should be small enough
      drawVideo(0.5*canvasOutput.width, 0.5*canvasOutput.height);
    }*/
    console.log("zoom: " + canvas.width / width );
    if( canvas.width > 200 ) { // minimum 200 px should be small enough
      drawVideo(0.5*canvas.width, 0.5*canvas.height);
    }

  });

  //zoomIn.addEventListener('click', () => {
  $("#zoomIn").click( () => {
    /*console.log("zoom: " + canvasOutput.width / width );
    if( canvasOutput.width < 8 * width ) { // Maximum zoom x8
      drawVideo(2*canvasOutput.width, 2*canvasOutput.height)
    }*/
    console.log("zoom: " + canvas.width / width );
    if( canvas.width < 8 * width ) { // Maximum zoom x8
      drawVideo(2*canvas.width, 2*canvas.height)
    }

  });

  function drawVideo(canvasWidth, canvasHeight) {
    // TODO: use canvas.setDimensions({ width: canvas.getWidth() * scaleRatio, height: canvas.getHeight() * scaleRatio })
    
    
    let scaleRatio = canvasWidth / width;
    if( canvasWidth ) {
      //canvasOutput.width = canvasWidth;
      canvas.setWidth(canvasWidth);
      console.log("scaleRatio = "+ scaleRatio);
      canvas.setZoom(scaleRatio);
    }
    if( canvasHeight ) {
      //canvasOutput.height = canvasHeight;
      canvas.setHeight(canvasHeight);
    }
    canvas.renderAll();

    //canvasContext.drawImage(video,0,0, canvasOutput.width, canvasOutput.height );    
    if( canvasWidth ) video.width = canvasWidth;
    //if( canvasHeight ) video.height = canvasHeight;

  }
  

  function getDecimalSeparator() {
    // Get the locale for an estimate of the decimal separator
    let locale;
    if (navigator.languages && navigator.languages.length) {
      locale = navigator.languages[0];
    } else {
      locale = navigator.userLanguage || navigator.language || navigator.browserLanguage || 'en';
    }

    console.log(locale);

    const numberWithDecimalSeparator = 1.1;
    return numberWithDecimalSeparator.toLocaleString(locale).substring(1, 2);

    //console.log(Intl.NumberFormat(locale).formatToParts(numberWithDecimalSeparator));
    //return ",";
    
    // Format a number to get the decimal separator
    //const numberWithDecimalSeparator = 1.1;
    //return Intl.NumberFormat(locale)
    //    .formatToParts(numberWithDecimalSeparator)
    //    .find(part => part.type === 'decimal')
    //    .value;
  }

  
  function toCSV(number, precision = 6) {
    //console.log(number);
    // Store numbers to 6 digits precision
    return number.toPrecision(precision).toString().replace('.',decimalSeparator);
  }

  function toNumber(string){
    return parseFloat( string.replace(',','.') );
  }

  
  $("#deleteData").click( () => { 
    if( dataCanBeRemoved () ) {
      rawData = [];
      // Update plots
      updatePlots();
    }
  });

  // Settings for CSV
  let timeStr  = "time [s]";
  let posXStr  = "x position [m]";
  let posYStr  = "y position [m]";
  let velXStr  = "x velocity [m/s]";
  let velYStr  = "y velocity [m/s]";
  let accXStr  = "x acceleration [m/s²]";
  let accYStr  = "y acceleration [m/s²]";
  let fpsStr   = "Frame rate [Hz]";
  let origXStr = "x origin [px]";
  let origYStr = "y origin [px]";
  let scaleStr = "Scale [px/m]";
  
  // Event listener for export button
  $("#csvExport").click( () => {
    
    // Check if there is data to be written
    if( rawData.length === 0 ) return;
        
    let csvData = [];

    // first line contains headers and meta data
    csvData.push({[timeStr]: "", [posXStr]: "", [posYStr]: "", 
                  [velXStr]: "", [velYStr]: "", [accXStr]: "", [accYStr]: "",
                  [fpsStr]: toCSV(FPS), [origXStr]: toCSV(originX), [origYStr]: toCSV(originY), 
                  [scaleStr]: toCSV(pixelsPerMeter)}  );
    if( showVelocity == false ) {
      delete csvData[0][velXStr];
      delete csvData[0][velYStr];      
    }
    if( showAcceleration == false ) {
      delete csvData[0][accXStr];
      delete csvData[0][accYStr];      
    }

    // Fill list with velocities and times
    let velocities = [];
    rawData.forEach(function (item, index) {
      if( index > integrationTime-1 ) {
        let velocity = getVelocity(index - integrationTime, index);
        let frame = (item.t + rawData[index-integrationTime].t)/2;
        velocities.push({frame: frame, t: velocity.t, x: velocity.x, y: velocity.y});
      }
    });
    
    // Fill list with acceleration and times
    let accelerations = [];
    velocities.forEach(function (item, index) {
      if( index > integrationTime-1 ) {
        let prevItem = velocities[index - integrationTime];
        let frame = 0.5*(item.frame + prevItem.frame);
        let meanT = 0.5*(item.t + prevItem.t);
        let dt = item.t - prevItem.t;
        let accelX = (item.x - prevItem.x) / dt;
        let accelY = (item.y - prevItem.y) / dt;
        accelerations.push({frame: frame, t: meanT, x: accelX, y: accelY});
      }
    });

    
    // Frame tolerance decides when velocities are grouped with position entries in one row
    let frameTolerance = avoidEmptyCells ? 0.51 : 0.01;
    
    // Create temporary data with positions and velocities (time ordered)
    let tempData = [];
    let vIndex = 0;
    rawData.forEach(function (item, index) {
      let thisFrame = item.t;
      let time = getTime( thisFrame );
      let pos = getXYposition( item );

      // add all velocities before this item
      while( vIndex < velocities.length && 
            velocities[vIndex].frame < thisFrame - frameTolerance ) {
        // add only the velocity
        tempData.push({ frame    : velocities[vIndex].frame,
                        [timeStr]: toCSV( velocities[vIndex].t ), 
                        [velXStr]: toCSV( velocities[vIndex].x ), 
                        [velYStr]: toCSV( velocities[vIndex].y )}  );
        ++vIndex;
      }
      
      // Add the position data
      let n = tempData.push({ frame    : thisFrame,
                              [timeStr]: toCSV(time), 
                              [posXStr]: toCSV(pos.x), 
                              [posYStr]: toCSV(pos.y)}  );        

      // if velocity has same frame number merge it with this entry
      if( vIndex < velocities.length && velocities[vIndex].frame - thisFrame < frameTolerance ) { 
        // combine items
        tempData[n-1][velXStr] = toCSV(velocities[vIndex].x);
        tempData[n-1][velYStr] = toCSV(velocities[vIndex].y);
        ++vIndex;
      }
    });
    
    // Loop over temporary data and add acceleration data
    let aIndex = 0;
    tempData.forEach(function (item, index) {
      let thisFrame = item.frame;
      // add all accelerations before this item
      while( aIndex < accelerations.length && 
             accelerations[aIndex].frame < thisFrame - frameTolerance ) {
        csvData.push({[timeStr]: toCSV( accelerations[aIndex].t ), 
                      [accXStr]: toCSV( accelerations[aIndex].x ), 
                      [accYStr]: toCSV( accelerations[aIndex].y )}  );
        ++aIndex;
      }
      // Copy the temporary data to csvData
      delete item.frame;
      let n = csvData.push( item );        

      // if acceleration has same frame number merge it with this entry
      if( aIndex < accelerations.length && accelerations[aIndex].frame - thisFrame < frameTolerance ) { 
        // combine items
        csvData[n-1][accXStr] = toCSV(accelerations[aIndex].x);
        csvData[n-1][accYStr] = toCSV(accelerations[aIndex].y);
        ++aIndex;
      }       
    });
    

    var csv = Papa.unparse( csvData, {quotes : true, 
                                      delimiter : delimiter === "tab" ? "\t" : delimiter } );
    console.log(csv);

    let filename = prompt("Save as...", videoName.substr(0, videoName.lastIndexOf('.'))+".csv");
    if (filename != null && filename != "") {
      download( filename, csv);
    }

  });

  
  function isNumeric(str) {
    if (typeof str != "string") return false; // we only process strings!  
    let string = str.replace(',','.')
    return !isNaN(string) && // use type coercion to parse the _entirety_ of the string
           !isNaN(parseFloat(string)) // ...and ensure strings of whitespace fail
  }
  
  $("#csvImport").click( () => {
    if( dataCanBeRemoved() ) {      
      // Progagate to hidden DOM element
      $("#csvInput").click();
    }
  });
  
  // Add event listener for when file is selected
  $("#csvInput").change( function() {
    // Get the file
    let file = this.files[0];    
    Papa.parse(file, {
      header: true,
      complete: function(results) {
        //console.log(results.data);
        // TODO: fps disabled?
        
        // check header integrety
        if( results.data.length > 0 &&
            isNumeric( results.data[0][fpsStr]   ) &&
            isNumeric( results.data[0][origXStr] )  &&
            isNumeric( results.data[0][origYStr] ) &&
            isNumeric( results.data[0][scaleStr] ) ) {

          rawData = []; // Clear old data

          // Update the header info
          let meta = results.data[0];
          fpsInput.value = toNumber( meta[fpsStr] );
          fpsInput.onchange();
          originXInput.value = toNumber( meta[origXStr] );
          originYInput.value = toNumber( meta[origYStr] );
          originXInput.onchange();
          originYInput.onchange();
          scaleInput.value = toNumber( meta[scaleStr] );
          scaleInput.onchange();

          // Add raw data
          for(let i=1; i<results.data.length; ++i ){
            let item = results.data[i];

            // check not empty
            if( isNumeric(item[timeStr]) && isNumeric(item[posXStr]) && isNumeric(item[posYStr]) ) {
              let time = Math.floor( toNumber(item[timeStr])*FPS );
              let xPos = originX + toNumber(item[posXStr])*pixelsPerMeter;
              let yPos = originY - toNumber(item[posYStr])*pixelsPerMeter;
              let rawDataPoint = {t: time, x: xPos, y: yPos };  

              //console.log(rawDataPoint );
              addRawData( rawDataPoint );
            }
          }
           
          // Update plots
          updatePlots();
        } else {
          // Remove status message
          //statusMsg.innerHTML = "Error loading csv file: header information not complete";
          alert("Error loading csv file: header information not complete");
        }
      }
    });
    
  });
  

  // Create an invisible download element
  function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  $("#videoImport").click( () => {
    if( dataCanBeRemoved() ) {      
      // Progagate to hidden DOM element
      $("#videoInput").click();
    }
  });
  
  // Add event listener for when file is selected
  $("#videoInput").change( function() {

    // Remove old source
    video.removeAttribute('src'); // empty source
    video.load();

    // Clear raw data and meta data
    rawData = [];
    fpsInput.value = "";
    scaleInput.value = "";
    originXInput.value = "";
    originYInput.value = "";
    FPS = undefined;
    pixelsPerMeter = undefined;
    originX = undefined;
    originY = undefined;
    canvas.clear();

    // Disable video control and reset video parameters when selecting new video
    disableAnalysis();
    disableVideoControl();
    
    // Get the file
    let URL = window.URL || window.webkitURL;
    let file = this.files[0];
    console.log("video src=" + video.src);
    video.src = URL.createObjectURL(file);
    console.log("video src=" + video.src);
    videoName = file.name;
  });
  
  // video playback failed - show a message saying why
  video.addEventListener('error', (e) => {
    switch (e.target.error.code) {
      case e.target.error.MEDIA_ERR_ABORTED:
        alert('You aborted the video playback.');
        break;
      case e.target.error.MEDIA_ERR_NETWORK:
        alert('A network error caused the video download to fail part-way.');
        break;
      case e.target.error.MEDIA_ERR_DECODE:
        alert('The video playback was aborted due to a corruption problem or because the video used features your browser did not support.');
        break;
      case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        alert('The video could not be loaded, either because the server or network failed or because the format is not supported.');
        break;
      default:
        alert('An unknown error occurred.');
        break;
    }
    disableAnalysis();
    disableVideoControl();
    // Remove old source
    video.removeAttribute('src'); // empty source
    video.load();
  });
  

  // Add event listener when the video is loaded
  video.addEventListener('loadedmetadata', () => {

    // Pause the video (needed because of autoplay)
    video.pause();

    // Get the dimensions of the video and prepare the canvas
    width = video.videoWidth;
    height = video.videoHeight;
    drawVideo(width, height);
    
    // Set initial origin to left bottom corner
    originXInput.value = 0;
    originYInput.value = height;     
    originXInput.onchange();
    originYInput.onchange();

    console.log("Resolution: " + width.toString() + " x " + height.toString() );
    console.log("Duration: " + video.duration );

    // Enable manually setting frame rate
    //fpsInput.removeAttribute("disabled");
    
    $('#origin').removeAttr('disabled');
    $('#scale').removeAttr('disabled');
    
    // Highlight fields that need to be filled
    scaleInput.style.background = 'pink';
    fpsInput.style.background = 'pink';

    // Get the frame rate
    getFPS();

  });
  
    
  function blurOnEnter(e){ if(e.keyCode===13){ e.target.blur();} }
  fpsInput.addEventListener("keydown",blurOnEnter);
  originXInput.addEventListener("keydown",blurOnEnter);
  originYInput.addEventListener("keydown",blurOnEnter);
  scaleInput.addEventListener("keydown", blurOnEnter);


  function dataCanBeRemoved() {
    return (rawData.length == 0 || 
           confirm("This will clear your current data. Are you sure?") );
  }
  
  // Update the frame rate (fps) when user gives input or when calculated
  fpsInput.onchange = function() {

    if( isNumeric(this.value) && toNumber(this.value) > 0 && dataCanBeRemoved() ) {

      // Clear data
      rawData = [];

      // Remove status message
      $('#statusMsg').html( "" );   
      this.style.background = ""; // remove pink alert

      // Set the new FPS
      FPS = toNumber(this.value);

      // Update plots
      updatePlots();
      
      if( video.src !== "" ) {
        // Update the slider
        $("#slider").attr("max", Math.floor( ((video.duration-t0) * FPS).toFixed(1) ) - 1 );
    
        // Always reset to first frame
        gotoFrame( 0 );
        
        // Video can be enabled
        tryToEnable();
      }
    } else {
      this.value = FPS || "";
    }
  }

  // Update the origin when user gives input or when calculated
  originXInput.onchange = function(evt) {
    
    if( isNumeric(this.value) ) {
      originX = toNumber( this.value ) ;
      // Update plots
      updatePlots();
    } else {
      this.value = (typeof originX !== "undefined" ) ? originX : "";
    }
  }
  originYInput.onchange = function() {
    if( isNumeric(this.value) ) {
      originY = toNumber( this.value ) ;
      // Update plots
      updatePlots();
    } else {
      this.value = (typeof originY !== "undefined" ) ? originY : "";
    }
  }
  
  // Update the origin when user gives input or when calculated
  scaleInput.onchange = function() {
    
    if( isNumeric(this.value) && toNumber(this.value) > 0 ) {
      pixelsPerMeter = toNumber( this.value );   
      this.style.background = '';
      // Enable video analysis
      tryToEnable() ;      
      // Update plots
      updatePlots();
    } else {
      this.value = pixelsPerMeter || "";
    }
  }
  
  function tryToEnable() {
    if( video.src !== "" ) {
      if( fpsInput.value !== "" ) enableVideoControl();
      if( fpsInput.value !== "" && scaleInput.value !== "" ) enableAnalysis();
    }
  }
  
  // Enable the video control buttons
  function enableVideoControl() {
    $('#prev').removeAttr('disabled');
    $('#play').removeAttr('disabled');
    $('#next').removeAttr('disabled');
    $('#slider').removeAttr('disabled');
    $("#zoomIn").removeAttr('disabled');
    $("#zoomOut").removeAttr('disabled');
  }

  // Disable the video control buttons
  function disableVideoControl() {
    $('#frameNumber').html( "0 / 0" );
    $('#showMediaInfo').attr('disabled', '');
    $('#origin').attr('disabled', '');
    $('#scale').attr('disabled', '');
    $('#prev').attr('disabled', '');
    $('#play').attr('disabled', '');
    $('#next').attr('disabled', '');
    $('#slider').attr('disabled', '');  
    $("#zoomIn").attr('disabled', '');
    $("#zoomOut").attr('disabled', '');
  }

  function enableAnalysis() {
    startAndStopManual.removeAttribute('disabled');
    startAndStopManual.innerText = startText;
    //startAndStopManual.style.backgroundColor = "#4CAF50";
    startAndStopManual.classList.add("button-on");
    startAndStopManual.classList.remove("button-off");

    // Automatic analysis only when openCV is ready
    //document.getElementById('opencv').onload= () => onOpenCvReady();
    //function onOpenCvReady() {
      startAndStopAuto.removeAttribute('disabled');
    //}
  }

  function disableAnalysis() {    
    startAndStopManual.innerText = startText;
    $('#statusMsg').html("");
    //startAndStopManual.style.backgroundColor = "#c3d6be";
    canvasClick = "";
    startAndStopManual.setAttribute('disabled', '');
    startAndStopAuto.setAttribute('disabled', '');

  }

  // load all code after the document
  $("document").ready( () => {
    videoImport.removeAttribute('disabled');    
  });
                      
  // Event listener for the modal boxes
  $("#showMediaInfo").click( evt => { showModal("mediaInfoModal"); });
  $("#showAbout").click( evt => { showModal("aboutModal");} );
  $("#showHelp").click( evt => { showModal("helpModal");} );
  $("#showSettings").click( evt => { showModal("settingsModal");} );

  /* Define functions for the modal box */
  let currentModal = "";

  // Showing modal box
  function showModal(name) {
    // Set the feedback tag
    setFeedback();

    let text = document.getElementById(name);
    text.style.display = "block";
    currentModal = name;
  }

  // When the user clicks on <span> (x), close the current modal
  let closeButtons = document.getElementsByClassName("close");
  for( var i=0; i < closeButtons.length; ++i) {
    closeButtons[i].onclick = function() {
      document.getElementById(currentModal).style.display = "none"; 
      currentModal = "";
    }
  }

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    if (event.target == document.getElementById(currentModal) ) {
      document.getElementById(currentModal).style.display = "none";
    }
  }

  // set the feedback tag
  function setFeedback() {
    var name = "smackjvantilburgsmack"; // add salt
    name = name.substr(5,11); // remove salt
    $("feedback").html(name+"@gmail.com");  
  }
  
  function getFPS() {
    $('#statusMsg').html( "Calculating FPS... <i class='fa fa-spinner fa-spin fa-fw'></i>" );
    
    MediaInfo({ format: 'object' }, (mediainfo) => {
      const file = $('#videoInput').prop('files')[0];
      if (file) {        
        const getSize = () => file.size;

        const readChunk = (chunkSize, offset) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (event) => {
              if (event.target.error) {
                reject(event.target.error);
              }
              resolve(new Uint8Array(event.target.result));
            }
            reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
          });

          mediainfo.analyzeData(getSize, readChunk).then((result) => {
            $("#mediaInfoResult").html( convertToTable(result.media.track) );

            //console.log(result);
            result.media.track.forEach(track => {
              if( track["@type"] === "Video") {                        
                // Set the new FPS
                fpsInput.value = track.FrameRate;
                fpsInput.onchange();
                $("#showMediaInfo").removeAttr("disabled");
                $('#statusMsg').html( "" );
              }
            } );
        })
          .catch((error) => {  
            alert("An error occured. Please set FPS manually.");
            $('#statusMsg').html( "" );
        })
      }
    })
  }
  
  function convertToTable(tracks) {
    let output = "\n <table>";
    tracks.forEach(track => {
      //if( track["@type"] === "Video") {
      //output += "<tr>";
      for (const [key, value] of Object.entries(track)) {
        if( key === "@type" ) {
          output += `<tr class="table-header"><th colspan=2>${value}</th></tr>\n`;
        } else {
          //console.log(`${key}: ${value}`);
          output += `<tr><td>${key}</td><td>${value}</td></tr>\n`;
          //output += "\n";
        }
      }
      //output += "</tr>";
    } );
    output += "</table>";
    
    return output;
  }
  
  
  //prevButton.addEventListener('click', evt => {
  $('#prev').click(function() {
    // Go to next frame
    gotoFrame(frameNumber-1);
  });

  //nextButton.addEventListener('click', evt => {
  $('#next').click(function() {
    // Go to next frame
    gotoFrame(frameNumber+1);
  });

  
  var playIntervalID=0;
  $('#play').click(function() {
    $(this).find('.fa-play,.fa-pause').toggleClass('fa-pause').toggleClass('fa-play');
    if ( playing === false ) {
      playing = true;
      let that = this;
      playIntervalID = window.setInterval( function() { 
        if( gotoFrame(frameNumber+1) == false ) {
          window.clearInterval( playIntervalID );
          playing = false;
          $(that).find('.fa-play,.fa-pause').toggleClass('fa-pause').toggleClass('fa-play');
        } 
      }, 1000/FPS );
    } else {
      playing = false;
      window.clearInterval( playIntervalID );    
    }
  });
  
  
  /*var playIntervalID=0;
  playButton.addEventListener('click', evt => {
    if ( playing === false ) {
      playing = true;
      //playButton.innerText = 'pause';
      //this.find('.fa-play').toggleClass('fa-play fa-pause')
      playIntervalID = window.setInterval( function() { 
        if( gotoFrame(frameNumber+1) == false ) {
          window.clearInterval( playIntervalID );
          playButton.innerText = 'play';
        } 
      }, 1000/FPS );
    } else {
      playing = false;
      window.clearInterval( playIntervalID );    
      //playButton.innerText = 'play';
    }
  });*/

  $("#slider").change( function() {
    // Go to next frame
    gotoFrame(Math.floor(this.value));
  });


  let canvasClick = "";
  $('#canvasOutput').click( (evt) => {
    console.log("canvas is clicked="+canvasClick);
    if( canvasClick === "addRawDataPoint" ) {
      addRawDataPoint(evt);
    } else if( canvasClick === "setOrigin" ) {
      setOrigin(evt);
    } else if( canvasClick === "setScale1" ) {
      setScale1(evt);
    } else if( canvasClick === "setScale2" ) {
      setScale2(evt);
    } 
  });

  // Set origin button
  $('#origin').click( evt => {
    if( canvasClick === "addRawDataPoint") {
      startAndStopManual.innerText = startText;
      //startAndStopManual.style.backgroundColor = "#4CAF50";
      startAndStopManual.classList.remove("button-off");
      startAndStopManual.classList.add("button-on");
    }
    canvasClick = "setOrigin";
     
    // set statusMsg
    $('#statusMsg').html( "Click on the (new) origin..." );
        
    drawAxes();
  });
  
  // Draw the axis    
  function drawAxes() {
    let xAxis = new fabric.Line([0,originYInput.value,width,originYInput.value], 
                                {strokeWidth: 2, stroke: 'blue' });    
    let yAxis = new fabric.Line( [originXInput.value,0,originXInput.value, height], 
                                 {strokeWidth: 2, stroke: 'blue' });    
    canvas.add( xAxis );
    canvas.add( yAxis );
    canvas.renderAll();    
  }
  
  // update origin
  function setOrigin(evt) {
    // Get mouse position in pixels
    let posPx = getMousePos( evt );
    
    // Update origin
    originXInput.value = posPx.x;
    originYInput.value = posPx.y;
    originXInput.onchange();
    originYInput.onchange();
    
    // Reset statusMsg and canvas click event
    canvasClick = "";
    
    canvas.clear();
    drawAxes();
    setTimeout( function() {     
      $('#statusMsg').html( "" );
      gotoFrame( frameNumber); 
    }, 500); 
  }
  
  // Set scale button
  $('#scale').click( evt => {
    if( canvasClick === "addRawDataPoint") {
      startAndStopManual.innerText = startText;
      //startAndStopManual.style.backgroundColor = "#4CAF50";
      startAndStopManual.classList.add("button-on");
      startAndStopManual.classList.remove("button-off");
    } 
    canvasClick = "setScale1";
    // set statusMsg
    $('#statusMsg').html( "Click on the first point" );
  });
  
  // Set the scale (1st point)
  function setScale1(evt) {
    // Get mouse position in pixels
    let posPx = getMousePos( evt );
    
    // Set the scale (1st point)
    scale1 = {x: posPx.x, y: posPx.y};
    
    // Reset statusMsg and canvas click event
    canvasClick = "setScale2";
    $('#statusMsg').html( "Click on the second point" );    
  }

  // Set the scale (2nd point)
  function setScale2(evt) {
    // Get mouse position in pixels
    let posPx = getMousePos( evt );
    
    let distanceInMeter = toNumber( prompt("How long is this distance in meter?", "1.0") );
    
    // Update scale
    scale2 = {x: posPx.x, y: posPx.y};
    
        // Update origin
    scaleInput.value = Math.sqrt( (scale2.x-scale1.x)**2 + (scale2.y-scale1.y)**2 ) / distanceInMeter;
    scaleInput.onchange();
    //pixelsPerMeter = Math.sqrt( (scale2.x-scale1.x)**2 + (scale2.y-scale1.y)**2 ) / distanceInMeter;
    
    // Reset statusMsg and canvas click event
    canvasClick = "";
    $('#statusMsg').html( "" );
    
  }
  
  // Manual analysis
  startAndStopManual.addEventListener('click', evt => {

    if( startAndStopManual.innerText === startText ) {
      startAndStopManual.innerText = stopText;
      $('#statusMsg').html( "Click on the object" );
      //startAndStopManual.style.backgroundColor = "darkred";
      canvasClick = "addRawDataPoint";
    } else {
      startAndStopManual.innerText = startText;
      $('#statusMsg').html( "" );
      canvasClick = "";
    }
    startAndStopManual.classList.toggle('button-on');
    startAndStopManual.classList.toggle('button-off');

  });

  function addRawDataPoint(evt) {
    // Get mouse position in pixels
    let posPx = getMousePos( evt );

    //console.log(evt);

    //console.log(posPx);

    /*let circle = new fabric.Circle({ left: posPx.x, top: posPx.y, radius: 3, 
                                    stroke: 'red', strokeWidth: 1, fill: 'rgba(0,0,0,0)' });
    canvas.add( circle );
    */           
    // Add raw data
    let rawDataPoint = {t: frameNumber, x: posPx.x, y: posPx.y};
    addRawData( rawDataPoint );
    
    // Update plots
    updatePlots();
    
    let markerP = fabric.util.object.clone( markerPoint ) ;
    markerP.set({left: posPx.x, top: posPx.y});
    highlightMarker( markerP );
    canvas.add(markerP );


    // Go to next frame with a small delay
    setTimeout(function() { gotoFrame(frameNumber+framesToSkip); }, 200);
    
  }

  function addRawData( rawDataPoint ) {
    let thisIndex = rawData.findIndex(entry => entry.t >= rawDataPoint.t );
    if( thisIndex < 0 ) { // insert at the end 
      rawData.push( rawDataPoint );
    } else if ( rawData[thisIndex].t === rawDataPoint.t ) { // update
      rawData[thisIndex] = rawDataPoint;
    } else { // insert point at index
      rawData.splice(thisIndex, 0, rawDataPoint );
    }
  }

  function updatePlots() {
    updatePositionPlot();
    updateVelocityPlot();
    updateAccelerationPlot();
  }
  
  function updatePositionPlot() { 
    let xPositions = [];
    let yPositions = [];
    rawData.forEach(function (item, index) {
      //console.log(item, index);
      let time = getTime( item.t );
      let pos = getXYposition( item );
      xPositions.push( {x: time, y: pos.x} );
      yPositions.push( {x: time, y: pos.y} );
    });
    positionChart.data.datasets[0].data = xPositions;
    positionChart.data.datasets[1].data = yPositions;
    positionChart.update();  
  }

  function updateVelocityPlot() { 
    let xVelocities = [];
    let yVelocities = [];
    rawData.forEach(function (item, index) {
      if( index > integrationTime-1 ) {
        let velocity = getVelocity(index - integrationTime, index);
        xVelocities.push( {x: velocity.t, y: velocity.x} );
        yVelocities.push( {x: velocity.t, y: velocity.y} );
      }
    });
    velocityChart.data.datasets[0].data = xVelocities;
    velocityChart.data.datasets[1].data = yVelocities;
    velocityChart.update();  
  }

  function getVelocity(index1, index2){
    let pos2 = getXYposition( rawData[index2] );    
    let pos1 = getXYposition( rawData[index1] );
    let t2 = getTime( rawData[index2].t );
    let t1 = getTime( rawData[index1].t );
    let dt = t2 - t1;
    let meanT = 0.5*( t1 + t2 );
    let velocityX = (pos2.x - pos1.x ) / dt;
    let velocityY = (pos2.y - pos1.y ) / dt;
    return { t: meanT, x : velocityX, y : velocityY }; 
  }

  function updateAccelerationPlot() { 
    let xAcceleration = [];
    let xVelocities = velocityChart.data.datasets[0].data;
    xVelocities.forEach(function (item, index) {
      if( index > integrationTime-1 ) {
        let acceleration = getAcceleration( xVelocities[index - integrationTime], item);
        xAcceleration.push( {x: acceleration.t, y: acceleration.a} );
      }
    });
    let yAcceleration = [];
    let yVelocities = velocityChart.data.datasets[1].data;
    yVelocities.forEach(function (item, index) {
      if( index > integrationTime-1 ) {
        let acceleration = getAcceleration( yVelocities[index - integrationTime], item);
        yAcceleration.push( {x: acceleration.t, y: acceleration.a} );
      }
    });
    accelerationChart.data.datasets[0].data = xAcceleration;
    accelerationChart.data.datasets[1].data = yAcceleration;
    accelerationChart.update();  
  }

  function getAcceleration(velocity1, velocity2){
    let dt = velocity2.x - velocity1.x;
    let meanT = 0.5*( velocity1.x + velocity2.x );
    let acceleration = (velocity2.y - velocity1.y ) / dt;
    return { t: meanT, a : acceleration }; 
  }
  
  function getTime(targetFrame) {
    return t0 + (targetFrame + 0.5)/FPS;
  }

  function gotoFrame(targetFrame) {
    let newTime = (targetFrame + 0.5)/FPS;
    
    // Redraw the data markers
    canvas.clear();
    rawData.forEach( function(item) {
      let markerP = fabric.util.object.clone( markerPoint ) ;
      markerP.set({left: item.x, top: item.y});
      if( item.t === targetFrame ) {
         highlightMarker( markerP );
         canvas.add(markerP );
      } else if ( drawAllPoints ) { 
        canvas.add( markerP );    
      }    
    });
    
    if( newTime < t0 ) {
      return false;
    } else if( newTime > video.duration ) {
      return false;
    } else {
      frameNumber = targetFrame;
      video.currentTime = newTime;
      video.addEventListener("seeked", function(e) {
        e.target.removeEventListener(e.type, arguments.callee); // remove the handler or else it will draw another frame on the same canvas, when the next seek happens
        //canvasContext.drawImage(video,0,0, width, height );
        //drawVideo();
        $('#frameNumber').html( frameNumber + " / " + $("#slider").attr("max") );
        $("#slider").val( frameNumber );
      });
      return true;
    }
  }

  function getMousePos( evt ) {

    /*let rect = thisCanvas.getBoundingClientRect();
    let scaleX = thisCanvas.width / width;    // relationship bitmap vs. element for X
    let scaleY = thisCanvas.height / height;  // relationship bitmap vs. element for Y

    //console.log("scaleX= "+ scaleX+ " scale="+canvas.width/width );
    
    return {
      x: (evt.clientX - rect.left)/scaleX,
      y: (evt.clientY - rect.top)/scaleY
    };*/
    
    //console.log(canvas);
    
    let rect = canvas.lowerCanvasEl.getBoundingClientRect();
    let scaleX = canvas.width / width;    // relationship bitmap vs. element for X
    let scaleY = canvas.height / height;  // relationship bitmap vs. element for Y

    console.log("scaleX= "+ scaleX+ " scale="+canvas.width/width );
    
    return {
      x: (evt.clientX - rect.left)/scaleX,
      y: (evt.clientY - rect.top)/scaleY
    };

    
  }

  function getXYposition(posPx) {
    return {
      x: (posPx.x-originX)/pixelsPerMeter,       
      y: (originY-posPx.y)/pixelsPerMeter 
    };
  }

  startAndStopAuto.addEventListener('click', () => {
    if (!streaming) {
        //utils.clearError();
        //video.play().then(() => {
        video.pause();
        onVideoStarted();
        //});
    } else {
        video.pause();
        video.currentTime = 0.5/FPS;
        onVideoStopped();
    }
  });

  function onVideoStopped() {
    streaming = false;
    //canvasContext.clearRect(0, 0, canvasOutput.width, canvasOutput.height);
    startAndStopAuto.innerText = 'Automatic';
  }
  
  
// Automatic analysis
function onVideoStarted() {
  streaming = true;
  startAndStopAuto.innerText = 'Stop';
  video.height = video.width * (video.videoHeight / 
                                          video.videoWidth);
  //utils.executeCode('codeEditor');
  
  let video = document.getElementById('video');
  let cap = new cv.VideoCapture(video);

  // take first frame of the video
  let frame = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  cap.read(frame);

  // hardcode the initial location of window
  //let trackWindow = new cv.Rect(150, 60, 63, 125);
  //let x1 = 200, y1=0, x2=250, y2=60;
  let trackWindow = new cv.Rect(200, 0, 80, 50);

  // set up the ROI for tracking
  let roi = frame.roi(trackWindow);
  let hsvRoi = new cv.Mat();
  cv.cvtColor(roi, hsvRoi, cv.COLOR_RGBA2RGB);
  cv.cvtColor(hsvRoi, hsvRoi, cv.COLOR_RGB2HSV);
  let mask = new cv.Mat();
  //let lowScalar = new cv.Scalar(30, 30, 0);
  let lowScalar = new cv.Scalar(30, 30, 0);
  let highScalar = new cv.Scalar(180, 180, 180);
  let low = new cv.Mat(hsvRoi.rows, hsvRoi.cols, hsvRoi.type(), lowScalar);
  let high = new cv.Mat(hsvRoi.rows, hsvRoi.cols, hsvRoi.type(), highScalar);
  cv.inRange(hsvRoi, low, high, mask);
  let roiHist = new cv.Mat();
  let hsvRoiVec = new cv.MatVector();
  hsvRoiVec.push_back(hsvRoi);
  cv.calcHist(hsvRoiVec, [0], mask, roiHist, [180], [0, 180]);
  cv.normalize(roiHist, roiHist, 0, 255, cv.NORM_MINMAX);

  // delete useless mats.
  roi.delete(); hsvRoi.delete(); mask.delete(); low.delete(); high.delete();
  hsvRoiVec.delete();

  // Setup the termination criteria, either 10 iteration or move by atleast 1 pt
  let termCrit = new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 
                                     10, 1);
  let hsv = new cv.Mat(video.height, video.width, cv.CV_8UC3);
  let hsvVec = new cv.MatVector();
  hsvVec.push_back(hsv);
  let dst = new cv.Mat();
  let trackBox = null;

  function processVideo() {
    try {
        if (!streaming) {
            // clean and stop.
            frame.delete(); dst.delete(); hsvVec.delete(); roiHist.delete(); 
          hsv.delete();
            return;
        }
        let begin = Date.now();

        // start processing.
        cap.read(frame);
        cv.cvtColor(frame, hsv, cv.COLOR_RGBA2RGB);
        cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
        cv.calcBackProject(hsvVec, [0], roiHist, dst, [0, 180], 1);

        // apply camshift to get the new location
        /*[trackBox, trackWindow] = cv.CamShift(dst, trackWindow, termCrit);
            
        // Draw it on image
        let pts = cv.rotatedRectPoints(trackBox);
        //let trackWindow = new cv.Rect(150, 60, 63, 125);
        //let x1 = 200, y1=0, x2=250, y2=60;
        //pts = [{x: x1, y: y1}, {x: x2, y: y1}, {x: x2, y: y2}, {x: x1, y: y2}]
        //console.log(pts);

        cv.line(frame, pts[0], pts[1], [255, 0, 0, 255], 3);
        cv.line(frame, pts[1], pts[2], [255, 0, 0, 255], 3);
        cv.line(frame, pts[2], pts[3], [255, 0, 0, 255], 3);
        cv.line(frame, pts[3], pts[0], [255, 0, 0, 255], 3);
        cv.imshow('canvasOutput', frame);
        */

        // apply meanshift instead
        [, trackWindow] = cv.meanShift(dst, trackWindow, termCrit);

        // Draw it on image
        let [x, y, w, h] = [trackWindow.x, trackWindow.y, trackWindow.width, 
                            trackWindow.height];
        cv.rectangle(frame, new cv.Point(x, y), new cv.Point(x+w, y+h), 
                     [255, 0, 0, 255], 2);
        cv.imshow('canvasOutput', frame);

        console.log(video.currentTime);
        video.currentTime = Math.min(video.duration, 
                                          video.currentTime + 1/FPS);
      
        // schedule the next one.
        let delay = 1000/FPS - (Date.now() - begin);
        setTimeout(processVideo, 10 );//delay);
    } catch (err) {
        //utils.printError(err);
    }
  };

  //video.currentTime = 0.5/FPS;
  
  // schedule the first one.
  setTimeout(processVideo, 0);
}

  // Plotting stuff
  let options= { scales: { xAxes: [{ scaleLabel:{ labelString: 'time (s)', 
                                                  display: true},
                                    type: 'linear', position: 'bottom' }] ,
                           yAxes: [{ scaleLabel:{ labelString: 'Position (m)', 
                                                display: true} }]
                         }};

  let pData = { datasets: [{ label: 'x', fill: 'false', pointBackgroundColor: 'red', 
                        borderColor: 'red', backgroundColor: 'red' },
                       { label: 'y', fill: 'false', pointBackgroundColor: 'blue', 
                        borderColor: 'blue', backgroundColor: 'blue' }] };

  Chart.defaults.global.responsive = false;
  Chart.defaults.global.defaultFontSize = 10;

  
  let posCtx = document.getElementById('positionChart').getContext('2d');
  let positionChart = new Chart(posCtx, {
    type: 'line',
    data: pData,
    options: options
  });

  let vData = { datasets: [{ label: 'x', fill: 'false', pointBackgroundColor: 'red', 
                        borderColor: 'red', backgroundColor: 'red' },
                       { label: 'y', fill: 'false', pointBackgroundColor: 'blue', 
                        borderColor: 'blue', backgroundColor: 'blue' }] };

  let velocityCtx = document.getElementById('velocityChart').getContext('2d');
  let velocityChart = new Chart(velocityCtx, {  
    type: 'line',
    data: vData,
    options: options
  });
  velocityChart.options.scales.yAxes[0].scaleLabel.labelString = "Velocity (m/s)";

  let aData = { datasets: [{ label: 'x', fill: 'false', pointBackgroundColor: 'red', 
                        borderColor: 'red', backgroundColor: 'red' },
                       { label: 'y', fill: 'false', pointBackgroundColor: 'blue', 
                        borderColor: 'blue', backgroundColor: 'blue' }] };

  let accelerationCtx = document.getElementById('accelerationChart').getContext('2d');
  let accelerationChart = new Chart(accelerationCtx, {  
    type: 'line',
    data: aData,
    options: options
  });
  accelerationChart.options.scales.yAxes[0].scaleLabel.labelString = "Acceleration (m/s²)";

  
  
})();


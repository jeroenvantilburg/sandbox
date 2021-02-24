// TODO: License

// All code runs in this anonymous function
// to avoid cluttering the global variables
(function() {

/* ========== GLOBAL SECTION =================
   Global variables are defined here
   =========================================== */
  
    // HTML elements
  let video          = document.getElementById('video');
  let videoInput     = document.getElementById('videoInput');
  let fpsInput       = document.getElementById('fpsInput');
  let statusMsg      = document.getElementById("statusMsg");
  let mediaInfoResult= document.getElementById('mediaInfoResult');
  let showMediaInfo  = document.getElementById('showMediaInfo');
  let originButton   = document.getElementById('origin');
  let originXInput   = document.getElementById('originXInput');
  let originYInput   = document.getElementById('originYInput');  
  let scaleButton    = document.getElementById('scale');
  let scaleInput     = document.getElementById('scaleInput');  
  let prevButton     = document.getElementById('prev');
  let playButton     = document.getElementById('play');
  let nextButton     = document.getElementById('next');
  let slider         = document.getElementById('slider');
  let zoomOut        = document.getElementById('zoomOut');
  let zoomIn         = document.getElementById('zoomIn');
  let canvasOutput   = document.getElementById('canvasOutput');
  let canvasContext  = canvasOutput.getContext('2d');
  let frameCounter   = document.getElementById("frameNumber")  
  let startAndStopAuto = document.getElementById('startAndStopAuto');
  let startAndStopManual = document.getElementById('startAndStopManual');
  
  // Global video parameters
  let playing = false;
  let streaming = false;
  let width = 0;
  let height = 0;
  let frameNumber = 0;
  let FPS = 0.0;
  let t0 = 0.0;
  let rawData = [];
  let videoName = "";

  // Settings. TODO let user modify it...
  let decimalSeparator = getDecimalSeparator();
  let integrationTime = 2;
  let delimiter = ",";

  let scale1, scale2;
  let pixelsPerMeter;
  let origin = {x: 0, y: 0}; // in pixels

  //videoInput.src = "file:///Users/jeroen/Downloads/IMG_9460.MOV";
  //videoInput.src = "file:///Users/jeroen/Downloads/time.mp4";
  //videoInput.src = "file:///Users/jeroen/Downloads/cup.mp4";    
  
  $("#integrationTimeInput").val( integrationTime );
  $("#integrationTimeInput").on("keydown",blurOnEnter);
  $("#integrationTimeInput").change( function() { 
    integrationTime = parseInt( this.value );
    updateVelocityPlot();
  });

  $("#decimalSeparatorInput").val( decimalSeparator );
  $("#decimalSeparatorInput").on("keydown",blurOnEnter);
  $("#decimalSeparatorInput").change( function() { decimalSeparator = this.value ; });

  $("#delimiterInput").val( delimiter );
  $("#delimiterInput").on("keydown",blurOnEnter);
  $("#delimiterInput").change( function() { delimiter = this.value ; });

  
  zoomOut.addEventListener('click', () => {
    // TODO: Set minimum + scale to fit
    drawVideo(0.5*canvasOutput.width, 0.5*canvasOutput.height)
  });

  zoomIn.addEventListener('click', () => {
    // TODO: Set maximum
    drawVideo(2*canvasOutput.width, 2*canvasOutput.height)
  });

  function drawVideo(canvasWidth, canvasHeight) {
    if( canvasWidth ) canvasOutput.width = canvasWidth;
    if( canvasHeight ) canvasOutput.height = canvasHeight;
    //canvasContext.drawImage(video,0,0, canvasOutput.width, canvasOutput.height );    
    if( canvasWidth ) video.width = canvasWidth;
    if( canvasHeight ) video.height = canvasHeight;

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
    console.log(number);
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
      updatePositionPlot();
      updateVelocityPlot();
    }
  });

  // Event listener for export button
  let csvExport     = document.getElementById('csvExport');
  csvExport.addEventListener('click', () => {
    
    // Check if there is data to be written
    if( rawData.length === 0 ) return;
        
    let csvData = [];

    // first line contains headers and meta data
    csvData.push({"time [s]": "", "x position [m]": "", "y position [m]": "",
                  "x velocity [m/s]": "", "y velocity [m/s]": "",
                  "Frame rate [Hz]": toCSV(FPS), 
                  "x origin [px]": toCSV(origin.x), 
                  "y origin [px]": toCSV(origin.y), 
                  "Scale [px/m]": toCSV(pixelsPerMeter)}  );

    // Fill list with velocities and times
    let velocities = [];
    rawData.forEach(function (item, index) {
      if( index > integrationTime-1 ) {
        let velocity = getVelocity(index - integrationTime, index);
        let frame = (item.t + rawData[index-integrationTime].t)/2;
        velocities.push({frame: frame, t: velocity.t, x: velocity.x, y: velocity.y});
      }
    });
    
    // Fill csvData with sequential times
    let vIndex = 0;
    rawData.forEach(function (item, index) {
      let thisFrame = item.t;
      let time = getTime( thisFrame );
      let pos = getXYposition( item );

      // add all velocities before this item
      while( vIndex < velocities.length && 
            velocities[vIndex].frame < thisFrame-0.01 ) {
        // add only the velocity
        csvData.push({"time [s]": toCSV( velocities[vIndex].t ), 
                      "x velocity [m/s]": toCSV( velocities[vIndex].x ), 
                      "y velocity [m/s]": toCSV( velocities[vIndex].y )}  );
        ++vIndex;
      }
      // check if velocity has same frame number
      if( vIndex < velocities.length && velocities[vIndex].frame - thisFrame < 0.01 ) { 
        // combine items
        csvData.push({"time [s]": toCSV(time), 
                      "x position [m]": toCSV(pos.x), 
                      "y position [m]": toCSV(pos.y),
                      "x velocity [m/s]": toCSV(velocities[vIndex].x), 
                      "y velocity [m/s]": toCSV(velocities[vIndex].y)}  );
        ++vIndex;
      } else { // add only the position
        csvData.push({"time [s]": toCSV(time), 
                      "x position [m]": toCSV(pos.x), 
                      "y position [m]": toCSV(pos.y)}  );        
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

  
  
  // Add event listener for when file is selected
  videoInput.addEventListener('change', function() {
    // Disable video control and reset video parameters when selecting new video
    frameCounter.innerHTML = 0;
    frameNumber = 0;
    FPS = 0;
    disableAnalysis();
    disableVideoControl();

    // Get the file
    let URL = window.URL || window.webkitURL;
    let file = this.files[0];
    video.src = URL.createObjectURL(file);
    videoName = file.name;
    
  }, false);
  
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
    disableVideoControl();
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
    fpsInput.removeAttribute("disabled");
    
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
           confirm("This will clear your current data (positions and velocities). Are you sure?") );
  }
  
  // Update the frame rate (fps) when user gives input or when calculated
  fpsInput.onchange = function() {

    if( this.value > 0 && dataCanBeRemoved() ) {
      FPS = parseFloat(this.value);
      slider.max = Math.floor( ((video.duration-t0) * FPS).toFixed(1) ) - 1;
    
      // Always reset to first frame
      gotoFrame( 0 );
      
      // Clear data
      rawData = [];
      
      // Update plots
      updatePositionPlot();
      updateVelocityPlot();
      
      // Video can be enabled
      enableVideoControl();
      
      // Remove status message
      statusMsg.innerHTML = "";
      
      this.style.background = '';
    } else {
      this.value = FPS;
    }
  }

  // Update the origin when user gives input or when calculated
  originXInput.onchange = function(evt) {
    if( this.value ) {
      origin.x = parseFloat( this.value ) ;
      // Update plots
      updatePositionPlot();
      updateVelocityPlot();
    } else {
      this.value = origin.x;
    }
  }
  originYInput.onchange = function() {
    if( this.value ) {
      origin.y = parseFloat( this.value );
      // Update plots
      updatePositionPlot();
      updateVelocityPlot();
    } else {
      this.value = origin.y;
    }
  }
  
  // Update the origin when user gives input or when calculated
  scaleInput.onchange = function() {
    if( this.value && this.value > 0 ) {
      pixelsPerMeter = parseFloat( this.value );
      this.style.background = '';
      // Enable video analysis
      enableAnalysis();
      
      // Update plots
      updatePositionPlot();
      updateVelocityPlot();
    } else {
      this.value = pixelsPerMeter;
    }
  }
  
  // Enable the video control buttons
  function enableVideoControl() {
    originButton.removeAttribute('disabled');
    originXInput.removeAttribute('disabled');
    originYInput.removeAttribute('disabled');
    scaleButton.removeAttribute('disabled');
    scaleInput.removeAttribute('disabled');
    prevButton.removeAttribute('disabled');
    playButton.removeAttribute('disabled');
    nextButton.removeAttribute('disabled');
    slider.removeAttribute('disabled');
    zoomIn.removeAttribute('disabled');
    zoomOut.removeAttribute('disabled');
    
    scaleInput.style.background = 'pink';
  }

  // Disable the video control buttons
  function disableVideoControl() {
    showMediaInfo.setAttribute('disabled', '');
    fpsInput.setAttribute('disabled', '');
    originButton.setAttribute('disabled', '');
    originXInput.setAttribute('disabled', '');
    originYInput.setAttribute('disabled', '');
    scaleButton.setAttribute('disabled', '');
    scaleInput.setAttribute('disabled', '');
    prevButton.setAttribute('disabled', '');
    playButton.setAttribute('disabled', '');
    nextButton.setAttribute('disabled', '');
    slider.setAttribute('disabled', '');  
    zoomIn.setAttribute('disabled', '');  
    zoomOut.setAttribute('disabled', '');  

    fpsInput.style.background = 'pink';
  }

  function enableAnalysis() {
    startAndStopManual.removeAttribute('disabled');

    // Automatic analysis only when openCV is ready
    //document.getElementById('opencv').onload= () => onOpenCvReady();
    //function onOpenCvReady() {
      startAndStopAuto.removeAttribute('disabled');
    //}
  }

  function disableAnalysis() {
    startAndStopManual.setAttribute('disabled', '');
    startAndStopAuto.setAttribute('disabled', '');
  }

  // load all code after the document
  $("document").ready( () => {
    videoInput.removeAttribute('disabled');    
  });
                      
  // Event listener for the modal boxes
  showMediaInfo.addEventListener('click', evt => {
    showModal("mediaInfoModal");
  });
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
    statusMsg.innerHTML = "Calculating FPS... <i class='fa fa-spinner fa-spin fa-fw'></i>"
    
    MediaInfo({ format: 'object' }, (mediainfo) => {
      const file = videoInput.files[0];
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
          })

        mediainfo.analyzeData(getSize, readChunk).then((result) => {
            //mediaInfoResult.value = JSON.stringify(result, undefined, 4);
            mediaInfoResult.innerHTML = JSON.stringify(result, undefined, 4);

            console.log(result);
            result.media.track.forEach(track => {
              if( track["@type"] === "Video") {                        
                // Set the new FPS
                fpsInput.value = track.FrameRate;
                fpsInput.onchange();
                showMediaInfo.removeAttribute("disabled");
              }
            } );
        })
          .catch((error) => {  
            statusMsg.innerHTML = `An error occured:\n${error.stack}`
        })
      }
    })
  }
  
  prevButton.addEventListener('click', evt => {
    // Go to next frame
    gotoFrame(frameNumber-1);
  });

  nextButton.addEventListener('click', evt => {
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

  slider.onchange = function() {
    // Go to next frame
    gotoFrame(Math.floor(this.value));
  }


  let canvasClick = "";
  canvasOutput.addEventListener('click', (evt) => {
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
  originButton.addEventListener('click', evt => {
    if( canvasClick === "addRawDataPoint") {
      startAndStopManual.innerText = 'Manual';
    }
    canvasClick = "setOrigin";
    // set statusMsg
    statusMsg.innerHTML = "Click on the origin...";
  });
  
  // update origin
  function setOrigin(evt) {
    // Get mouse position in pixels
    let posPx = getMousePos(canvasOutput, evt);
    
    // Update origin
    originXInput.value = posPx.x;
    originYInput.value = posPx.y;
    //originXInput.onchange();
    //originYInput.onchange();
    
    // Reset statusMsg and canvas click event
    canvasClick = "";
    statusMsg.innerHTML = "";
  }
  
  // Set scale button
  scaleButton.addEventListener('click', evt => {
    if( canvasClick === "addRawDataPoint") {
      startAndStopManual.innerText = 'Manual';
    } 
    canvasClick = "setScale1";
    // set statusMsg
    statusMsg.innerHTML = "Click on the first point";
  });
  
  // Set the scale (1st point)
  function setScale1(evt) {
    // Get mouse position in pixels
    let posPx = getMousePos(canvasOutput, evt);
    
    // Set the scale (1st point)
    scale1 = {x: posPx.x, y: posPx.y};
    
    // Reset statusMsg and canvas click event
    canvasClick = "setScale2";
    statusMsg.innerHTML = "Click on the second point";    
  }

  // Set the scale (2nd point)
  function setScale2(evt) {
    // Get mouse position in pixels
    let posPx = getMousePos(canvasOutput, evt);
    
    let distanceInMeter = toNumber( prompt("How long is this distance in meter?", "1.0") );
    
    // Update scale
    scale2 = {x: posPx.x, y: posPx.y};
    
        // Update origin
    scaleInput.value = Math.sqrt( (scale2.x-scale1.x)**2 + (scale2.y-scale1.y)**2 ) / distanceInMeter;
    scaleInput.onchange();
    //pixelsPerMeter = Math.sqrt( (scale2.x-scale1.x)**2 + (scale2.y-scale1.y)**2 ) / distanceInMeter;
    
    // Reset statusMsg and canvas click event
    canvasClick = "";
    statusMsg.innerHTML = "";
    
  }

  // Manual analysis
  startAndStopManual.addEventListener('click', evt => {

    if( startAndStopManual.innerText === 'Manual' ) {
      startAndStopManual.innerText = 'Stop';
      canvasClick = "addRawDataPoint";
    } else {
      startAndStopManual.innerText = 'Manual';
      canvasClick = "";
    }
  });

  function addRawDataPoint(evt) {
    // Get mouse position in pixels
    let posPx = getMousePos(canvasOutput, evt);
    
    // Add raw data
    let rawDataPoint = {t: frameNumber, x: posPx.x, y: posPx.y};
    addRawData( rawDataPoint );
    
    // Update plots
    updatePositionPlot();
    updateVelocityPlot();
    
    // Go to next frame
    gotoFrame(frameNumber+1);
    
  }

  function addRawData( rawDataPoint ) {
    let thisIndex = rawData.findIndex(entry => entry.t >= frameNumber);
    if( thisIndex < 0 ) { // insert at the end 
      thisItem = rawData.length;
      rawData.push( rawDataPoint );
    } else if ( rawData[thisIndex].t === frameNumber ) { // update
      rawData[thisIndex] = rawDataPoint;
    } else { // insert point at index
      rawData.splice(thisIndex, 0, rawDataPoint );
    }
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

  function getTime(targetFrame) {
    return t0 + (targetFrame + 0.5)/FPS;
  }

  function gotoFrame(targetFrame) {
    let newTime = (targetFrame + 0.5)/FPS;
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
        drawVideo();
        frameCounter.innerHTML = frameNumber + " / " +slider.max;
        slider.value = frameNumber;
      });
      return true;
    }
  }

  function getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / width;    // relationship bitmap vs. element for X
    let scaleY = canvas.height / height;  // relationship bitmap vs. element for Y

    //console.log("scaleX= "+ scaleX+ " scale="+canvas.width/width );
    
    return {
      x: (evt.clientX - rect.left)/scaleX,
      y: (evt.clientY - rect.top)/scaleY
    };
  }

  function getXYposition(posPx) {
    return {
      x: (posPx.x-origin.x)/pixelsPerMeter,       
      y: (origin.y-posPx.y)/pixelsPerMeter 
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

})();


// TODO: License

// All code runs in this anonymous function
// to avoid cluttering the global variables
(function() {

/* ========== GLOBAL SECTION =================
   Global variables are defined here
   =========================================== */
  
    // HTML elements
  let video        = document.getElementById('video');
  let videoInput   = document.getElementById('videoInput');
  let fpsInput     = document.getElementById('fpsInput');
  let fpsButton    = document.getElementById('fpsButton');
  let fpsStatusMsg = document.getElementById("fpsWaiting");
  let prevButton   = document.getElementById('prev');
  let playButton   = document.getElementById('play');
  let nextButton   = document.getElementById('next');
  let slider       = document.getElementById('slider');
  let canvasOutput = document.getElementById('canvasOutput');
  let canvasContext= canvasOutput.getContext('2d');
  let frameCounter = document.getElementById("frameNumber")  
  let startAndStopAuto = document.getElementById('startAndStopAuto');
  let startAndStopManual = document.getElementById('startAndStopManual');

  let mediaInfoResult= document.getElementById('mediaInfoResult');
  let showMediaInfo= document.getElementById('showMediaInfo');
  showMediaInfo.addEventListener('click', evt => {
    showModal("mediaInfoModal");
  });

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

  
  // Global video parameters
  let streaming = false;
  let width = 0;
  let height = 0;
  let frameNumber = 0;
  let FPS = 0.0;
  let t0 = 0.0;
  let integrationTime = 1;
  let rawData = [];

  //videoInput.src = "file:///Users/jeroen/Downloads/IMG_9460.MOV";
  //videoInput.src = "file:///Users/jeroen/Downloads/time.mp4";
  //videoInput.src = "file:///Users/jeroen/Downloads/cup.mp4";  
  
  // Add event listener for when file is selected
  videoInput.addEventListener('change', function() {
    let URL = window.URL || window.webkitURL;
    let file = this.files[0];
    let canPlay = video.canPlayType(file.type);
    if( canPlay === 'no' || canPlay === '' ) {
      return;
    }
    video.src = URL.createObjectURL(file);
    
    // Disable video control and reset video parameters when selecting new video
    disableVideoControl();
    frameCounter.innerHTML = 0;
    frameNumber = 0;
    FPS = 0;
    showMediaInfo.removeAttribute("disabled");
    fpsButton.removeAttribute("disabled");
    fpsInput.removeAttribute("disabled");
    
    // Get the frame rate
    getFPS();

  }, false);

  // Add event listener when the video is loaded
  let videoReady = false;
  video.addEventListener('loadedmetadata', () => {
    videoReady = true;

    // Get the dimensions of the video and prepare the canvas
    width = video.videoWidth;
    height = video.videoHeight;
    canvasOutput.width = width;
    canvasOutput.height = height;
    canvasContext.drawImage(video,0,0, width, height );

    console.log("Resolution: " + width.toString() + " x " + height.toString() );
    console.log("Duration: " + video.duration );
    
  });
  
  // Update the frame rate (fps) when user gives input or when calculated
  fpsInput.onchange = function() {
    if( this.value > 0 ) {
      FPS = this.value;
      //console.log("FPS = " + FPS + " duration = " + video.duration + " *= " + video.duration * FPS );
      slider.max = Math.floor( ((video.duration-t0) * FPS).toFixed(1) ) - 1;
    
      // Always reset to first frame
      gotoFrame( 0 );
    
      enableVideoControl();
    }
  }
  
  // Enable the video control buttons
  function enableVideoControl() {
    startAndStopManual.removeAttribute('disabled');
    startAndStopAuto.removeAttribute('disabled');
    prevButton.removeAttribute('disabled');
    playButton.removeAttribute('disabled');
    nextButton.removeAttribute('disabled');
    slider.removeAttribute('disabled');  
  }

  // Disable the video control buttons
  function disableVideoControl() {
    startAndStopManual.setAttribute('disabled', '');
    startAndStopAuto.setAttribute('disabled', '');
    prevButton.setAttribute('disabled', '');
    playButton.setAttribute('disabled', '');
    nextButton.setAttribute('disabled', '');
    slider.setAttribute('disabled', '');  
  }

  // Select video only when openCV is ready
  document.getElementById('opencv').onload= () => onOpenCvReady();
  function onOpenCvReady() {
    videoInput.removeAttribute('disabled');
  }
  
  // When pressing button start calculating frame rate
  fpsButton.onclick = function() {
    getFPS();
  }

  function getFPS() {
    fpsStatusMsg.innerHTML = "Calculating FPS... "
    
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
                console.log(track.FrameRate);
                        
                // Set the new FPS
                fpsInput.value = track.FrameRate;
                fpsInput.onchange();
                fpsStatusMsg.innerHTML = "";
              }
            } );
        })
          .catch((error) => {  
            fpsStatusMsg.innerHTML = `An error occured:\n${error.stack}`
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
  playButton.addEventListener('click', evt => {
    if ( playButton.innerText === 'play' ) {
      playButton.innerText = 'pause';
      playIntervalID = window.setInterval( function() { 
        if( gotoFrame(frameNumber+1) == false ) {
          window.clearInterval( playIntervalID );
          playButton.innerText = 'play';
        } 
      }, 1000/FPS );
    } else {
      window.clearInterval( playIntervalID );    
      playButton.innerText = 'play';
    }
  });

  slider.onchange = function() {
    // Go to next frame
    gotoFrame(Math.floor(this.value));
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



// Manual analysis
startAndStopManual.addEventListener('click', evt => {
  //canvasContext.drawImage(video,0,0, 320, 568 );

  startAndStopManual.innerText = 'Stop';
  
  // TODO: Check if the scale is set
  
  // Start the manual clicking
  canvasOutput.addEventListener('click', evt => {
    // Get mouse position in pixels
    let posPx = getMousePos(canvasOutput, evt);
    
    // Add raw data
    let rawDataPoint = {t: frameNumber, x: posPx.x, y: posPx.y};
    addRawData( rawDataPoint );
    
    // Update plots
    updatePositionPlot();
    updateVelocityPlot();

    
    /*let xPositions = [];
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
    
    // Create velocity data for plot
    let xVelocities = [];
    let yVelocities = [];
    rawData.forEach(function (item, index) {
      if( index > integrationTime ) {
        //let prevItem = rawData[ index-integrationTime ];
        let velocity = getVelocity(index - integrationTime, index);
        xVelocities.push( {x: velocity.t, y: velocity.x} );
        yVelocities.push( {x: velocity.t, y: velocity.y} );
      }
    });
    velocityChart.data.datasets[0].data = xVelocities;
    velocityChart.data.datasets[1].data = yVelocities;
    velocityChart.update();  
    */
    
    // Get the current time from the frameNumber
    /*let time = getTime(frameNumber);
        
    // Convert pixels to x-y-position
    let pos = getXYposition(posPx);
    let dataPoint = { t: time, x: pos.x, y: pos.y };
    
    // Update position plot
    updatePlot(positionChart, dataPoint );

    // Calculate velocity
    //console.log(chart.data.datasets[0].data.length);
    
    // Update previous velocity bin
    //let thisItem = rawData.findIndex(entry => entry.t === frameNumber);
    let prevItem = thisItem - integrationTime;
    if( prevItem >= 0 ) {
      updatePlot(velocityChart, getVelocity( prevItem, thisItem ) );
    } 
    let nextItem = thisItem + integrationTime;
    if( nextItem < rawData.length ) {
      updatePlot(velocityChart, getVelocity( thisItem, nextItem ) );      
    }
    */
    
    // Go to next frame
    gotoFrame(frameNumber+1);
    
  });
  
});

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
      if( index > integrationTime ) {
        //let prevItem = rawData[ index-integrationTime ];
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
    console.log(newTime);
    if( newTime < t0 ) {
      return false;
    } else if( newTime > video.duration ) {
      return false;
    } else {
      frameNumber = targetFrame;
      video.currentTime = newTime;
      video.addEventListener("seeked", function(e) {
        e.target.removeEventListener(e.type, arguments.callee); // remove the handler or else it will draw another frame on the same canvas, when the next seek happens
        canvasContext.drawImage(video,0,0, width, height );
        frameCounter.innerHTML = frameNumber + " / " +slider.max;
        slider.value = frameNumber;
      });
      return true;
    }
  }



  function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

// Obsolete
function updatePlot(chart, data) { 
  console.log(data);
  chart.data.datasets[0].data.push( {x: data.t, y: data.x} ); 
  chart.data.datasets[1].data.push( {x: data.t, y: data.y} ); 
  chart.update();  
}

function getXYposition(posPx) {
  let pixelsPerMeter = 1000;
  let origin = {x: 0, y:1920}; // in pixels
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


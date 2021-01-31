// TODO: License

/* ========== GLOBAL SECTION =================
   Global variables are defined here
   =========================================== */

let streaming = false;
let videoInput = document.getElementById('videoInput');
let startAndStopAuto = document.getElementById('startAndStopAuto');
let startAndStopManual = document.getElementById('startAndStopManual');
let prevButton = document.getElementById('prev');
let playButton = document.getElementById('play');
let nextButton = document.getElementById('next');
let slider     = document.getElementById('slider');



let canvasOutput = document.getElementById('canvasOutput');
let canvasContext = canvasOutput.getContext('2d');
    
var width = 0;
var height = 0;

let integrationTime = 1;
let rawData = [];
let frameNumber = 0;

videoInput.src = "file:///Users/jeroen/Downloads/IMG_9460.MOV";
//videoInput.src = "file:///Users/jeroen/Downloads/cup.mp4";
const FPS = 60;

// Add event listener when the video is loaded
let videoReady = false;
videoInput.addEventListener('canplay', () => {
    videoReady = true;
    startAndStopManual.removeAttribute('disabled');
    prevButton.removeAttribute('disabled');
    playButton.removeAttribute('disabled');
    nextButton.removeAttribute('disabled');
    slider.removeAttribute('disabled');  
    slider.max = Math.floor( videoInput.duration * FPS) ;
  console.log("Max"+slider.max)

    width = videoInput.videoWidth;
    height = videoInput.videoHeight;
    // Set time to halfway first frame
    videoInput.currentTime = 0.5/FPS;

    canvasOutput.width = width;
    canvasOutput.height = height;
    canvasContext.drawImage(videoInput,0,0, width, height );
    console.log("Resolution: " + width.toString() + " x " + height.toString() );
});

// Automatic analysis is only enabled when video is ready openCV is ready
function onOpenCvReady() {
  videoInput.addEventListener('canplay', () => {
    startAndStopAuto.removeAttribute('disabled');
  });  
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
  //console.log(this.value)
  gotoFrame(Math.floor(this.value));
}



// Automatic analysis
function onVideoStarted() {
  streaming = true;
  startAndStopAuto.innerText = 'Stop';
  videoInput.height = videoInput.width * (videoInput.videoHeight / 
                                          videoInput.videoWidth);
  //utils.executeCode('codeEditor');
  
  let video = document.getElementById('videoInput');
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

        console.log(videoInput.currentTime);
        videoInput.currentTime = Math.min(videoInput.duration, 
                                          videoInput.currentTime + 1/FPS);
      
        // schedule the next one.
        let delay = 1000/FPS - (Date.now() - begin);
        setTimeout(processVideo, 10 );//delay);
    } catch (err) {
        //utils.printError(err);
    }
  };

  //videoInput.currentTime = 0.5/FPS;
  
  // schedule the first one.
  setTimeout(processVideo, 0);
}



// Manual analysis
startAndStopManual.addEventListener('click', evt => {
  //canvasContext.drawImage(videoInput,0,0, 320, 568 );

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
  return (targetFrame + 0.5)/FPS;
}

function gotoFrame(targetFrame) {
  let newTime = (targetFrame + 0.5)/FPS;
  if( newTime < 0.0 ) {
    return false;
  } else if( newTime > videoInput.duration ) {
    return false;
  } else {
    frameNumber = targetFrame;
    videoInput.currentTime = newTime;
    videoInput.addEventListener("seeked", function(e) {
        e.target.removeEventListener(e.type, arguments.callee); // remove the handler or else it will draw another frame on the same canvas, when the next seek happens
        canvasContext.drawImage(videoInput,0,0, width, height );
        document.getElementById("frameNumber").innerHTML = frameNumber.toString();
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
        //videoInput.play().then(() => {
        videoInput.pause();
        onVideoStarted();
        //});
    } else {
        videoInput.pause();
        videoInput.currentTime = 0.5/FPS;
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




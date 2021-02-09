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
  let quickButton  = document.getElementById('quickScan');
  let fpsStatusMsg = document.getElementById("fpsWaiting");
  let prevButton   = document.getElementById('prev');
  let playButton   = document.getElementById('play');
  let nextButton   = document.getElementById('next');
  let slider       = document.getElementById('slider');
  let canvasOutput = document.getElementById('canvasOutput');
  let canvasContext= canvasOutput.getContext('2d');
  let frameCounter = document.getElementById("frameNumber")
    
   // Settings
  const stepSize = 0.001; // size of time step

  // Global video parameters
  let width = 0;
  let height = 0;
  let frameNumber = 0;
  let FPS = 0;
  let t0 = 0.0;

  //video.src = "file:///Users/jeroen/Downloads/IMG_9460.MOV";
  //video.src = "file:///Users/jeroen/Downloads/time.mp4";
  //video.src = "file:///Users/jeroen/Downloads/cup.mp4";
  
  // Add event listener for when file is selected
  videoInput.addEventListener('change', function() {
    let URL = window.URL || window.webkitURL;
    let file = this.files[0];
    let canPlay = video.canPlayType(file.type);
    if( canPlay === 'no' || canPlay === '' ) {
      return;
    }
    video.src = URL.createObjectURL(file);
  }, false);
  
  // Add event listener when the video is loaded
  video.addEventListener('loadedmetadata', () => {
    // Get the dimensions of the video and prepare the canvas
    width = video.videoWidth;
    height = video.videoHeight;
    canvasOutput.width = width;
    canvasOutput.height = height;
    canvasContext.drawImage(video,0,0, width, height );

    console.log("Resolution: " + width.toString() + " x " + height.toString() );
    console.log("Duration: " + video.duration );
    
  });

  // Disable video control and reset video parameters when selecting new video
  videoInput.addEventListener('change', function() {
    disableVideoControl();
    frameCounter.innerHTML = 0;
    frameNumber = 0;
    FPS = 0;
    fpsButton.removeAttribute("disabled");
    fpsInput.removeAttribute("disabled");
    quickButton.removeAttribute("disabled");
  }, false);
  
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
    prevButton.removeAttribute('disabled');
    playButton.removeAttribute('disabled');
    nextButton.removeAttribute('disabled');
    slider.removeAttribute('disabled');  
  }

  // Disable the video control buttons
  function disableVideoControl() {
    prevButton.setAttribute('disabled', '');
    playButton.setAttribute('disabled', '');
    nextButton.setAttribute('disabled', '');
    slider.setAttribute('disabled', '');  
  }

  // Display the status message when calculating FPS
  function displayStatus(fractionDone) {
    fpsStatusMsg.innerHTML = "Calculating FPS... "+ (fractionDone*100).toFixed(1)+"% done";    
  }

  // Abort function for interrupting FPS calculation
  let abort = false;
  function isAborted() { return abort; }
  
  // Abort function
  /*let isAborted = (function(){
    let abort = false;
    return {
      get: function(){
        return abort;
      },
      set: function( val ){
        abort = val;
      }
    };
  }());*/

  // When pressing button start calculating frame rate
  fpsButton.onclick = function() {
    
    if ( fpsButton.innerText === 'Scan' ) {
      fpsButton.innerText = 'Abort';
      //isAborted.set(false);
      abort = false;
      let quickScan = quickButton.checked;
      FrameAnalyser.getTimes( video, stepSize, quickScan,
                              displayStatus, isAborted ).then( function( frameTimes ){
        let thisFPS = FrameAnalyser.getFPS( frameTimes, stepSize );
        let maxFPS = thisFPS.value;
        let errorFPS = thisFPS.error;
    
        // Calculate required and measured significance
        let minErrorFPS = 0.5 / video.duration; // Minimal required accuracy
        let decimals = Math.max(0,Math.floor( Math.log10(6.0 / errorFPS ) ));;
        console.log("Uncertainty on FPS = " + errorFPS.toFixed(decimals) + 
                    " (required uncertainty= "+ minErrorFPS.toFixed(decimals) + ")" );    

        analyseFrameTimes( frameTimes );
        
        // Set the t0
        t0 = Math.max(0.0, (frameTimes[1] - 1.0/maxFPS));
        console.log("t0 = " + t0);
            
        // Set the new FPS
        fpsInput.value = maxFPS.toFixed(decimals);
        fpsInput.onchange();

        fpsButton.innerText = 'Scan';
      });
    } else {
      //isAborted.set(true);
      abort = true;
      fpsButton.innerText = 'Scan';
    }
  }
  
  
  function analyseFrameTimes( frameTimes ) {
            
    let maxFPS = fillFPSPlot( frameTimes );

    // Calculate probability for frameTimes and given FPS
    let bestProbFFT = 0.0, bestProbOvl = 0.0;
    let bestFPSFFT = 0, bestFPSOvl = 0;
    //let fftData = [];
    for(let i=0; i<980; ++i) {
      let testFPS = 1 + i*0.1;
      let testProbFFT = calculateProbFPS(frameTimes, testFPS, stepSize);
      if( Math.abs(testProbFFT) > bestProbFFT ) {            
        bestFPSFFT = testFPS;
        bestProbFFT = Math.abs(testProbFFT);
      }
      let testProbOvl = calculateOverlapFPS(frameTimes, testFPS, stepSize);
      if( Math.abs(testProbOvl) > bestProbOvl ) {            
        bestFPSOvl = testFPS;
        bestProbOvl = Math.abs(testProbOvl);
      }
    }
    fillFFTPlot( frameTimes, maxFPS );
    fillOverlapPlot( frameTimes, maxFPS );
          
    // Calculate simple FPS (ignore last entry)
    simpleFPS = ( (frameTimes.length-2)/frameTimes[frameTimes.length-2]);
          
    fpsStatusMsg.innerHTML = 
      "Simple: " + simpleFPS.toFixed(3) +
      ", FFT: " + bestFPSFFT.toFixed(1) + ", Ovl: " + bestFPSOvl.toFixed(1) ;
    console.log("Best FPS FFT = " + bestFPSFFT);
    console.log("Best FPS Ovl = " + bestFPSOvl);
    console.log("Best FPS Smp = " + simpleFPS);

  } // end analyseFrameTimes


  // TODO: maybe make frameTimes integer (unit of ms)
  function calculateProbFPS(frameTimes, testFPS, stepSize) {
    // Get the number of steps from the maximum time in frameTimes
    let nSteps = Math.round(frameTimes[frameTimes.length-1] / stepSize);
    
    // Loop over the time and perform simple Fourier analysis
    let amplitude = 1;
    let k=0, n=0, prob=0;
    for(let i=0; i < nSteps; ++i ) {
      let t = frameTimes[0] + i*stepSize;    
      if( t >= frameTimes[k] ) {
        amplitude *= -1;
        ++k;
      }
      if( t >= n/testFPS) {
        amplitude *= -1;
        ++n ;              
      }
      //console.log("t= " + t + " A=" + amplitude);
      prob += amplitude;
    }
    //console.log("Prob = "+ prob/nSteps);
    return prob / nSteps;
  }
  
  // TODO: maybe make frameTimes integer (unit of ms)
  function calculateOverlapFPS(frameTimes, testFPS, stepSize) {

    let amplitude = 0.0;
    frameTimes.forEach( (frameTime,index) => {
      let residual = (frameTime*testFPS) % 1;
      amplitude += 4.0*Math.abs(residual-0.5)-1.0;
    } );
    let norm = Math.max(frameTimes.length-1, testFPS*frameTimes[frameTimes.length-1] );
    return amplitude/norm;


    // Get the number of steps from the maximum time in frameTimes
    /*let nSteps = Math.round(frameTimes[frameTimes.length-1] / stepSize);
    
    // Loop over the time and perform simple analysis
    let overlaps = 0;
    let k=0, n=0, prob=0;
    for(let i=0; i < nSteps; ++i ) {
      let t = frameTimes[0] + i*stepSize;
      let frameChange = false;
      let potential = 10
      if( t >= n/testFPS) {
        frameChange = true;
        ++n ;              
      }
      if( t >= frameTimes[k] ) {
        ++k;
        if( frameChange ) overlaps += 1;
      }
    }
    return overlaps / Math.max(k,n);
    */
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

  function getTime(targetFrame) {
    return t0 + (targetFrame + 0.5)/FPS;
  }

  function gotoFrame(targetFrame) {
    let newTime = getTime(targetFrame);
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


  function fillFPSPlot( frameTimes ) {

    let fpsValues = Array(129).fill(0);
    let i = 1;
    let maxFPS = 0;
    let maxValue = 0;
    for( ; i<frameTimes.length-1; ++i ) {
      let dt = frameTimes[i]-frameTimes[i-1];
      let thisFPS = Math.round(1.0/dt);
      fpsValues[thisFPS] += 1;
      if( fpsValues[thisFPS] > maxValue ) {
        maxFPS=thisFPS;
        maxValue = fpsValues[thisFPS];
      }
    }
    //console.log(fpsValues);
    //fpsData = [];
    //fpsValues.forEach(function (item, index) { fpsData.push( {x: index+1, y: item} ); });
    //console.log(fpsData);

    fpsChart.data.datasets[0].data = fpsValues;
    fpsChart.update();  
    
    return maxFPS;

  }

  function fillFFTPlot( frameTimes, fps ) {
    //let beginFPS = Math.max(1, Math.floor(fps*0.1)*10 );
    let beginFPS = Math.max(1, 2*Math.round(0.5*(fps-5.0)));
    let fftData = [];
    for(let i=0; i<100; ++i) {      
      let testFPS = beginFPS + i*0.1;
      //let testFPS = 1 + i;
      let testProb = calculateProbFPS(frameTimes, testFPS, 0.001);
      fftData.push({x: testFPS,y: testProb });
    }
    
    fftChart.data.datasets[1].data = fftData;
    fftChart.update();  
  }

  function fillOverlapPlot( frameTimes, fps ) {
    let beginFPS = Math.max(1, 2*Math.round(0.5*(fps-5.0)) );
    let overlapData = [];
    for(let i=0; i<100; ++i) {      
      let testFPS = beginFPS + i*0.1;
      //let testFPS = 1 + i;
      let testProb = calculateOverlapFPS(frameTimes, testFPS, 0.001);
      overlapData.push({x: testFPS,y: testProb });
    }
    fftChart.data.datasets[0].data = overlapData;
    fftChart.update();  
  }


  // Plotting stuff
  let fpsCtx = document.getElementById('fpsChart').getContext('2d');
  const fpsChart = new Chart(fpsCtx, {
    type: 'bar',
    data: {
      labels: Array.from(Array(130).keys()),
      datasets: [{
        data: [],
        backgroundColor: 'green',
      }]
    },
    options: {
      legend: { display: false },
      scales: {
        xAxes: [{ scaleLabel:{ labelString: 'FPS from interval', display: true}, barPercentage: 1.3 } ],
        yAxes: [{type: 'logarithmic'/*, ticks: { beginAtZero: true}*/ }]
      }
    }
  });

  let options= { legend: { display: true },
                 scales: { xAxes: [{ scaleLabel:{ labelString: 'FPS', display: true},
                                    type: 'linear', position: 'bottom'/*, max: 100*/ }] ,
                           yAxes: [{ scaleLabel:{ labelString: 'Number of frames', display: false},
                                   type: 'linear'}]
                         }};
  let pData = { datasets: [{ label: 'Overlap', fill: 'false', pointBackgroundColor: 'red', 
                      borderColor: 'red', backgroundColor: 'red' },
                     { label: 'FFT', fill: 'false', pointBackgroundColor: 'blue', 
                      borderColor: 'blue', backgroundColor: 'blue' }] };
  let fftCtx = document.getElementById('fftChart').getContext('2d');
  const fftChart = new Chart(fftCtx, {
    type: 'line',
    data: pData,
    options: options
  }
                             
);

  
  
  
})();




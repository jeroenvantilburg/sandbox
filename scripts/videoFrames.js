// TODO: License

// All code runs in this anonymous function
// to avoid cluttering the global variables
(function() {

/* ========== GLOBAL SECTION =================
   Global variables are defined here
   =========================================== */

  // HTML elements
  let video      = document.getElementById('video');
  let fpsInput   = document.getElementById('fpsInput');
  let fpsButton = document.getElementById('fpsButton');
  let prevButton = document.getElementById('prev');
  let playButton = document.getElementById('play');
  let nextButton = document.getElementById('next');
  let slider     = document.getElementById('slider');
  let canvasOutput = document.getElementById('canvasOutput');
  let canvasContext = canvasOutput.getContext('2d');
    
  // Global video parameters
  let width = 0;
  let height = 0;
  let frameNumber = 0;
  let FPS = 0;

  //video.src = "file:///Users/jeroen/Downloads/IMG_9460.MOV";
  //video.src = "file:///Users/jeroen/Downloads/time.mp4";
  video.src = "file:///Users/jeroen/Downloads/cup.mp4";
  
  // Add event listener when the video is loaded
  video.addEventListener('canplay', () => {
    // Get the dimensions of the video and prepare the canvas
    width = video.videoWidth;
    height = video.videoHeight;
    canvasOutput.width = width;
    canvasOutput.height = height;
    canvasContext.drawImage(video,0,0, width, height );

    console.log("Resolution: " + width.toString() + " x " + height.toString() );
    console.log("Duration: " + video.duration );
    
  });
  
  // Update the frame rate (fps) when user give input or when calculated
  fpsInput.onchange = function() {
    if( this.value > 0 ) {
      FPS = this.value;
      slider.max = Math.floor( video.duration * FPS);
    
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
  
  // Calculate the frame rate (fps)
  fpsButton.onclick = () => getFPS();
  function getFPS() {
    let statusIntervalID=0;
    if ( fpsButton.innerText === 'Auto' ) {
      fpsButton.innerText = 'Abort';
    console.log("Calculating FPS");
    document.getElementById("fpsWaiting").innerHTML = "Calculating FPS...";

    
    const canvasFPS = document.createElement('canvas');
    let ctx = canvasFPS.getContext('2d');

    let prevImageData;// = canvasContext.getImageData(0, 0, width, height).data;

    video.currentTime = 0.0 ;
    //for( let i=0; i < 10; ++i ) {
    let frameTimes = [0.0];
    let iStep=0;
    let stepSize = 0.001;
    let skipped = 1;
    let period = 0.0; // keep track of the average period
    let nPeriods = 0; // number of periods used in average

    statusIntervalID = window.setInterval( function() { 
      fractionDone = iStep*stepSize / video.duration ;
      document.getElementById("fpsWaiting").innerHTML = "Calculating FPS... "+ 
        (fractionDone*100).toFixed(1)+"% done";
      }, 1000 );

    function compareFrames() {
      video.addEventListener("seeked", function(e) {
        e.target.removeEventListener(e.type, arguments.callee);
        ctx.drawImage(video,0,0, width, height);//, 0,0,width2, height2 );
        let imageData = ctx.getImageData(0, 0, width, height);
      
        let sameFrame = true;
    
        let px = imageData.data;
        //console.log("px = " + px.length.toString());
        //console.log(px[10].toString() + "  " + prevImageData[10]);

        let i=0;
        if( prevImageData !== undefined ) {
          for(; i < px.length; ++i ) {
            //console.log(px[i] + "  " + prevImageData[i]);
            if( px[i] != prevImageData[i] ) {
              sameFrame = false;
              // Only add frame time when not skipped steps
              if( skipped < 2 ) frameTimes.push(video.currentTime);
              break;
            }
          }
          //if( !sameFrame ) console.log("t = "+video.currentTime + ",  " + i + " " + sameFrame  );
        } else {
          // Store previous image in data buffer for the first step
          prevImageData = px.slice();          
        }
        
        if( sameFrame ) {
          skipped = 1;
        } else { // TODO: maybe move this part up to line: if skipped < 2
          if( skipped > 1 ) {
            skipped = -skipped+1; // Go back
            // Reset period calculation
            period = 0.0;
            nPeriods = 0;
            console.log("Going back " + (-skipped) + " steps, reseting period.")
          } else {
            let prevPeriod = frameTimes[frameTimes.length-1]-frameTimes[frameTimes.length-2];
            period = (period * nPeriods + prevPeriod)/(nPeriods+1);
            ++nPeriods;
            skipped = Math.ceil( (period/stepSize).toFixed(1) ) - 2;
            // Store previous image in data buffer
            prevImageData = px.slice();
            console.log("Skipping "+skipped + " steps with period = " + period );
          }
        }
        iStep += skipped;
        video.currentTime = 0.0 + iStep*stepSize;
        console.log("Step = " + iStep);

        
        // Recursively load the next frame
        if( video.currentTime < video.duration && fpsButton.innerText === 'Abort') {
          compareFrames();
        } else {
          window.clearInterval( statusIntervalID );    
          // Reset to first frame
          //gotoFrame( 0 );
          // Add final time
          frameTimes.push(video.currentTime)
          frameTimes.forEach( (frameTime,index) => {
            console.log("t = " + frameTime + " " + index/frameTime);  
          } );
          //console.log(frameTimes);
          
          let maxFPS = fillFPSPlot( frameTimes );
          console.log("maxFPS rough = " + maxFPS);
          // Get the best FPS from the intervals
          let i = 1;
          let totalDt = 0;
          let nIntervals = 0;
          for( ; i<frameTimes.length-1; ++i ) {
            let dt = frameTimes[i]-frameTimes[i-1];
            //console.log("dt= " + dt);
            if( Math.abs(1/dt-maxFPS) < 200.0*stepSize*maxFPS ) { 
              //console.log("Tot hier")
              totalDt += dt;
              ++nIntervals;
            }
          }
          maxFPS = nIntervals / totalDt;
          console.log("maxFPS = " + maxFPS);
          
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

          // Calculate required and measured significance
          let maxErrorFPS = 0.5 / video.duration; // Minimal required accuracy
          let errorFPS = maxFPS * stepSize / video.duration; // actual accuracy
          let decimals = Math.max(0,Math.floor( Math.log10(6.0 / errorFPS ) ));;
          //let decimals = Math.max(0,Math.floor( Math.log10( 6.0/maxErrorFPS ) ));
          console.log("Uncertainty on FPS = " + errorFPS + 
                      " (required uncertainty= "+ maxErrorFPS + ")" );
          
          // Calculate simple FPS (ignore last entry)
          simpleFPS = ( (frameTimes.length-2)/frameTimes[frameTimes.length-2]);
          
          document.getElementById("fpsWaiting").innerHTML = 
            "Interval: " + maxFPS.toFixed(3) + " (sign. " + maxFPS.toFixed(decimals) +
            "), simple: " + simpleFPS.toFixed(3) +
            ", FFT: " + bestFPSFFT.toFixed(1) + ", Ovl: " + bestFPSOvl.toFixed(1) ;
          console.log("Best FPS Int = " + maxFPS);
          console.log("Best FPS FFT = " + bestFPSFFT);
          console.log("Best FPS Ovl = " + bestFPSOvl);
          console.log("Best FPS Smp = " + simpleFPS);

          fpsButton.innerText = 'Auto';
          // Set the new FPS
          fpsInput.value = maxFPS.toFixed(decimals);
          fpsInput.onchange();
        }
      });
    }
    compareFrames();
    } else {
      fpsButton.innerText = 'Auto';
      window.clearInterval( statusIntervalID );    
    }
    
  }

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
    return (targetFrame + 0.5)/FPS;
  }

  function gotoFrame(targetFrame) {
    let newTime = (targetFrame + 0.5)/FPS;
    console.log(newTime);
    if( newTime < 0.0 ) {
      return false;
    } else if( newTime > video.duration ) {
      return false;
    } else {
      frameNumber = targetFrame;
      video.currentTime = newTime;
      video.addEventListener("seeked", function(e) {
        e.target.removeEventListener(e.type, arguments.callee); // remove the handler or else it will draw another frame on the same canvas, when the next seek happens
        canvasContext.drawImage(video,0,0, width, height );
        document.getElementById("frameNumber").innerHTML = frameNumber + " / " +slider.max;
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
    console.log(fpsValues);
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


// TODO: License

// All code runs in this anonymous function
// to avoid cluttering the global variables
var FrameAnalyser = (function() {

  // Global variable
  const scanRate = 600; // fps

  // Calculate the frame rate (fps)
  var getTimes = async function( video, quickScan = false,
                                 callbackStatus = function(){}, 
                                 abortCallback = function(){return false;} ) {
    console.log("Calculating FPS");
        
    let width = video.videoWidth;
    let height = video.videoHeight;
    
    // Dummy canvas to place video images
    const canvasFPS = document.createElement('canvas');
    let ctx = canvasFPS.getContext('2d');

    // Reset video 
    video.currentTime = 0.5/scanRate ;
        
    // Setup initial values
    let prevImageData;
    let frameTimes = [0.0];
    let iStep=0;
    let rStep=0;
    let skipped = 1;
    let period = 0.0; // keep track of the average period
    let nPeriods = 0; // number of periods used in average
    let minPrecisionReached = false;
    
    // Setup status callback every second
    callbackStatus(0.0);
    let statusIntervalID = window.setInterval( function() { 
      let fractionDone = video.currentTime / video.duration ;
      if( quickScan && nPeriods > 1 ) fractionDone *= 0.5 * period * scanRate;
      callbackStatus( fractionDone );
    }, 1000 );

        
    // Loop over the video in small steps
    while( video.currentTime < video.duration && !abortCallback() && !minPrecisionReached ) {
            
      // Wait for the video to be ready
      await new Promise(function(resolve, reject) {
        video.addEventListener("seeked", function(e) {
          e.target.removeEventListener(e.type, arguments.callee);
          resolve();
        });
      });

      // Get the image-data from the video
      ctx.drawImage(video,0,0, width, height);
      let imageData = ctx.getImageData(0, 0, width, height);
      let px = imageData.data;

      let sameFrame = true;
      if( prevImageData === undefined ) {
        // Store previous image in data buffer for the first step
        prevImageData = px.slice();          
      } else {
        // Compare this image with the one from the previous step
        let i=0;
        //console.log(px[508640] + "  " + prevImageData[508640] + "  " + px.length + " " + prevImageData.length);
        for(; i < px.length; ++i ) {
          //if( rStep === 3300 && nPeriods === 1 && px[i] < 200 && px[i] !== 0 ) console.log(px[i] + "  " + prevImageData[i]);
          if( px[i] !== prevImageData[i] ) {
            sameFrame = false;
            break;
          }
        }
        //if( !sameFrame ) console.log("t = "+video.currentTime + ",  " + i + " " + sameFrame  );
        //if( !sameFrame ) console.log(px[i] + "  " + prevImageData[i]);

      }
      
      // Determine how many steps can be skipped
      if( sameFrame ) {
        // Speed-up finding of first frame or when relative step beyond expected period
        // Hardcoded numbers: this only works at a scanRate of 600
        if( nPeriods === 0 || rStep > period*scanRate+5 ) {
          if( rStep === 0 || rStep === 1) {
            skipped = 9-rStep; // first guess 60 or 50 fps (transition between 9-10 or 11-12)
          } else if (rStep === 12 ) {
            skipped = 19-rStep; // third guess 30 fps (transition between 19-20)
          } else if (rStep === 20 ) {
            skipped = 23-rStep; // fourth guess 25 or 24 fps (transition between 23-24 or 24-25)
          } else if (rStep > 99 && rStep%100 === 0 ) {
            skipped = 100; // still not found skip 100
          } else if (rStep > 29 && rStep%10 === 0 ) {
            skipped = 10; // still not found skip 10
          } else {
            skipped = 1;
          }
        } else {
          skipped = 1;
        }
      } else {
        if( skipped > 1 ) {
          skipped = -skipped+1; // Go back
          // Reset period calculation
          period = 0.0;
          nPeriods = 0;
          //console.log("Going back " + (-skipped) + " steps, reseting period.")
        } else {
          frameTimes.push(video.currentTime-0.5/scanRate); // Add frame time
          let prevPeriod = frameTimes[frameTimes.length-1]-frameTimes[frameTimes.length-2];
          period = (period * nPeriods + prevPeriod)/(nPeriods+1);
          ++nPeriods;
          skipped = Math.ceil( (period*scanRate+0.10).toFixed(2) ) - 2;
          // Store previous image in data buffer
          prevImageData = px.slice();
          //prevImageData = { ...px };
          rStep = 0; // reset relative step 
          //console.log("Skipping "+skipped + " steps with period = " + period );
        }
      }

      // Determine if minimum precision is reached
      if( quickScan && nPeriods > 2 ) {
        minPrecisionReached = (video.currentTime > 2*video.duration/(period*scanRate) );
      }

      // Set the next step and the new video time (triggers video.seeked)
      iStep += skipped;
      rStep += skipped;
      video.currentTime = (0.5 + iStep)/scanRate;
      //console.log("Step = " + iStep + ", rStep = "+ rStep + ", time = " + video.currentTime);
    } // end while loop
    
    window.clearInterval( statusIntervalID );    
    // Add final time such that we know how long the video is
    frameTimes.push(video.currentTime);
        
    return frameTimes;
  }

  // Get the frame rate from the frame transition times
  function getFPS( frameTimes ) {
        

    // Bin the interval-times in millisecond steps and find the bin with the largest occupancy
    let fpsValues = Array(601).fill(0);
    let bestFPS = 1;
    let largestBin = 0;
    for(let i = 1 ; i<frameTimes.length-1; ++i ) {
      let thisFPS = Math.round(1.0/(frameTimes[i]-frameTimes[i-1]));
      if( thisFPS > 600 ) continue;      
      fpsValues[thisFPS] += 1;
      if( fpsValues[thisFPS] > largestBin ) {
        largestBin = fpsValues[thisFPS];
        bestFPS = thisFPS;
      }
    }
    console.log("Best FPS rough = " + bestFPS);
    
    
    // Get the best frame rate from the intervals by averaging around the best estimate
    let totalDt = 0;
    let nIntervals = 0;
    for(let i=1; i<frameTimes.length-1; ++i ) {
      let dt = frameTimes[i]-frameTimes[i-1];
      console.log("t = " + frameTimes[i] + ", dt= " + dt.toFixed(3) + ",  FPS = " + (1/dt).toFixed(1) );
      // Only average the intervals within 20% around the maximum
      if( Math.abs(1/dt-bestFPS) < 0.20*bestFPS ) { 
        totalDt += dt;
        ++nIntervals;
      }
    }
    bestFPS = nIntervals / totalDt;
    console.log("Best FPS fine = " + bestFPS);

    // Calculate the obtained accuracy
    let errorFPS = bestFPS / (scanRate * frameTimes[frameTimes.length-1]); // actual accuracy
    
    return {
      value : bestFPS,
      error : errorFPS
    }
  }

  
  return {
    getTimes : getTimes,
    getFPS   : getFPS
  }
  
})();

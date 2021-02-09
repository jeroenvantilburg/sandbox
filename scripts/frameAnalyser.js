// TODO: License

// All code runs in this anonymous function
// to avoid cluttering the global variables
var FrameAnalyser = (function() {

  // Calculate the frame rate (fps)
  var getTimes = async function( video, stepSize = 0.001, quickScan = false,
                                 callbackStatus = function(){}, 
                                 abortCallback = function(){return false;} ) {
    console.log("Calculating FPS");
    
    let width = video.videoWidth;
    let height = video.videoHeight;
    
    // Dummy canvas to place video images
    const canvasFPS = document.createElement('canvas');
    let ctx = canvasFPS.getContext('2d');

    // Reset video 
    video.currentTime = 0.0 ;
        
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
      if( quickScan && nPeriods > 1 ) fractionDone *= 0.5 * period / stepSize;
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
        for(; i < px.length; ++i ) {
          //console.log(px[i] + "  " + prevImageData[i]);
          if( px[i] != prevImageData[i] ) {
            sameFrame = false;
            // Only add frame time when not skipped steps
            //if( skipped < 2 ) frameTimes.push(video.currentTime);
            break;
          }
        }
        //if( !sameFrame ) console.log("t = "+video.currentTime + ",  " + i + " " + sameFrame  );
      }
      
      // Determine how many steps can be skipped
      if( sameFrame ) {
        if( nPeriods === 0 ) { // speed-up finding first frame
          if( rStep === 0 || rStep === 1) {
            skipped = 16-rStep; // first guess 60 fps (transition between 16-17 ms)
          } else if (rStep === 17 ) {
            skipped = 19-rStep; // second guess 50 fps (transition between 19-20 ms)
          } else if (rStep === 20 ) {
            skipped = 33-rStep; // third guess 30 fps (transition between 33-34 ms)
          } else if (rStep === 34 ) {
            skipped = 39-rStep; // fourth guess 25 fps (transition between 39-40 ms)
          } else if (rStep > 44 && (rStep-5)%10 === 0 ) {
            skipped = 10; // still not found skip 10 ms
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
          console.log("Going back " + (-skipped) + " steps, reseting period.")
        } else {
          frameTimes.push(video.currentTime); // Add frame time
          let prevPeriod = frameTimes[frameTimes.length-1]-frameTimes[frameTimes.length-2];
          period = (period * nPeriods + prevPeriod)/(nPeriods+1);
          ++nPeriods;
          skipped = Math.ceil( (period/stepSize).toFixed(1) ) - 2;
          // Store previous image in data buffer
          prevImageData = px.slice();
          rStep = 0; // reset relative step 
          console.log("Skipping "+skipped + " steps with period = " + period );
        }
      }

      // Determine if minimum precision is reached
      if( quickScan && nPeriods > 2 ) {
        minPrecisionReached = (video.currentTime > 2*video.duration*stepSize/period );
      }

      // Set the next step and the new video time (triggers video.seeked)
      iStep += skipped;
      rStep += skipped;
      video.currentTime = 0.0 + iStep*stepSize;
      console.log("Step = " + iStep + ", time = " + video.currentTime);
    } // end while loop
    
    window.clearInterval( statusIntervalID );    
    // Add final time
    frameTimes.push(video.currentTime)
        
    return frameTimes;
  }

  // Get the frame rate from the frame transition times
  function getFPS( frameTimes, stepSize = 0.001 ) {
          
    // TODO: fix this
    let videoduration = 20.0;
    
    // Bin the interval-times in millisecond steps and find the bin with the largest occupancy
    let dtValues = Array(1001).fill(0);
    let mpvDt = 1;
    let largestBin = 0;
    for(let i = 1 ; i<frameTimes.length-1; ++i ) {
      let dt = Math.round((frameTimes[i]-frameTimes[i-1])*1000);
      if( dt > 1000 ) continue;      
      dtValues[dt] += 1;
      if( dtValues[dt] > largestBin ) {
        largestBin = dtValues[dt];
        mpvDt = dt;
      }
    }
    let bestFPS = 1000.0/mpvDt;
    console.log("Best FPS rough = " + bestFPS);
    
    // Get the best frame rate from the intervals by averaging around the best estimate
    let totalDt = 0;
    let nIntervals = 0;
    for(let i=1; i<frameTimes.length-1; ++i ) {
      let dt = frameTimes[i]-frameTimes[i-1];
      console.log("t = " + frameTimes[i] + ", dt= " + dt.toFixed(3) + ",  FPS = " + (1/dt).toFixed(1) );
      if( Math.abs(1/dt-bestFPS) < 200.0*stepSize*bestFPS ) { 
        totalDt += dt;
        ++nIntervals;
      }
    }
    bestFPS = nIntervals / totalDt;
    console.log("Best FPS fine = " + bestFPS);

    // Calculate the obtained accuracy
    let errorFPS = bestFPS * stepSize / frameTimes[frameTimes.length-1]; // actual accuracy
    
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

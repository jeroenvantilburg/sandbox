const fileinput = document.getElementById('fileinput')
const output = document.getElementById('output')
const frameRate = document.getElementById('frameRate')


const inspect = obj => {
  for (const prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      console.log(`${prop}: ${obj[prop]}`)
    }
  }
}

const onChangeFile = (mediainfo) => {
  const file = fileinput.files[0]
  if (file) {
    output.value = 'Working…'

    const getSize = () => file.size

    const readChunk = (chunkSize, offset) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target.error) {
            reject(event.target.error)
          }
          resolve(new Uint8Array(event.target.result))
        }
        reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize))
      })

    mediainfo
      .analyzeData(getSize, readChunk)
      .then((result) => {
        //output.value = JSON.stringify(result, undefined, 4);
        output.innerHTML = JSON.stringify(result, undefined, 4);

        //console.log("Frame rate = " + result[1].frameRate);
        console.log(result);
        //console.dir(result);
        //console.log(JSON.stringify(result));
        //console.log(result.media);
        //console.log(result.media.track[0]["@type"]);
        result.media.track.forEach(track => {
          if( track["@type"] === "Video") {
            console.log(track.FrameRate);
            frameRate.innerHTML = "Frame rate = "+track.FrameRate;
          }
        } );
        
        //inspect(result.media);


      })
      .catch((error) => {
        output.value = `An error occured:\n${error.stack}`
      })
  }
}

MediaInfo({ format: 'object' }, (mediainfo) => {
  fileinput.addEventListener('change', () => onChangeFile(mediainfo))
})

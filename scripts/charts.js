// License

// All code runs in this anonymous function
// to avoid cluttering the global variables
(function() {

  /* ========== GLOBAL SECTION =================
       Global variables are defined here
     =========================================== */
  
  let base64 = "";

  loadCode('codeSnippet', 'codeEditor');
      
  google.charts.load('current', {'packages':['corechart']});
  google.charts.setOnLoadCallback( runCode );

  $("#runCode").click( runCode );
      
  function loadCode(scriptId, textAreaId) {    
    let scriptNode = document.getElementById(scriptId);
    let textArea = document.getElementById(textAreaId);
    if (scriptNode.type !== 'text/code-snippet') {
      throw Error('Unknown code snippet type');
    }
    console.log("tot hier");
    console.log(textArea);
    textArea.value = scriptNode.text.replace(/^\n/, '');
  };
    
  function runCode() {
    try {
      clearError();
      let code = document.getElementById('codeEditor').value;
      let chart = eval(code);
      base64 = chart.getImageURI();      
    } catch (err) {
      printError(err);
    }    
  }
      
  function clearError() {
    $("#errorOutput").innerHTML = '';
  };

  function printError(err) {
    $("#errorOutput").innerHTML = err;
  };

      
  document.getElementById('save-svg').addEventListener('click', function () {
    //get svg element.
    var svg = $("#chartOutput").getElementsByTagName('svg')[0];

    //get svg source.
    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(svg);

      //add name spaces.
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    //add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    //convert svg source to URI data scheme.
    var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);

    downloadURL( url, "chart.svg" );    
  });
      
  document.getElementById('save-png').addEventListener('click', function () {
    downloadURL( base64, "chart.png" );
  });

  function downloadURL( url, fileName ) {
    var link = document.createElement("a");
    document.body.appendChild(link); // for Firefox
    link.setAttribute("href", url);
    link.setAttribute("download", fileName );
    link.click();
    document.body.removeChild(link);
  }
      
})();


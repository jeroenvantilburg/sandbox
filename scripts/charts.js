// License

// All code runs in this anonymous function
// to avoid cluttering the global variables
(function() {

  /* ========== GLOBAL SECTION =================
       Global variables are defined here
     =========================================== */
  
  //let base64 = "";

  //loadCode('codeSnippet', 'codeEditor');
  

  $(document).ready(function() {
    loadScript();
    
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback( runCode );
  }); 



  
  function loadScript( url = "demos/combochart.js" ) {
    // Get the file using jQuery get method
    $.get(url, function( code ) { 
      $("#codeEditor").val(code);
    });
  }
  
  // Event listener for uploading files
  $("#fileinput").change(function() {
    let files = this.files;
    // Use createObjectURL, this should address any CORS issues.
    let filePath = URL.createObjectURL(files[0]);
    loadScript(filePath);

    // Reset the file input such that it always triggers next change
    this.value = '';
  });

  $("#download").click( function(){
    var filename = prompt("Download as...", "charts.js");
    if (filename != null && filename != "") {
      console.log("filename="+filename);
      let url = 'data:text/plain;charset=utf-8,' + encodeURIComponent( $("#codeEditor").val() ) ;
      //console.log(url);
      downloadURL( url, filename );
    }
  });

  
  $("#runCode").click( runCode );
      
  /*function loadCode(scriptId, textAreaId) {    
    let scriptNode = document.getElementById(scriptId);
    let textArea = document.getElementById(textAreaId);
    if (scriptNode.type !== 'text/code-snippet') {
      throw Error('Unknown code snippet type');
    }
    textArea.value = scriptNode.text.replace(/^\n/, '');
  };*/
    
  /*window.addEventListener('error', function(e) {
    printError(e);
  }, false);*/
  
  window.onerror = function(msg, url, linenumber) {
    $("#errorOutput").html("Line " + linenumber + ": " + msg ) ;
    return true;
  }

  /*$(window).on("error", (e) => {
    printError(e);
  });*/

  function runCode() {
    let code = $('#codeEditor').val();
    clearError();
    
    try {
      $("<script />").html("{"+code+"}").appendTo("head").remove();
       //  eval(code);
    } catch (e) {
      printError( e );
    }

  }
        
  function clearError() {
    $("#errorOutput").html('');
  };

  function printError(err) {
    $("#errorOutput").html("Javascript error on line " + err.lineno + ": " + err.message ) ;
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
      
  /*document.getElementById('save-png').addEventListener('click', function () {
    downloadURL( base64, "chart.png" );
  });*/

  function downloadURL( url, fileName ) {
    var link = document.createElement("a");
    document.body.appendChild(link); // for Firefox
    link.setAttribute("href", url);
    link.setAttribute("download", fileName );
    link.click();
    document.body.removeChild(link);
  }
  
      
})();


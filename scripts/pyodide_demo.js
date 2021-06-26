// License

// All code runs in this anonymous function
// to avoid cluttering the global variables
(function() {
  // python code to run at startup
  let startupCode = `
import sys, io
sys.stdout = io.StringIO() # redirect stdout
def create_root_element1(self):
    div = document.createElement('div')
    document.getElementById("pyplotdiv").appendChild(div)
    return div
import matplotlib.pyplot as plt
from matplotlib.backends import backend_agg
from js import document
`;

  // Create a CodeMirror instance
  let myCodeMirror = CodeMirror(document.getElementById("codeEditor"), {
    mode:  "python",
    lineNumbers: true
  } );

  $("#runCode").click( evaluatePython );

  // Read the xml file from the hash of the web address
  function readFileFromHash() {
    let pyFile = window.location.hash.substr(1);
  
    if( pyFile == "") { // If hash is empty read the default file
      pyFile = "demos/sine.py";
    }
    else if ( pyFile.includes("https") ) {
      $.get(pyFile, function(data) {
        console.log("Trying to load external python file");
        console.log(pyFile);
        console.log(data);
      });
    } else {
      pyFile = "demos/"+pyFile;
    }
  
    // Load the python file
    loadScript( pyFile );  
  }

  // Trigger reload when hash has changed
  $(window).on('hashchange', readFileFromHash );

  // Call function from select menu
  function loadHash( hash ) {
    // Force a reload when hash did not change
    if( hash == window.location.hash ) {
      readFileFromHash();
    } else { // Hash will change: will trigger a reload
      window.location = hash;
    }
  }

  $(".box-item").on("click", function() {
    //console.log("id = " + $(this).attr('href') );
    //console.log($(this));
    loadHash( $(this).attr('href') );
    $(".close").click();
  });



  function loadScript( url = "demos/sine.py" ) {
    // Get the file using jQuery get method
    $.get(url, function( code ) { 
      myCodeMirror.setValue( code );
    });
  }

  // Load the demo script
  readFileFromHash();
  //loadScript();

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
    var filename = prompt("Download as...", "charts.py");
    if (filename != null && filename != "") {
      console.log("filename="+filename);
      let url = 'data:text/plain;charset=utf-8,' + encodeURIComponent( myCodeMirror.getValue() ) ;
      //console.log(url);
      downloadURL( url, filename );
    }
  });

  function downloadURL( url, fileName ) {
    var link = document.createElement("a");
    document.body.appendChild(link); // for Firefox
    link.setAttribute("href", url);
    link.setAttribute("download", fileName );
    link.click();
    document.body.removeChild(link);
  }
    

  // Initialize Pyodide
  const output = document.getElementById("output");
  output.value = 'Initializing...\n';
  async function main(){
    await loadPyodide({ indexURL : 'https://cdn.jsdelivr.net/pyodide/v0.17.0/full/' });
    await pyodide.runPythonAsync( startupCode );
      
    output.value += 'Ready!\n';
  }
  let pyodideReadyPromise = main();

  // Evaluate the python user code
  async function evaluatePython() {
    await pyodideReadyPromise;
    try {
      let output = await pyodide.runPythonAsync( myCodeMirror.getValue() );
      addToOutput(output);
      showFigure();
    } catch(err) {
      addToOutput(err);
    }
  }

  // Print the output from the Python user code
  function addToOutput(s) {
    // Print stdout
    var stdout = pyodide.runPython("sys.stdout.getvalue()")
    pyodide.runPython("sys.stdout = io.StringIO()"); // clear previous stdout
    output.value += stdout;
    
    // Print output value (unless it is undefined)
    if( s ) output.value += s + '\n';

    // Move to last line
    output.scrollTop = output.scrollHeight;
  }

  // Draw the matplotlib figure in the HTML DOM
  let lastID;
  function showFigure() {
    // Remove the previous div first
    if( lastID ) {
      document.getElementById(lastID).remove();
    }

    // Use the built-in show() method
    pyodide.runPython("f = plt.gcf()");
    pyodide.runPython("f.canvas.create_root_element = create_root_element1.__get__(f.canvas, f.canvas.__class__)");
    pyodide.runPython("f.canvas.show()");
    pyodide.runPython("lastID = f.canvas._id");

    // Store the id of the output canvas
    lastID = pyodide.globals.get('lastID')
  }


  /* ============= MODAL SECTION =================
     Define functions for the modal boxes.
     Shows and hides the modal boxes.
     =========================================== */    

  // Event listener for the different modal boxes
  $("#gallery").click( evt => { showModal("galleryModal"); });
  /*$("#showAbout").click( evt => { showModal("aboutModal"); } );
  $("#showHelp").click( evt => { showModal("helpModal");} );*/
  
  // Showing modal box
  function showModal(name) { $("#"+name).toggle(); }

  // When the user clicks on <span> (x), close the current modal
  $(".close").on("click", function() { $(this).parent().parent().toggle(); });
  
  // When the user clicks anywhere outside of the modal, close it
  $(window).on("click", function(event) {
    if( event.target.className === "modal" ) event.target.style.display = "none";
  });

          
})();

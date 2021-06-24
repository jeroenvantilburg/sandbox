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

  var myCodeMirror = CodeMirror(document.getElementById("codeEditor"), {
    mode:  "python",
    lineNumbers: true
  } );

  $("#runCode").click( evaluatePython );

  function loadScript( url = "demos/sine.py" ) {
    // Get the file using jQuery get method
    $.get(url, function( code ) { 
      myCodeMirror.setValue( code );
    });
  }

  // Load the demo script
  loadScript();

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
    
  const output = document.getElementById("output");
     
  let lastID;

  function addToOutput(s) {
    // Use the built-in show() method
    pyodide.runPython("f = plt.gcf()");
    pyodide.runPython("f.canvas.create_root_element = create_root_element1.__get__(f.canvas, f.canvas.__class__)");
    pyodide.runPython("f.canvas.show()");
    pyodide.runPython("lastID = f.canvas._id");

    // Store the id of the output canvas
    lastID = pyodide.globals.get('lastID')

    var stdout = pyodide.runPython("sys.stdout.getvalue()")
    pyodide.runPython("sys.stdout = io.StringIO()"); // clear stdout
    output.value += stdout;
      
    if( s ) output.value += s + '\n';//'>>>' + code.value + '\n' + s + '\n';

    // Move to last line
    output.scrollTop = output.scrollHeight;

  }

  output.value = 'Initializing...\n';
  // init Pyodide
  async function main(){
    await loadPyodide({ indexURL : 'https://cdn.jsdelivr.net/pyodide/v0.17.0/full/' });
    await pyodide.runPythonAsync( startupCode );
      
    output.value += 'Ready!\n';
  }
  let pyodideReadyPromise = main();

  async function evaluatePython() {

    // Remove the previous div first
    if( lastID ) {
      document.getElementById(lastID).remove();
    }

    await pyodideReadyPromise;
    try {
      let output = await pyodide.runPythonAsync( myCodeMirror.getValue() );
      addToOutput(output);
    } catch(err) {
      addToOutput(err);
    }
  }

          
})();

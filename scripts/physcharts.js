let PhysCharts = {

  joinTwoArrays: function( serie1, serie2 ) {

    if( serie1.length == 0 || serie1[0].length < 2 || serie2.length == 0 || serie2[0].length < 2 ) return;
    let newHeader = serie1[0].concat( serie2[0].slice(1) );
    
    //console.log( newHeader );
    let newSerie = [ newHeader ];
    for(let i=1; i < serie1.length; ++i ) {
      let newRow = serie1[i].concat( Array(serie2[0].length-1).fill(null) );
      //console.log( newRow );
      newSerie.push( newRow ) ;
    }
    
    for(let i=1; i < serie2.length; ++i ) {
      let newRow = [ serie2[i][0] ].concat( Array(serie1[0].length-1).fill(null) ).concat( serie2[i].slice(1) ) ;
      //console.log( newRow );
      newSerie.push( newRow ) ;
    }
    return newSerie;     
  },

  joinArrays: function( series ) {

    // Apply trivial combinations
    if( series.length == 0 || !Array.isArray( series[0] ) ) return;

    let joined = series[0];
    
    for( let i = 1; i < series.length; ++i ) {
      if( !Array.isArray( series[i] ) ) return joined;
    
      let newJoined = this.joinTwoArrays( joined, series[i] );
      joined = newJoined;
    }
    return joined;
  },
  
  // series is list of DataTables and Arrays 
  joinDataTables : function( series ) {
    let gv = google.visualization;
    
    // Apply trivial combinations
    if( series.length == 0 ) return;

    let seriesDT = [];
    series.forEach( serie => { 
      let dataTable = Array.isArray(serie) ? gv.arrayToDataTable( serie ) : serie;
      seriesDT.push( dataTable );
    });    

    let joined = seriesDT[0];
    for( let i = 1; i < seriesDT.length; ++i ) {

      let argList1 = [];
      for( let j=1; j < joined.getNumberOfColumns(); ++j ) {
        argList1.push( j );
      }
      let argList2 = [];
      for( let j=1; j < seriesDT[i].getNumberOfColumns(); ++j ) {
        argList2.push( j );
      }
      
      // Unfortunately, gv.data.join inserts duplicate entries when it finds multiple x-values
      let newJoined = gv.data.join( joined, seriesDT[i], 'full', [[0,0]],argList1,argList2);
      joined = newJoined;
    }
    return joined;
  },
  
  createDataPoint : function( x, y, text ) {
    let p = new google.visualization.DataTable();
    p.addColumn('number', 'x');
    p.addColumn('number', text);
    p.addColumn({type: 'string', role: 'annotation'});
    p.addRow([x, y, text]);
    return p;
  }

}


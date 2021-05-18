let gv = google.visualization;

let data0 = [['x','y0'],[1,2],[1,2.5], [2,2.1], [2,2.9], [3,3.2]  ];
let data1 = [['x','y1'],[1,5.1],[2,5.5] ];
let data2 = [['x','y2'],[0.5,1.5],[1,1.4],[1.5,4.0],[2.0,5.0],[3.0,4.5],[3.5,1.0] ];

function mySin(x) {
  return 1.5*Math.sin(x*4)+3.0;
}

let data3 = PhysCharts.fillArrayFromFunction( mySin, 'y3', 0.0, 4.0 );

let data4 = gv.arrayToDataTable([
 ['x', 'v0', 'v1'],
 [ 0.5 , 5.2, 4.5 ],
 [ 0.5 , 5.4, null ],
 [ 2.5 , 5.0, 3.4 ],
 [ 2.5 , 5.5, null ],
 [ 3.8 , 5.75, 3.4 ],
 [ 4.4 , null, 1.4 ],
]);

let joinedData = PhysCharts.joinArrays( [data0, data1, data2, data3] );
let p = PhysCharts.createDataPoint(2.8, 0.8, 'Some text');
let d = PhysCharts.joinDataTables( [joinedData, p, data4 ] );

var options = {
  vAxis: {title: 'v (m{\\cdot}s^{\\minus1})'},
  hAxis: {title: '\\Delta time (\\it{s})', minValue: 0, maxValue: 4},
  seriesType: 'scatter',
  series: {1: {type: 'line'}, 
           2: {type: 'line', curveType: 'function'},     
           3: {type: 'line', curveType: 'function'},     
           4: {pointSize: 0, visibleInLegend: false, annotations: { stemColor : 'none' }},
           6: {type:'line', curveType: 'function'} },
  interpolateNulls: true,
};

options.hAxis.titleTextStyle = {italic: false };
options.vAxis.titleTextStyle = {italic: false };
options.vAxis.gridlines= {count: 50, multiple: 1};
options.hAxis.gridlines= {count: 20, multiple: 0.5};

// Always needed
let chart = new gv.ComboChart( chartOutput );
PhysCharts.applyFormatting( chart );
chart.draw(d, options);

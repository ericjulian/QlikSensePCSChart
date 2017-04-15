/*global google, define, console, alert, document */
/*eslint no-undef: "error"*/
/*eslint-disable no-console*/

/*
	Use ESLint for syntax validation which is a little less rigid.

	http://eslint.org/demo/

	Known Linting issues which should not impact execution
	175:34 - 'e' is defined but never used. (no-unused-vars)

	These changes have been made but haven't been tested so you could look into this functionality and 
	fix the problem if it exists.
		Put these options under the out of control points section
		One out of control point color setting.
		One out of control point shape setting.

	Enhancements
		Add code to dynamically set the width/height of the chart.
*/

define( ["qlik", "text!./template.html", "./properties", "./initialProperties", "./outOfControlSignals", "//www.gstatic.com/charts/loader.js"],
	function (qlik, htmlTemplate, propertiesPanel, initProperties, outOfControlSignals) {
		"use strict";
		/*
			These are important console debug statements.  If there are JavaScript errors in either of these files the extension will not render.
			These variables will be undefined if there is a JavaScript error.  Use JSLint to find the JavaScript error.

			console.info(propertiesPanel);
			console.info(initProperties);
			console.info(outOfControlSignals);
		*/

		return {
			definition: propertiesPanel, /* Set the panel configuration */
			initialProperties: initProperties.chartHyperCubeDef, /* Set hypercube configuration */
			template: htmlTemplate, /* HTML used to render the chart */
			support: {
				snapshot: true,
				export: true,
				exportData: false
			},
			controller: ["$scope", function ( $scope ) {
				console.info("controller fired ");

				var app = qlik.currApp();

				// Initialize minor y axis ticks
				var yMinorTicks = [];

				// Retrieve dimension field name
				var dimensionField = $scope.layout.qHyperCube.qDimensionInfo[0].qGroupFieldDefs[0];

				// Initialize control values object
				var controlValues = {};

				// Initialize viewport min/max
				var viewportDims = {};

				// Create the hypercube that will calculate the stddev/average
				var controlCubeDef = initProperties.setControlCubeField(initProperties.controlLevelCubeDef, $scope.layout.controlField, dimensionField);

				// Load the Visualization API and the corechart package.
				google.charts.load("current", {"packages":["corechart"]});

				app.createCube( controlCubeDef, function ( reply ) {
					console.info("createCube fired");
					$scope.controlCubeDef = reply;
					controlValues = createControlValues($scope.layout, $scope.controlCubeDef.qHyperCube.qDataPages[0].qMatrix[0][1].qNum, $scope.controlCubeDef .qHyperCube.qDataPages[0].qMatrix[0][0].qNum);
					yMinorTicks = setTicks($scope.controlCubeDef.qHyperCube.qDataPages[0].qMatrix[0][1].qNum, $scope.controlCubeDef.qHyperCube.qDataPages[0].qMatrix[0][0].qNum);
					viewportDims = getMinMaxDataRange(controlValues, $scope.layout.qHyperCube);
					
					/*
						Set a callback to run when the Google Visualization API is loaded.
						This sets the function that loads the chart initially.
					*/
					google.charts.setOnLoadCallback(drawChart);
				});

				/*
					Bind function to the model Validated event which is called when a selection is made.
					Calls drawChart when Validated event is fired.
				*/
				$scope.component.model.Validated.bind(function(){
					drawChart();
				});
		
				/*
					Google charts does not understand how to interpret a qHyperCube object.  
					We need to convert it to something it understands and in this case that is a DataTable.
					
					Function does the following:
						Creates and populates a data table.
						Instantiates the pie chart
						Passes in the data
						Renders the chart
				*/
				function drawChart() {
					console.info("drawChart fired");
					var measureCount = $scope.layout.qHyperCube.qMeasureInfo.length;
					
					// Create and define the data table.
					var dataDef = createDataDef($scope.layout.qHyperCube);
					var firstDataRow = dataDef.firstDataRowDef;
					
					/*
						Create the series information for the measures.
						Series options contain style information for a measure.

						console.info('seriesOptions', seriesOptions);
					*/
					var seriesOptions = createSeriesStyle(measureCount, $scope.layout.qHyperCube);

					/*
						Populate the dataArray with the information from the HyperCube.
						console.info('dataArray',dataArray);
					*/
					var dataArray = [];
					dataArray.push(firstDataRow);
					dataArray = createDataArray(dataArray, $scope.layout.qHyperCube);

					/*
						Retrieve out of control points
					*/
					var outOfControlPoints = outOfControlSignals.getOutOfControlPoints($scope.layout, controlValues, dataArray);

					/*
						Color out of control points
					*/
					outOfControlSignals.colorPoints (dataArray, outOfControlPoints, controlValues.OOCPointColor, controlValues.OOCPointShape, controlValues.OOCPointSize);

					/*
						Convert the dataArray to a dataTable consumable by Google Charts.
					*/
					var dataTableData = google.visualization.arrayToDataTable(dataArray);

					/* 
						Set chart options
						It is important to set the width/height values for the chart and the chart area.
					*/
					var options = {
						chartArea:{
							width: "90%",
						},
						series: seriesOptions,
						vAxes: {
							0: { 
							},
							1: {
								ticks: yMinorTicks,
								gridlines: {
									color: $scope.layout.minorGridlineColor,
									count: 7
								}
							}
						},
						vAxis: {
							viewWindow: {
								min: viewportDims.minVal,
								max: viewportDims.maxVal
							}
						}
					};
					
					// Set Curve smoothing 
					if ($scope.layout.curveSmoothing) {
						options.curveType = "function";
					}
				
					/* 
						Instantiate and draw chart with defined options.
					*/
					var chart = new google.visualization.LineChart(document.getElementById("chart_div"));
					chart.draw(dataTableData, options);

					/*
						Add select event listener to the google visualization.  
						Adding the listener will cause chartSelectHandler to fire when the chart is clicked.
					*/
					google.visualization.events.addListener(chart, "select", chartSelectHandler);
					
					/*
						Function that is called when the google chart select event fires.
						Here we grab the selected chart value and add it to the list of selected countries.
						Adding the value to the field causes the HyperCube Validated event to fire.
					*/
					function chartSelectHandler(e) {
						console.info("chart select fired");
						var item = chart.getSelection();
						var selectedVal = dataTableData.getFormattedValue(item[0].row, 0);
						app.field(dimensionField).selectValues([{qText:selectedVal}], false, false);
					}

					/*
						Set template.html variables
					*/
					$scope.meanValue = (controlValues.Average).toFixed(2);
					$scope.stdDevValue = controlValues.StdDev.toFixed(2);
					$scope.uclValue = controlValues.ThreeStdDevUpper.toFixed(2);
					$scope.lclValue = controlValues.ThreeStdDevLower.toFixed(2);

					console.info("draw end");
				}
			}]
		};
	} );

function createControlValues(layout, avg, stdDev) {
	"use strict";
	var cv = {};
	cv.Field = layout.controlField;
	cv.OOCPointColor = layout.outOfControlPointColor;
	cv.OOCPointShape = layout.outOfControlPointShape;
	cv.OOCPointSize = layout.outOfControlPointSize;
	cv.StdDev = stdDev;
	cv.Average = avg;
	cv.OneStdDevLower = avg - stdDev;
	cv.OneStdDevUpper = avg + stdDev;
	cv.TwoStdDevLower = avg - (2 * stdDev);
	cv.TwoStdDevUpper = avg + (2 * stdDev);
	cv.ThreeStdDevLower = avg - (3 * stdDev);
	cv.ThreeStdDevUpper = avg + (3 * stdDev);
	return cv;
}

function setTicks(avg, stdDev) {
	"use strict";
	var ticks = [ 
		{v: avg, f: "μ" }
		,{v: avg - stdDev, f: "-1σ" }
		,{v: avg + stdDev, f: "+1σ" }
		,{v: avg - (2 * stdDev), f: "-2σ" }
		,{v: avg + (2 * stdDev), f: "+2σ" }
		,{v: avg - (3 * stdDev), f: "-3σ" }
		,{v: avg + (3 * stdDev), f: "+3σ" }
	];
	return ticks;
}

function createSeriesStyle(measureCount, hyperCube) {
	"use strict";
	var so = {};
	var i = 0;
	for (i = 0; i < measureCount; i+=1) {
		so[i] = {};
		so[i].targetAxisIndex = i;
		var measure = hyperCube.qMeasureInfo[i];
		if (measure.lineColor !== undefined && measure.lineColor.length > 0) {
			so[i].color = measure.lineColor;
		}
		if (measure.lineThickness !== undefined) {
			so[i].lineWidth = measure.lineThickness;
		}
		if (measure.lineStyle !== undefined) {
			so[i].lineDashStyle = measure.lineStyle.split(",");
		}
		if (measure.pointSize !== undefined) {
			so[i].pointSize = measure.pointSize;
		}

		if (measure.pointShape !== undefined) {
			if (so[i].pointShape === undefined) {
				so[i].pointShape = {};
			}
			so[i].pointShape.type = measure.pointShape;
		}
		if (measure.pointRotation !== undefined) {
			if (so[i].pointShape === undefined) {
				so[i].pointShape = {};
			}
			so[i].pointShape.rotation = measure.pointRotation;
		}

		so[i].pointsVisible = (measure.pointVisible === true);
	}

	/* Create a series that is used to add the control grid lines */
	so[1] = {};
	so[1].targetAxisIndex = 1;
	so[1].color = "transparent";
	so[1].lineWidth = 0;
	so[1].pointSize = 0;
	so[1].pointsVisible = false;

	return so;
}

/*
	Define the datable columns and populate the first row of the dataTable.
	The first row is the information about the data going into the dataTable.

	console.info('dataRow', dataRow);
	Sample header array:  "Country", "Sum CDR", {'type': 'string', 'role': 'style'}, "LCL", "UCL"
*/
function createDataDef(hyperCube) {
	"use strict";
	var dataDef = {};
	var firstDataRow = [];
	var dataTable = new google.visualization.DataTable();

	// Add Dimension to the data table and values to t
	dataTable.addColumn("string", hyperCube.qDimensionInfo[0].qFallbackTitle);
	firstDataRow.push(hyperCube.qDimensionInfo[0].qFallbackTitle);

	// Add Measures to the data table.  Each measure gets an associated point style column.
	dataTable.addColumn("number", hyperCube.qMeasureInfo[0].qFallbackTitle);
	firstDataRow.push(hyperCube.qMeasureInfo[0].qFallbackTitle);
	firstDataRow.push({"type": "string", "role": "style"});

	// Add Dimension to the data table for the control grid lines
	dataTable.addColumn("number", "dummyCol");
	firstDataRow.push(" ");

	dataDef.dataTableDef = dataTable;
	dataDef.firstDataRowDef = firstDataRow;
	return dataDef;
}

function createDataArray(dataArray, hyperCube) {
	"use strict";
	var dataLen = hyperCube.qDataPages[0].qMatrix.length;
	var colDataLen = 0;
	var dataRow = [];
	var i = 0;
	var j = 0;
	for (i = 0; i < dataLen; i+=1) {
		colDataLen = hyperCube.qDataPages[0].qMatrix[i].length;
		dataRow = [];
		for (j = 0; j < colDataLen; j+=1) {
			/* If qNum is "NaN" and qIsNull is true then push null. */
			if (hyperCube.qDataPages[0].qMatrix[i][j].qNum === "NaN" && hyperCube.qDataPages[0].qMatrix[i][j].qIsNull === true) {
				dataRow.push(null);
			}
			/* If qNum is "NaN" then we access qText because the value is a string.  Otherwise we access qNum for the number value. */
			else if (hyperCube.qDataPages[0].qMatrix[i][j].qNum === "NaN") {
				dataRow.push(hyperCube.qDataPages[0].qMatrix[i][j].qText);
			}
			else {
				dataRow.push(hyperCube.qDataPages[0].qMatrix[i][j].qNum);
			}
		}

		// Push null placeholders.  This null corresponds to the point style column each measure data point has.
		dataRow.push(null);
		// Push dummy data into the row.  This is done for the process control ticks.  The value shoudl be outside of the viewWindow
		// so that the line does not show rollovers accidentally.
		dataRow.push(-1000);
		dataArray.push(dataRow);
	}

	return dataArray;
}

function getMinMaxDataRange(controlValues, hyperCube) {
	var maxVal = controlValues.ThreeStdDevUpper;
	var minVal = controlValues.ThreeStdDevLower;

	var dataLen = hyperCube.qDataPages[0].qMatrix.length;
	var colDataLen = 0;
	var dataRow = [];
	var i = 0;
	var j = 0;
	for (i = 0; i < dataLen; i+=1) {
		colDataLen = hyperCube.qDataPages[0].qMatrix[i].length;
		dataRow = [];
		for (j = 0; j < colDataLen; j+=1) {
			/* If qNum is "NaN" and qIsNull is true then push null. */
			if (hyperCube.qDataPages[0].qMatrix[i][j].qNum === "NaN" && hyperCube.qDataPages[0].qMatrix[i][j].qIsNull === true) {
			}
			/* If qNum is "NaN" then we access qText because the value is a string.  Otherwise we access qNum for the number value. */
			else if (hyperCube.qDataPages[0].qMatrix[i][j].qNum === "NaN") {
			}
			else {
				if (hyperCube.qDataPages[0].qMatrix[i][j].qNum > maxVal) {
					maxVal = hyperCube.qDataPages[0].qMatrix[i][j].qNum;
				}
				else if (hyperCube.qDataPages[0].qMatrix[i][j].qNum < minVal) {
					minVal = hyperCube.qDataPages[0].qMatrix[i][j].qNum;
				}
			}
		}
	}

	return {
		minVal: minVal,
		maxVal: maxVal
	}
}
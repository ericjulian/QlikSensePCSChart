/*global google, define, console, alert, document */
/*eslint no-undef: "error"*/
/*eslint-disable no-console*/

/*
	Use ESLint for syntax validation which is a little less rigid.

	http://eslint.org/demo/

	Known Linting issues which should not impact execution
	135:10 - 'styleArrayIndexes' is assigned a value but never used. (no-unused-vars)
	175:34 - 'e' is defined but never used. (no-unused-vars)
	464:10 - 'colorPointsOutOfControl' is defined but never used. (no-unused-vars)

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

				// Retrieve dimension field name
				var dimensionField = $scope.layout.qHyperCube.qDimensionInfo[0].qGroupFieldDefs[0];

				// Initialize control values object
				var controlValues = createControlValues($scope.layout);

				// Create the hypercube that will calculate the stddev/average
				var controlCubeDef = initProperties.setControlCubeField(initProperties.controlLevelCubeDef, controlValues.Field);

				// Load the Visualization API and the corechart package.
				google.charts.load("current", {"packages":["corechart"]});

				app.createCube( controlCubeDef, function ( reply ) {
					console.info("createCube fired");
					$scope.controlCubeDef = reply;
					controlValues = setControlValues(controlValues, $scope.controlCubeDef.qHyperCube.qDataPages[0].qMatrix[0][1].qNum, $scope.controlCubeDef .qHyperCube.qDataPages[0].qMatrix[0][0].qNum);
					
					/*
						Set a callback to run when the Google Visualization API is loaded.
						This sets the function that loads the chart initially.
					*/
					google.charts.setOnLoadCallback(drawChart);
				});

				/*
					Get a list of all fields and populate them to a dropdown list
				*/
				app.getList("FieldList", function(reply) {
					console.info("getList fired");
					$scope.fieldList = {
						model: null,
						qFieldList: reply.qFieldList
					};
				});
				
				$scope.loadField = function(selectedField) {
					console.info("loadField fired");
					alert(selectedField);
				};

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
					
					// Set the control lines
					var controlLevelOptions = createControlOptions($scope.layout);

					// Create and define the data table.
					var dataDef = createDataDef($scope.layout.qHyperCube, controlLevelOptions, measureCount);
					var firstDataRow = dataDef.firstDataRowDef;

					/*
						Create the series information for the measures.
						Series options contain style information for a measure.

						console.info('seriesOptions', seriesOptions);
					*/
					var seriesOptions = createSeriesStyle(measureCount, $scope.layout.qHyperCube);

					// Add control values values to series options
					seriesOptions = addControlLevelsToSeries(seriesOptions, controlLevelOptions);

					/*
						Populate the dataArray with the information from the HyperCube.
						console.info('dataArray',dataArray);
					*/
					var dataArray = [];
					dataArray.push(firstDataRow);
					dataArray = createDataArray(dataArray, $scope.layout.qHyperCube, controlLevelOptions, controlValues);
					
					/*
						Determine columns with styles.
						Use the first row of the dataArray to see which columns are point style columns and save the indexes.
					*/
					var styleArrayIndexes = determineStyleIndexes(dataArray);

					/*
						Retrieve out of control points
					*/
					var outOfControlPoints = outOfControlSignals.determineSinglePointOutOfControl(controlValues, dataArray, styleArrayIndexes);
					console.info("outOfControlPoints", outOfControlPoints);
					
					/*
						Color out of control points
					*/
					outOfControlSignals.colorPoints (dataArray, outOfControlPoints, controlValues.OOCPointColor);
					console.info("dataArray", dataArray);

					/*
						Convert the dataArray to a dataTable consumable by Google Charts.
					*/
					var dataTableData = google.visualization.arrayToDataTable(dataArray);

					/* 
						Set chart options
						The options would be the basis for the custom panel settings in properties.js.
						The values from set in the properties panel would be set in the options.
						The title below is an example of tying the panel input to the options.
					*/
					console.info("seriesOptions", seriesOptions);
					var options = {
						"width": 600,
						"height": 600,
						series: seriesOptions,
						vAxes: {
							0: { 
							},
							1: {
								ticks: [ {v: 10, f: "-1σ" }, {v: 20, f: "+1σ" }]
							}
						},
						vAxis: {
							viewWindow: {
								min: 0,
								max: 100
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

					console.info("draw end");
				}
			}]
		};
	} );

function createControlOptions(layout) {
	"use strict";
	var clo = {};
	
	clo.average = {};
	clo.oneStdDev = {};
	clo.twoStdDev = {};
	clo.threeStdDev = {};

	clo.average.Active = layout.displayAverage;
	clo.average.LineStyle = layout.averageLineStyle;
	clo.average.LineColor = layout.averageLineColor;
	clo.average.LineThickness = layout.averageLineThickness;
	clo.average.Name = "Average";

	clo.oneStdDev.Active = layout.displayOneStdDev;
	clo.oneStdDev.LineStyle = layout.oneStdDevLineStyle;
	clo.oneStdDev.LineColor = layout.oneStdDevLineColor;
	clo.oneStdDev.LineThickness = layout.oneStdDevLineThickness;
	clo.oneStdDev.Name = "1 σ";
	clo.oneStdDev.Point = "point { fill-color: " + layout.outOfControlPointColor + "; }";

	clo.twoStdDev.Active = layout.displayTwoStdDev;
	clo.twoStdDev.LineStyle = layout.twoStdDevLineStyle;
	clo.twoStdDev.LineColor = layout.twoStdDevLineColor;
	clo.twoStdDev.LineThickness = layout.twoStdDevLineThickness;
	clo.twoStdDev.Name = "2 σ";
	clo.twoStdDev.Point = "point { fill-color: " + layout.outOfControlPointColor + "; }";

	clo.threeStdDev.Active = layout.displayThreeStdDev;
	clo.threeStdDev.LineStyle = layout.threeStdDevLineStyle;
	clo.threeStdDev.LineColor = layout.threeStdDevLineColor;
	clo.threeStdDev.LineThickness = layout.threeStdDevLineThickness;
	clo.threeStdDev.Name = "3 σ";
	clo.threeStdDev.Point = "point { fill-color: " + layout.outOfControlPointColor + "; }";
	return clo;
}

function createControlValues(layout) {
	"use strict";
	var cv = {};
	cv.Field = layout.controlField;
	cv.OOCPointColor = layout.outOfControlPointColor;
	cv.OOCPointShape = layout.outOfControlPointShape;
	cv.Average = undefined;
	cv.StdDev = undefined;
	cv.OneStdDevUpper = undefined;
	cv.OneStdDevLower = undefined;
	cv.TwoStdDevUpper = undefined;
	cv.TwoStdDevLower = undefined;
	cv.ThreeStdDevUpper = undefined;
	cv.ThreeStdDevLower = undefined;
	return cv;
}

function setControlValues(cvs, avg, stdDev) {
	"use strict";
	cvs.StdDev = stdDev;
	cvs.Average = avg;
	cvs.OneStdDevLower = cvs.Average - cvs.StdDev;
	cvs.OneStdDevUpper = cvs.Average + cvs.StdDev;
	cvs.TwoStdDevLower = cvs.Average - (2 * cvs.StdDev);
	cvs.TwoStdDevUpper = cvs.Average + (2 * cvs.StdDev);
	cvs.ThreeStdDevLower = cvs.Average - (3 * cvs.StdDev);
	cvs.ThreeStdDevUpper = cvs.Average + (3 * cvs.StdDev);
	return cvs;
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

	return so;
}

function addControlLevelsToSeries(sOpts, controlLevelOptions) {
	"use strict";
	var controls = ["average", "oneStdDev", "twoStdDev", "threeStdDev"];
	var seriesLen = Object.keys(sOpts).length;
	var targetAxis = 1;
	var i = 0;
	for (i = 0; i < controls.length; i+=1) {
		if (controlLevelOptions[controls[i]].Active) {
			sOpts[seriesLen] = {};
			sOpts[seriesLen].targetAxisIndex = targetAxis;
			if (controls[i] != "average") {
				sOpts[seriesLen + 1] = {};
			}
			if (controlLevelOptions[controls[i]].LineColor !== undefined && controlLevelOptions[controls[i]].LineColor.length > 0) {
				sOpts[seriesLen].color = controlLevelOptions[controls[i]].LineColor;
				if (controls[i] != "average") {
					sOpts[seriesLen + 1].color = controlLevelOptions[controls[i]].LineColor;
				}
			}
			if (controlLevelOptions[controls[i]].LineThickness !== undefined) {
				sOpts[seriesLen].lineWidth = controlLevelOptions[controls[i]].LineThickness;
				if (controls[i] != "average") {
					sOpts[seriesLen + 1].lineWidth = controlLevelOptions[controls[i]].LineThickness;
				}
			}
			if (controlLevelOptions[controls[i]].LineStyle !== undefined) {
				sOpts[seriesLen].lineDashStyle = controlLevelOptions[controls[i]].LineStyle.split(',');
				if (controls[i] != "average") {
					sOpts[seriesLen + 1].lineDashStyle = controlLevelOptions[controls[i]].LineStyle.split(',');
				}
			}
		}
		seriesLen = Object.keys(sOpts).length;
	}

	return sOpts;
}

/*
	Define the datable columns and populate the first row of the dataTable.
	The first row is the information about the data going into the dataTable.

	console.info('dataRow', dataRow);
	Sample header array:  "Country", "Sum CDR", {'type': 'string', 'role': 'style'}, "LCL", "UCL"
*/
function createDataDef(hyperCube, controlLevelOptions, measureCount) {
	"use strict";
	var dataDef = {};
	var firstDataRow = [];
	var dataTable = new google.visualization.DataTable();
	var i = 0;

	// Add Dimension to the data table and values to t
	dataTable.addColumn("string", hyperCube.qDimensionInfo[0].qFallbackTitle);
	firstDataRow.push(hyperCube.qDimensionInfo[0].qFallbackTitle);

	// Add Measures to the data table.  Each measure gets an associated point style column.
	for (i = 0; i < measureCount; i+=1) {
		dataTable.addColumn("number", hyperCube.qMeasureInfo[i].qFallbackTitle);
		firstDataRow.push(hyperCube.qMeasureInfo[i].qFallbackTitle);
		firstDataRow.push({"type": "string", "role": "style"});
	}

	/*
		Add the control line columns to the row if they are active.
		One upper and one for lower control.
	*/
	if (controlLevelOptions.average.Active) {
		dataTable.addColumn("number", controlLevelOptions.average.Name);
		firstDataRow.push(controlLevelOptions.average.Name);
	}
	if (controlLevelOptions.oneStdDev.Active) {
		dataTable.addColumn("number", controlLevelOptions.oneStdDev.Name);
		firstDataRow.push(controlLevelOptions.oneStdDev.Name);
		dataTable.addColumn("number", controlLevelOptions.oneStdDev.Name);
		firstDataRow.push(controlLevelOptions.oneStdDev.Name);
	}
	if (controlLevelOptions.twoStdDev.Active) {
		dataTable.addColumn("number", controlLevelOptions.twoStdDev.Name);
		firstDataRow.push(controlLevelOptions.twoStdDev.Name);
		dataTable.addColumn("number", controlLevelOptions.twoStdDev.Name);
		firstDataRow.push(controlLevelOptions.twoStdDev.Name);
	}
	if (controlLevelOptions.threeStdDev.Active) {
		dataTable.addColumn("number", controlLevelOptions.threeStdDev.Name);
		firstDataRow.push(controlLevelOptions.threeStdDev.Name);
		dataTable.addColumn("number", controlLevelOptions.threeStdDev.Name);
		firstDataRow.push(controlLevelOptions.threeStdDev.Name);
	}

	dataDef.dataTableDef = dataTable;
	dataDef.firstDataRowDef = firstDataRow;
	return dataDef;
}

function createDataArray(dataArray, hyperCube, controlLevelOptions, controlValues) {
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
			/* If qNum is "Nan" and qIsNull is true then push null. */
			if (hyperCube.qDataPages[0].qMatrix[i][j].qNum === "NaN" && hyperCube.qDataPages[0].qMatrix[i][j].qIsNull === true) {
				dataRow.push(null);
			}
			/* If qNum is "Nan" then we access qText because the value is a string.  Otherwise we access qNum for the number value. */
			else if (hyperCube.qDataPages[0].qMatrix[i][j].qNum === "NaN") {
				dataRow.push(hyperCube.qDataPages[0].qMatrix[i][j].qText);
			}
			else {
				dataRow.push(hyperCube.qDataPages[0].qMatrix[i][j].qNum);
			}
		}

		// Push null placeholders.  This null corresponds to the point style column each measure data point has.
		dataRow.push(null);
		
		// Add control values if they are active
		if (controlLevelOptions.average.Active) {
			dataRow.push(controlValues.Average);
		}
		if (controlLevelOptions.oneStdDev.Active) {
			dataRow.push(controlValues.OneStdDevUpper);
			dataRow.push(controlValues.OneStdDevLower);
		}
		if (controlLevelOptions.twoStdDev.Active) {
			dataRow.push(controlValues.TwoStdDevUpper);
			dataRow.push(controlValues.TwoStdDevLower);
		}
		if (controlLevelOptions.threeStdDev.Active) {
			dataRow.push(controlValues.ThreeStdDevUpper);
			dataRow.push(controlValues.ThreeStdDevLower);
		}
		dataArray.push(dataRow);
	}

	return dataArray;
}

function determineStyleIndexes(dataArray) {
	"use strict";
	var styleArrayIndexes = [];
	var i = 0;
	var j = 0;
	for (i = 0; i < 1; i+=1) {
		for (j = 0; j <  dataArray[0].length; j+=1) {
			if (dataArray[i][j].role !== undefined) {
				styleArrayIndexes.push(j);
			}
		}
	}
	return styleArrayIndexes;
}
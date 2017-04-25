/*global google, define, console, alert, document */
/*eslint no-undef: "error"*/
/*eslint-disable no-console*/

/*
	Known Linting issues which should not impact execution
	175:34 - 'e' is defined but never used. (no-unused-vars)

	These changes have been made but haven't been tested so you could look into this functionality and 
	fix the problem if it exists.
		Put these options under the out of control points section
		One out of control point color setting.
		One out of control point shape setting.

	Enhancements
		- Better handling of different types of dimensions
			- Year
			- Date
			- Time
			- Text
			- Use qTags in qDimensinoInfo to determine integer/numeric/text/ASCII default to text
			OR Use qDimensionType where D is discrete(string), N is numeric, and T is for timestamp
		- Move certain properties out into the interface to make more interactive.
*/

define( ["qlik", "text!./template.html", "./properties", "./initialProperties", "./outOfControlSignals", "//www.gstatic.com/charts/loader.js"],
	function (qlik, htmlTemplate, propertiesPanel, initProperties, outOfControlSignals) {
		"use strict";
		/*
			These are important console debug statements.  If there are JavaScript errors in either of these files the extension will not render.
			These variables will be undefined if there is a JavaScript error.  Use ESLint to find the JavaScript error.

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
			resize: function($element, layout) {
				console.info("resize fired");
				this.$scope.drawGoogleChart();
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

				// Major grid line display flag
				var majorGridLineDisplay = $scope.layout.displayMajorGridLines ? "#cccccc" : "transparent"

				// Load the Visualization API and the corechart package.
				google.charts.load("current", {"packages":["corechart"]});

				$scope.drawGoogleChart = function() {
					drawChart($scope, outOfControlSignals, controlValues, majorGridLineDisplay, yMinorTicks, viewportDims);
				};

				app.createCube( controlCubeDef, function ( reply ) {
					console.info("createCube fired");
					$scope.controlCubeDef = reply;
					controlValues = createControlValues($scope.layout, $scope.controlCubeDef.qHyperCube.qDataPages[0].qMatrix[0][1].qNum, $scope.controlCubeDef .qHyperCube.qDataPages[0].qMatrix[0][0].qNum);
					yMinorTicks = setTicks($scope.controlCubeDef.qHyperCube.qDataPages[0].qMatrix[0][1].qNum, $scope.controlCubeDef.qHyperCube.qDataPages[0].qMatrix[0][0].qNum, $scope.layout.displayOneAndTwoStdDev);
					viewportDims = getMinMaxDataRange(controlValues, $scope.layout.qHyperCube);

					/*
						Set a callback to run when the Google Visualization API is loaded.
						This sets the function that loads the chart initially.
					*/
					google.charts.setOnLoadCallback($scope.drawGoogleChart);
				});

				/*
					Bind function to the model Validated event which is called when a selection is made.
					Calls drawChart when Validated event is fired.
				*/
				$scope.component.model.Validated.bind(function(){
					console.info("model validated fired")
					$scope.drawGoogleChart();
				});
			}]
		};
	}
);

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

function setTicks(avg, stdDev, showOneTwoSTDev) {
	"use strict";
	if (showOneTwoSTDev) {
		return [ 
			{v: avg, f: "μ" }
			,{v: avg - stdDev, f: "-1σ" }
			,{v: avg + stdDev, f: "+1σ" }
			,{v: avg - (2 * stdDev), f: "-2σ" }
			,{v: avg + (2 * stdDev), f: "+2σ" }
			,{v: avg - (3 * stdDev), f: "-3σ" }
			,{v: avg + (3 * stdDev), f: "+3σ" }
		];
	}
	else {
		return [ 
			{v: avg, f: "μ" }
			,{v: avg - (3 * stdDev), f: "-3σ" }
			,{v: avg + (3 * stdDev), f: "+3σ" }
		];
	}
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
function createDataDef(hyperCube, dimensionColType) {
	"use strict";
	var dataDef = {};
	var firstDataRow = [];
	var dataTable = new google.visualization.DataTable();

	// Add Dimension to the data table and values to 
	dataTable.addColumn(dimensionColType, hyperCube.qDimensionInfo[0].qFallbackTitle);
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

function createDataArray(dataArray, hyperCube, dimensionType) {
	console.info("createDataArray fired");
	
	var dataLen = hyperCube.qDataPages[0].qMatrix.length;
	var colDataLen = hyperCube.qDimensionInfo.length + hyperCube.qMeasureInfo.length;
	var dataRow = [];
	var i = 0;
	var j = 0;
	for (i = 0; i < dataLen; i+=1) {
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
				if (j !== 0 ) {
					dataRow.push(hyperCube.qDataPages[0].qMatrix[i][j].qNum);
				}
				else {
					// Special handling for date formats
					// Convert timestamp to UNIX EPOCH and then convert to milliseconds
					// Timestamp and time are ascii/text and don't require special formatting.
					if (dimensionType === "date") {
						var dateMilli = (hyperCube.qDataPages[0].qMatrix[i][j].qNum - 25569) * 86400 * 1000;
						dataRow.push(new Date(dateMilli));
					}
					else {
						dataRow.push(hyperCube.qDataPages[0].qMatrix[i][j].qNum);
					}
				}
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
/*
	Retrieves the min max values using data from the hypercube as well as the
	control values.  This is used to generat the viewport for the chart.
*/
function getMinMaxDataRange(controlValues, hyperCube) {
	var maxVal = controlValues.ThreeStdDevUpper;
	var minVal = controlValues.ThreeStdDevLower;
	var dimensionNum = hyperCube.qDimensionInfo.length;
	var dataLen = hyperCube.qDataPages[0].qMatrix.length;
	var colDataLen = hyperCube.qDimensionInfo.length + hyperCube.qMeasureInfo.length
	var i = 0;
	var j = 0;
	for (i = 0; i < dataLen; i+=1) {
		for (j = dimensionNum; j < colDataLen; j+=1) {
			if  (hyperCube.qDataPages[0].qMatrix[i][j].qNum !== "NaN" || hyperCube.qDataPages[0].qMatrix[i][j].qIsNull !== true) {
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

/*
	Google charts does not understand how to interpret a qHyperCube object.  
	We need to convert it to something it understands and in this case that is a DataTable.
	
	Function does the following:
		Creates and populates a data table.
		Instantiates the pie chart
		Passes in the data
		Renders the chart
*/
function drawChart(scope, outOfControlSignals, controlValues, majorGridLineDisplay, yMinorTicks, viewportDims) {
	console.info("drawChart fired");

	var measureCount = scope.layout.qHyperCube.qMeasureInfo.length;
	
	// Dimension display type
	var dimensionInfo = determineDimensionInfo(scope.layout.qHyperCube.qDimensionInfo[0]);

	// Create and define the data table.
	var dataDef = createDataDef(scope.layout.qHyperCube, dimensionInfo.dataTableColType);
	var firstDataRow = dataDef.firstDataRowDef;
	
	/*
		Create the series information for the measures.
		Series options contain style information for a measure.

		console.info('seriesOptions', seriesOptions);
	*/
	var seriesOptions = createSeriesStyle(measureCount, scope.layout.qHyperCube);

	/*
		Populate the dataArray with the information from the HyperCube.
		console.info('dataArray',dataArray);
	*/
	var dataArray = [];
	dataArray.push(firstDataRow);
	dataArray = createDataArray(dataArray, scope.layout.qHyperCube, dimensionInfo.dataTableColType);

	/*
		Retrieve out of control points
	*/
	var outOfControlPoints = outOfControlSignals.getOutOfControlPoints(scope.layout, controlValues, dataArray);

	/*
		Color out of control points
	*/
	outOfControlSignals.colorPoints (dataArray, outOfControlPoints, controlValues.OOCPointColor, controlValues.OOCPointShape, controlValues.OOCPointSize);

	/*
		Convert the dataArray to a dataTable consumable by Google Charts.
	*/
	var dataTableData = google.visualization.arrayToDataTable(dataArray);
	console.info("data table created");
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
				gridlines: {
					color: majorGridLineDisplay
				}
			},
			1: {
				ticks: yMinorTicks,
				gridlines: {
					color: scope.layout.minorGridlineColor,
					count: 7
				}
			}
		},
		vAxis: {
			viewWindow: {
				min: viewportDims.minVal,
				max: viewportDims.maxVal
			}
		},
		hAxis: dimensionInfo.labelFormat
	};
	
	// Set Curve smoothing 
	if (scope.layout.curveSmoothing) {
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
	scope.meanValue = (controlValues.Average).toFixed(2);
	scope.stdDevValue = controlValues.StdDev.toFixed(2);
	scope.uclValue = controlValues.ThreeStdDevUpper.toFixed(2);
	scope.lclValue = controlValues.ThreeStdDevLower.toFixed(2);
}
/*
	Not mapping all fields to data table types because datetime and timeofday come back as text types.3

	{format:'#,###%'}
    {format: 'none'}: displays numbers with no formatting (e.g., 8000000)
    {format: 'decimal'}: displays numbers with thousands separators (e.g., 8,000,000)
    {format: 'scientific'}: displays numbers in scientific notation (e.g., 8e6)
    {format: 'currency'}: displays numbers in the local currency (e.g., $8,000,000.00)
    {format: 'percent'}: displays numbers as percentages (e.g., 800,000,000%)
    {format: 'short'}: displays abbreviated numbers (e.g., 8M)
    {format: 'long'}: displays numbers as full words (e.g., 8 million)

	AddColumn DataTable supported types
	'string', 'number', 'boolean', 'date', 'datetime', and 'timeofday'.
*/
function determineDimensionInfo(dimInfo) {
	var dimType = dimInfo.qDimensionType;
	var dimTagsArray = dimInfo.qTags;
	var dimDecimalPlaces = dimInfo.qNumFormat.qnDec;
	var format = {format: 'none'};
	var columnType = "string";
	
	if (dimTagsArray.indexOf("$date") >= 0) {
		format = {format: 'M/d/yy'};
		columnType = "date";
	}
	else if (dimTagsArray.indexOf("$integer") >= 0) {
		format = {format: '#'};
		columnType = "number";
	}
	else if (dimTagsArray.indexOf("$numeric") >= 0) {
		format = {format: 'decimal'};
		columnType = "number";
	}

	return {
		labelFormat: format,
		dataTableColType: columnType
	};
}
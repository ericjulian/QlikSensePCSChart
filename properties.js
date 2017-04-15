/*global define */

/* 
	Use ESLint for syntax validation which is a little less rigid.

	http://eslint.org/demo/
	
	Creates a custom appearenc panel which contains
		- General chart display options
		- Process Control Line Options
		- Out of control signal options
	
	Creates Custom options for the measures
		- Line style options
		- Point style options
*/
define(["./propertyUtils"], function (propUtil) {
    "use strict";

	/* Create point shape options array */
	var pointShapeOptionsArray = [];
	pointShapeOptionsArray.push(propUtil.createOption("Circle", "circle"));
	pointShapeOptionsArray.push(propUtil.createOption("Triangle", "triangle"));
	pointShapeOptionsArray.push(propUtil.createOption("Square", "square"));
	pointShapeOptionsArray.push(propUtil.createOption("Diamond", "diamond"));
	pointShapeOptionsArray.push(propUtil.createOption("Star", "star"));
	pointShapeOptionsArray.push(propUtil.createOption("Polygon", "polygon"));
	/* General chart options */
	var curveSmoothing = propUtil.createSwitch ("curveSmoothing", "Curve Smoothing", false);
	var controlField = propUtil.createField("controlField", "Control Field", "string", "optional","");
	var minorGridlineColor = propUtil.createField("minorGridlineColor", "Gridline Color", "string", "optional","#999999");
	//var displayAverage = propUtil.createSwitch ("displayAverage", "Display Average", false);
	//var displayOneStdDev = propUtil.createSwitch ("displayOneStdDev", "Display One Std Dev", false);
	//var displayTwoStdDev = propUtil.createSwitch ("displayTwoStdDev", "Display Two Std Dev", false);
	//var displayThreeStdDev = propUtil.createSwitch ("displayThreeStdDev", "Display Three Std Dev", false);
	/* Create item panel */
	var configItems = propUtil.createItem("items", "Chart Configuration");
	configItems.items["ConfigCurveSmoothing"] = curveSmoothing;
	configItems.items["ConfigControlField"] = controlField;
	configItems.items["ConfigGridlineColorField"] = minorGridlineColor;
	//configItems.items["ConfigDisplayAverage"] = displayAverage;
	//configItems.items["ConfigDisplayOneStdDev"] = displayOneStdDev;
	//configItems.items["ConfigDisplayTwoStdDev"] = displayTwoStdDev;
	//configItems.items["ConfigDisplayThreeStdDev"] = displayThreeStdDev;

	/* Point Options */
	var pointShape = propUtil.createDropDown ('qDef.pointShape', "Point Shape", "string", pointShapeOptionsArray, '');
	pointShape.defaultValue = 'circle'; // This is necessary.  There is something about the single quotes when injecting items into the measure panel.
	var pointSize = propUtil.createField('qDef.pointSize', "Point Size", "integer", "optional", 5);
	var pointRotation = propUtil.createSwitch('qDef.pointRotation', "Point Rotation", false);
	var pointVisible = propUtil.createSwitch('qDef.pointVisible', "Point Visibility", true);
	/* Create item panel */
	var pointItems = propUtil.createItem("items", "Point Options");
	pointItems.items["PointVisibleProp"] = pointVisible;
	pointItems.items["PointShapeProp"] = pointShape;
	pointItems.items["PointSizeProp"] = pointSize;
	pointItems.items["PointRotationProp"] = pointRotation;

	/* Measure Line Configuration */
	var lineStyle = propUtil.createField('qDef.lineStyle', "Line Style", "string", "optional", '0,0');
	var lineColor = propUtil.createField('qDef.lineColor', "Line Color", "string", "optional", '#0c9900');
	var lineThickness = propUtil.createField('qDef.lineThickness', "Line Thickness", "integer", "optional", 3);
	/* Create item panel */
	var lineItems = propUtil.createItem("items", "Line Options");
	lineItems.items["LineStyleProp"] = lineStyle;
	lineItems.items["LineColorProp"] = lineColor;
	lineItems.items["LineThicknessProp"] = lineThickness;

	/* Out of Control Signals */
	var singlePointOutsideUCLLCL = propUtil.createSwitch ("singlePointOutsideUCLLCL", "A single point outside the control limits.", false);
	var twoOfThreeSuccessivePoints = propUtil.createSwitch ("twoOfThreeSuccessivePoints", "Two out of three successive points are on the same side of the centerline and farther than 2 σ from it.", false);
	var fourOutOfFivePoints = propUtil.createSwitch ("fourOutOfFivePoints", "Four out of five successive points are on the same side of the centerline and farther than 1 σ from it.", false);
	var eightInARowONSameSideOfCenter = propUtil.createSwitch ("eightInARowONSameSideOfCenter", "A run of eight in a row are on the same side of the centerline. Or 10 out of 11, 12 out of 14 or 16 out of 20.", false);
	var outOfControlPointColor = propUtil.createField("outOfControlPointColor", "Point Color", "string", "optional", "#ff0000");
	var outOfControlPointShape = propUtil.createDropDown ("outOfControlPointShape", "Point Shape", "string", pointShapeOptionsArray, 'circle');
	var outOfControlPointSize = propUtil.createField("outOfControlPointSize", "Point Size", "string", "optional", 7);
	/* Create item panel */
	var outOfControlItems = propUtil.createItem("items", "Out-of-control signals");
	outOfControlItems.items["OutOfControlPointColorProp"] = outOfControlPointColor;
	outOfControlItems.items["OutOfControlPointSizeProp"] = outOfControlPointSize;
	outOfControlItems.items["OutOfControlPointShapeProp"] = outOfControlPointShape;
	outOfControlItems.items["SinglePointOutsideUCLLCLProp"] = singlePointOutsideUCLLCL;
	outOfControlItems.items["TwoOfThreeSuccessivePointsProp"] = twoOfThreeSuccessivePoints;
	outOfControlItems.items["fourOutOfFivePointsProp"] = fourOutOfFivePoints;
	outOfControlItems.items["EightInARowONSameSideOfCenterProp"] = eightInARowONSameSideOfCenter;

    // *****************************************************************************
    // Appearance Section
    // *****************************************************************************
    var appearanceSection = {
        uses: "settings",
		items: {
			GeneralChartOptions: configItems,
			OutOfControlSignalOptions: outOfControlItems
		}
    };
	
    // *****************************************************************************
    // Main property panel definition
    // ~~
    // Only what's defined here will be returned from properties.js
    // *****************************************************************************
    return {
        type: "items",
        component: "accordion",
        items: {
			dimensions: {
				uses: "dimensions",
				min: 1,
				max: 10
			},
			measures: {
				uses: "measures",
				min: 1,
				max: 1,
				items: {
					PointOptions: pointItems,
					LineOptions: lineItems
				}
			},
			appearance: appearanceSection
        }
    };
});
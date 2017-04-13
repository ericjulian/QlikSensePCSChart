/*global define */

/*
	Use ESLint for syntax validation which is a little less rigid.

	http://eslint.org/demo/

	Creates two hypercubes

	1) chartHyperCubeDef is for the chart and displays the data specified in the qMeasures
	2) controlLevelCubeDef is for calculating the UCL/LCL control data
*/
define([], function () {
    "use strict";
    return {
		chartHyperCubeDef : {
			version: 1.0,
			qHyperCubeDef: {
				qDimensions: [],
				qMeasures: [],
				qInitialDataFetch: [{
					qWidth: 10,
					qHeight: 500
				}]
			}
		},
		controlLevelCubeDef : {
			qDimensions: [],
			qMeasures: [{
				qDef: {
					qDef: "=Stdev(total aggr(avg({{controlField}}), {{dimension}}))"
				}
			},
			{
				qDef: {
					qDef: "=Avg({{controlField}})"
				}
			},
			{
				qDef: {
					qDef: "=AVG(Max({{controlField}}) - Min({{controlField}}))" // Average Range
				}
			}],
			qInitialDataFetch: [{
				qTop: 0,
				qLeft: 0,
				qHeight: 1,
				qWidth: 2
			}]
		}
		,setControlCubeField : function(cube, controlField, dimension) {
			cube.qMeasures[0].qDef.qDef = cube.qMeasures[0].qDef.qDef.replace("{{controlField}}", controlField);
			cube.qMeasures[0].qDef.qDef = cube.qMeasures[0].qDef.qDef.replace("{{dimension}}", dimension);
			cube.qMeasures[1].qDef.qDef = cube.qMeasures[1].qDef.qDef.replace("{{controlField}}", controlField);
			return cube;
		}
    };
});
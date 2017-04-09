/*global define */

define([], function () {
    "use strict";
    return {
        /*
            This is for the first type of out of control where a point is outside of the UCL/LCL.

            1) A single point outside the control limits.

            Two out of three successive points are on the same side of the centerline and farther than 2 σ from it.
            Four out of five successive points are on the same side of the centerline and farther than 1 σ from it.
            A run of eight in a row are on the same side of the centerline. Or 10 out of 11, 12 out of 14 or 16 out of 20.
        */
        determineSinglePointOutOfControl : function (controlValues, dataArray, styleArrayIndexes) {
            "use strict";
            var arrayLength = dataArray.length;
            var indexes = styleArrayIndexes.length;
            var pointsToColor = [];

            for (var i = 0; i < arrayLength; i++) {
                for (var j = 0; j < indexes; j++) {
                    if (dataArray[i][styleArrayIndexes[j] - 1] < controlValues.ThreeStdDevLower) {
                        pointsToColor.push(this.colorPointObj(i, styleArrayIndexes[j], false, true));
                    }
                    if (dataArray[i][styleArrayIndexes[j] - 1] > controlValues.ThreeStdDevUpper) {
                        pointsToColor.push(this.colorPointObj(i, styleArrayIndexes[j], true, false));
                    }
                }
            }

            return pointsToColor;
        },
        /*
            Two out of three successive points are on the same side of the centerline and farther than 2 σ from it.

            Four out of five successive points are on the same side of the centerline and farther than 1 σ from it.
            A run of eight in a row are on the same side of the centerline. Or 10 out of 11, 12 out of 14 or 16 out of 20.
        */
        determineTwoOfThreePointsOutOfControl: function (controlValues, dataArray, styleArrayIndexes) {
            "use strict";
            var arrayLength = dataArray.length;
            var indexes = styleArrayIndexes.length;
            var pointsQueue = [];
            var runningTotalUpper = 0;
            var runningTotalLower = 0;
            var pointsToColor = [];

            for (var i = 0; i < arrayLength; i++) {
                for (var j = 0; j < indexes; j++) {

                    if (dataArray[i][styleArrayIndexes[j] - 1] > controlValues.Average && dataArray[i][styleArrayIndexes[j] - 1] > controlValues.TwoStdDevUpper) {
                        // greater than average and further than 2 STD from it.
                        pointsQueue.push(this.colorPointObj(i, styleArrayIndexes[j], true, false));
                        runningTotalUpper++;
                    }
                    else if (dataArray[i][styleArrayIndexes[j] - 1] < controlValues.Average && dataArray[i][styleArrayIndexes[j] - 1] < controlValues.TwoStdDevUpper) {
                        // less than average and further than 2 STD from it.
                        pointsQueue.push(this.colorPointObj(i, styleArrayIndexes[j], false, true));
                        runningTotalLower++;
                    }
                    else {
                        pointsQueue.push(this.colorPointObj(i, styleArrayIndexes[j], false, false));
                    }

                    // eval points
                    if (runningTotalUpper > 1 || runningTotalLower > 1) {
                        for (var k = 0; k < pointsQueue.length; k++) {
                            pointsToColor.push(pointsQueue[0]);
                            pointsToColor.push(pointsQueue[1]);
                            pointsToColor.push(pointsQueue[2]);
                        }
                    }

                    // Pop the queue
                    var popped = pointsQueue.pop();
                    if (popped.outOfControlUpper) {
                        runningTotalUpper--;
                    }
                    if (popped.outOfControlLower) {
                        runningTotalLower--;
                    }
                }
            }
        },
        colorPoints: function (dataArray, outOfControlPoints, oocPointColr) {
            var arrayLength = outOfControlPoints.length;
            var pointStyle = "point { fill-color: " + oocPointColr + "; }";
            for (var i = 0; i < arrayLength; i++) {
                dataArray[outOfControlPoints[i].dataIndex][outOfControlPoints[i].styleIndex] = pointStyle;
            }
        },
        colorPointObj: function (dataIndexVal, styleIndexVal, oocUpper, oocLower) {
            return {
                dataIndex: dataIndexVal,
                styleIndex: styleIndexVal,
                outOfControlUpper: oocUpper,
                outOfControlLower: oocLower
            };
        }
    }
})


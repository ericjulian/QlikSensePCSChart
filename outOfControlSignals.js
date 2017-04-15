/*global define */

define([], function () {
    "use strict";
    return {
        getOutOfControlPoints: function (layout, controlValues, dataArray) {
            var points = [];
            if (layout.singlePointOutsideUCLLCL === true) {
                points = this.determineSinglePointOutOfControl(controlValues, dataArray);
            }

            if (layout.twoOfThreeSuccessivePoints === true) {
                points = points.concat(this.determineXOfYPointsOutOfControl(controlValues.Average, dataArray, controlValues.TwoStdDevUpper, controlValues.TwoStdDevLower, 2, 3));
            }

            if (layout.fourOutOfFivePoints === true) {
                points = points.concat(this.determineXOfYPointsOutOfControl(controlValues.Average, dataArray, controlValues.OneStdDevUpper, controlValues.OneStdDevLower, 4, 5));
            }

            if (layout.eightInARowONSameSideOfCenter === true) {
                points = points.concat(this. determineRunOfXPointsOutOfControl(controlValues.Average, dataArray, 8));
            }
            return points;
        },
        /*
            This is for the first type of out of control where a point is outside of the UCL/LCL.

            1) A single point outside the control limits.

            Two out of three successive points are on the same side of the centerline and farther than 2 σ from it.
            Four out of five successive points are on the same side of the centerline and farther than 1 σ from it.
            A run of eight in a row are on the same side of the centerline. Or 10 out of 11, 12 out of 14 or 16 out of 20.
        */
        determineSinglePointOutOfControl : function (controlValues, dataArray) {
            "use strict";
            var arrayLength = dataArray.length;
            var pointsToColor = [];
            var styleIndex = 2;
            var dataArrayStartIndex = 1;

            for (var i = dataArrayStartIndex; i < arrayLength; i++) {
                if (dataArray[i][styleIndex-1] < controlValues.ThreeStdDevLower) {
                    pointsToColor.push(this.colorPointObj(i, styleIndex, false, true));
                }
                if (dataArray[i][styleIndex-1] > controlValues.ThreeStdDevUpper) {
                    pointsToColor.push(this.colorPointObj(i, styleIndex, true, false));
                }
            }
            
            return pointsToColor;
        },
        /*
            This method is used to determine when a run of a certain number of points in a row are above the mean.
            
            The values are all configurable so I could do 4 out of 5 and more than 2 STD away from the mean.
            Example Call: determineXOfYPointsOutOfControl: function (10, dataArray, 20, 0, 4, 5);
        */
        determineXOfYPointsOutOfControl: function (avgVal, dataArray, stdDevValUpper, stdDevValLower, outOfControlPointCount, outOfControlPointCountTotal) {
            "use strict";
            var arrayLength = dataArray.length;
            var pointsQueue = [];
            var runningTotalUpper = 0;
            var runningTotalLower = 0;
            var pointsToColor = [];
            var styleIndex = 2;
            var dataArrayStartIndex = 1;

            for (var i = dataArrayStartIndex; i < arrayLength; i++) {
                if (dataArray[i][styleIndex - 1] > avgVal && dataArray[i][styleIndex - 1] > stdDevValUpper) {
                    // greater than average and further than 2 STD from it.
                    pointsQueue.push(this.colorPointObj(i, styleIndex, true, false));
                    runningTotalUpper++;
                }
                else if (dataArray[i][styleIndex - 1] < avgVal && dataArray[i][styleIndex - 1] < stdDevValLower) {
                    // less than average and further than 2 STD from it.
                    pointsQueue.push(this.colorPointObj(i, styleIndex, false, true));
                    runningTotalLower++;
                }
                else {
                    pointsQueue.push(this.colorPointObj(i, styleIndex, false, false));
                }

                // Check the number of points that satisfy the rule above if x of y satisfy then push the point so that it will
                //  be marked as OOC.
                if (runningTotalUpper == outOfControlPointCount || runningTotalLower== outOfControlPointCount) {
                    pointsToColor.push(this.colorPointObj(i, styleIndex, false, false));
                }
                
                // Pop the queue if it gets to the maximum value we are allowed to evaluate.
                // Decrement counts based on the type of point popped off of the queue.
                if (pointsQueue.length == outOfControlPointCountTotal) {
                    var popped = pointsQueue.pop();
                    if (popped.outOfControlUpper) {
                        runningTotalUpper--;
                    }
                    if (popped.outOfControlLower) {
                        runningTotalLower--;
                    }
                }
            }
            return pointsToColor;
        },
        determineRunOfXPointsOutOfControl: function (avgVal, dataArray, runSize) {
            "use strict";
            var arrayLength = dataArray.length;
            var pointsQueue = [];
            var runningTotalUpper = 0;
            var runningTotalLower = 0;
            var pointsToColor = [];
            var styleIndex = 2;
            var dataArrayStartIndex = 1;

            for (var i = dataArrayStartIndex; i < arrayLength; i++) {
                if (dataArray[i][styleIndex - 1] > avgVal) {
                    if (runningTotalLower > 0) {
                        // The lower run has been broken so reset
                        pointsQueue = [];
                        runningTotalLower = 0;
                    }

                    // Push the point and increment upper
                    pointsQueue.push(this.colorPointObj(i, styleIndex, true, false));
                    runningTotalUpper++;
                }
                else if (dataArray[i][styleIndex - 1] < avgVal) {
                    if (runningTotalUpper > 0) {
                        // The upper run has been broken so reset
                        pointsQueue = [];
                        runningTotalUpper = 0;
                    }

                    // Push the point and increment upper
                    pointsQueue.push(this.colorPointObj(i, styleIndex, true, false));
                    runningTotalLower++;
                }
                else {
                    // Point is on the mean so we reset everything
                    pointsQueue = [];
                    runningTotalUpper = 0;
                    runningTotalLower = 0;
                }

                // Check the number of points that satisfy the rule above if x of y satisfy then push the point so that it will
                //  be marked as OOC.
                if (runningTotalLower == runSize || runningTotalUpper == runSize) {
                    pointsToColor.push(this.colorPointObj(i, styleIndex, false, false));
                }
                
                // Pop the queue if it gets to the maximum value we are allowed to evaluate.
                // Decrement counts based on the type of point popped off of the queue.
                if (pointsQueue.length == runSize) {
                    var popped = pointsQueue.pop();
                    if (popped.outOfControlUpper) {
                        runningTotalUpper--;
                    }
                    if (popped.outOfControlLower) {
                        runningTotalLower--;
                    }
                }
            }
            return pointsToColor;
        },
        colorPoints: function (dataArray, outOfControlPoints, oocPointColor, oocPointShape, oocPointSize) {
            var arrayLength = outOfControlPoints.length;
            var pointStyle = "point { fill-color: " + oocPointColor + "; shape-type: " + oocPointShape + "; size: " + oocPointSize + "; }";
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


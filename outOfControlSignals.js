/*global define */

/*
    OOC rules based on https://en.wikipedia.org/wiki/Western_Electric_rules
*/
define([], function () {
    "use strict";
    return {
        /*
            Rules are activated based on property settings.
        */
        getOutOfControlPoints: function (layout, controlValues, dataArray) {
            var points = [];
            // Rule 1
            if (layout.singlePointOutsideUCLLCL === true) {
                points = this.determineSinglePointOutOfControl(controlValues, dataArray);
            }
            // Rule 2
            if (layout.twoOfThreeSuccessivePoints === true) {
                points = points.concat(this.determineXOfYPointsOutOfControl(controlValues.Average, dataArray, controlValues.TwoStdDevUpper, controlValues.TwoStdDevLower, 2, 3));
            }
            // Rule 3
            if (layout.fourOutOfFivePoints === true) {
                points = points.concat(this.determineXOfYPointsOutOfControl(controlValues.Average, dataArray, controlValues.OneStdDevUpper, controlValues.OneStdDevLower, 4, 5));
            }
            // Rule 4
            if (layout.eightInARowONSameSideOfCenter === true) {
                points = points.concat(this. determineRunOfXPointsOutOfControl(controlValues.Average, dataArray, 8));
            }
            return points;
        },
        /*
            A single point outside the upper/lower control limits.
        */
        determineSinglePointOutOfControl : function (controlValues, dataArray) {
            "use strict";
            var arrayLength = dataArray.length;
            var pointsToColor = [];
            var styleIndex = 2;
            var dataArrayStartIndex = 1;

            for (var i = dataArrayStartIndex; i < arrayLength; i++) {
                if (dataArray[i][styleIndex-1] < controlValues.ThreeStdDevLower) {
                    pointsToColor.push(this.pointObj(i, styleIndex, false, true));
                }
                if (dataArray[i][styleIndex-1] > controlValues.ThreeStdDevUpper) {
                    pointsToColor.push(this.pointObj(i, styleIndex, true, false));
                }
            }
            
            return pointsToColor;
        },
        /*
            This method is used to determine when X of Y points are more than Z standard deviation away from the mean.

            Example Call: determineXOfYPointsOutOfControl: function (10, dataArray, OneStdDevUpper, OneStdDevLower, 4, 5);

            This call will look for four of five points greater than one standard deviation from the mean.
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
                    // greater than average and further than Z standard deviations from the mean.
                    pointsQueue.push(this.pointObj(i, styleIndex, true, false));
                    runningTotalUpper++;
                }
                else if (dataArray[i][styleIndex - 1] < avgVal && dataArray[i][styleIndex - 1] < stdDevValLower) {
                    // less than average and further than Z standard deviations from the mean.
                    pointsQueue.push(this.pointObj(i, styleIndex, false, true));
                    runningTotalLower++;
                }
                else {
                    pointsQueue.push(this.pointObj(i, styleIndex, false, false));
                }

                // Check the number of points that satisfy the rule above if x of y satisfy then push the point so that it will
                //  be marked as OOC.
                if (runningTotalUpper == outOfControlPointCount || runningTotalLower == outOfControlPointCount) {
                    pointsToColor.push(this.pointObj(i, styleIndex, false, false));
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
        /*
            This method is used to check for runs of a certain number of points on a specific side of the mean.

            Example: determineRunOfXPointsOutOfControl(10, dataArray, 8);
        */
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
                    pointsQueue.push(this.pointObj(i, styleIndex, true, false));
                    runningTotalUpper++;
                }
                else if (dataArray[i][styleIndex - 1] < avgVal) {
                    if (runningTotalUpper > 0) {
                        // The upper run has been broken so reset
                        pointsQueue = [];
                        runningTotalUpper = 0;
                    }

                    // Push the point and increment upper
                    pointsQueue.push(this.pointObj(i, styleIndex, true, false));
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
                    pointsToColor.push(this.pointObj(i, styleIndex, false, false));
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
        /*
            Creates json object that colors the points.
            Supported options:
                Point Color
                Point Shape
                Point Size
        */
        colorPoints: function (dataArray, outOfControlPoints, oocPointColor, oocPointShape, oocPointSize) {
            var arrayLength = outOfControlPoints.length;
            var pointStyle = "point { fill-color: " + oocPointColor + "; shape-type: " + oocPointShape + "; size: " + oocPointSize + "; }";
            for (var i = 0; i < arrayLength; i++) {
                dataArray[outOfControlPoints[i].dataIndex][outOfControlPoints[i].styleIndex] = pointStyle;
            }
        },
        /*
            OOC 
        */
        pointObj: function (dataIndexVal, styleIndexVal, oocUpper, oocLower) {
            return {
                dataIndex: dataIndexVal,
                styleIndex: styleIndexVal,
                outOfControlUpper: oocUpper,
                outOfControlLower: oocLower
            };
        }
    }
})


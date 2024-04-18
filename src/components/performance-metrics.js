import React from 'react';
import {connectToLog} from 'streetscape.gl';
import {Hint,XYPlot, LineSeries,XAxis,YAxis,VerticalGridLines,HorizontalGridLines} from 'react-vis';
class PerformanceMetrics extends React.Component{
    constructor(props) {
      super(props);
      this.data1 = [
        {x: 0, y: 8},
        {x: 1, y: 5},
        {x: 2, y: 4},
        {x: 3, y: 9},
        {x: 4, y: 1},
        {x: 5, y: 7},
        {x: 6, y: 6},
        {x: 7, y: 3},
        {x: 8, y: 2},
        {x: 9, y: 0},
        {x: 10, y: 8},
        {x: 11, y: 5},
        {x: 12, y: 4},
        {x: 13, y: 9},
        {x: 14, y: 1},
        {x: 15, y: 7},
        {x: 16, y: 6},
        {x: 17, y: 3},
        {x: 18, y: 2},
        {x: 19, y: 0}
      ];

      this.data2 = [
        {x: 0, y: 18},
        {x: 1, y: 15},
        {x: 2, y: 14},
        {x: 3, y: 19},
        {x: 4, y: 11},
        {x: 5, y: 17},
        {x: 6, y: 6},
        {x: 7, y: 3},
        {x: 8, y: 2},
        {x: 9, y: 0},
        {x: 10, y: 8},
        {x: 11, y: 5},
        {x: 12, y: 4},
        {x: 13, y: 9},
        {x: 14, y: 1},
        {x: 15, y: 7},
        {x: 16, y: 6},
        {x: 17, y: 3},
        {x: 18, y: 2},
        {x: 19, y: 0}
      ];
    }
    render() {
      return <XYPlot height={300} width={300}>
          <VerticalGridLines />
          <HorizontalGridLines />
          <XAxis />
          <YAxis />
          <LineSeries data={this.data1} />
          <LineSeries data={this.data2} />
        </XYPlot>
    }
}
/*
const getLogState = (log,ownProps) => ({
  timestamp: log.getCurrentTime(),
  frame:log.getCurrentFrame()
});
const PerformanceMetricsContainer = connectToLog({Component: PerformanceMetrics, getLogState});
export default PerformanceMetricsContainer;*/

export default PerformanceMetrics;







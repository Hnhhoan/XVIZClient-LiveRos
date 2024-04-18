// Copyright (c) 2019 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
import React from 'react';
import {MetricCard, MetricChart} from '@streetscape.gl/monochrome';

import {
  HISTORY_SIZE,
  STATS_CPU_GPU_MEMORY_NAMES,
  STYLES,
  STATS_CPU_GPU_MEMORY_KEYS,
  STATS_CPU_GPU_MEMORY_COLORS,
  DEFAULT_CPU_GPU_MEMORY_STATS_TITLE,
  STATS_CPU_GPU_MEMORY_HELP,
  INITIAL_CPU_GPU_MEMORY_STATS,
  WIDTH,
  HEIGHT
} from './constants';

const Help = () => {
  const help = [];
  for (const [statName, statHelp] of Object.entries(STATS_CPU_GPU_MEMORY_HELP)) {
    help.push(
      <div key={statName} style={{marginBottom: 10}}>
        <strong>{STATS_CPU_GPU_MEMORY_NAMES[statName]}</strong>
        <div>{statHelp}</div>
      </div>
    );
  }
  return <div style={STYLES.LOG_VIEWER.STATS_HELP}>{help}</div>;
};

/**
 * Stat snapshot at a specific point in time.
 * @typedef {Object} StatsSnapshot
 * @property {Number} STATS_CPU_GPU_MEMORY_KEYS.BUFFERMEMORY
 * @property {Number} STATS_CPU_GPU_MEMORY_KEYS.TEXTUREMEMORY
 * @property {Number} STATS_CPU_GPU_MEMORY_KEYS.RENDERBUFFERMEMORY
 * @property {Number} STATS_CPU_GPU_MEMORY_KEYS.GPUMEMORY
 * 
 */

/**
 * @typedef {Object} StatValue
 * @property {Number} x - X-axis value (e.g. time) for this stat.
 * @property {Number} y - Y-axis value (e.g. value) for this stat.
 */

/**
 * @typedef {Object} Stats - History {StatsSnapshot} over time.
 * @property {Array<StatValue>} STATS_CPU_GPU_MEMORY_KEYS.BUFFERMEMORY
 * @property {Array<StatValue>} STATS_CPU_GPU_MEMORY_KEYS.TEXTUREMEMORY
 * @property {Array<StatValue>} STATS_CPU_GPU_MEMORY_KEYS.RENDERBUFFERMEMORY
 * @property {Array<StatValue>} STATS_CPU_GPU_MEMORY_KEYS.GPUMEMORY
 * @property {Number} counter
 */

/**
 * Update stats history with a stats snapshot.
 * @param {Stats} stats - Stats history.
 * @param {StatsSnapshot} statsSnapshot - Snapshot used to update stats history.
 */
const _updateStats = (stats, statsSnapshot) => {
  stats.counter += 1;

  for (const statName of Object.values(STATS_CPU_GPU_MEMORY_KEYS)) {
    // Drop oldest stat value when we've reached the history size.
    if (stats[statName].length >= HISTORY_SIZE) {
      stats[statName] = stats[statName].slice(1);
    }
    // Construct new stat value from stats snapshot.
    const newStatValue = {
      x: stats.counter,
      y: (statsSnapshot && statsSnapshot[statName]) || 0
    };
    stats[statName].push(newStatValue);
  }
  return stats;
};

/**
 * Component to render the Log Viewer stats. It consumes a stats snapshot.
 * Every time the stats snapshot updates, the stats history is updated and
 * the component renders the updated stats history.
 * @param {Object} props
 * @param {StatsSnapshot} props.statsSnapshot
 */
export class LogViewerCPUGPUMemoryStats extends React.Component {
  state = {stats: INITIAL_CPU_GPU_MEMORY_STATS};

  componentWillUpdate(nextProps) {
    if (nextProps.statsSnapshot !== this.props.statsSnapshot) {
      const stats = _updateStats(this.state.stats, nextProps.statsSnapshot);
      this.setState({stats});
    }
  }

  render() {
    const {counter, ...data} = this.state.stats;
    const title = this.props.title || DEFAULT_CPU_GPU_MEMORY_STATS_TITLE;
    return (
      <div id="stats" style={STYLES.LOG_VIEWER.STATS}>
        <MetricCard title={title} description={<Help />} style={STYLES.LOG_VIEWER.METRIC_CARD}>
          <MetricChart
            width={WIDTH}
            height={HEIGHT}
            data={data}
            highlightX={counter}
            getColor={statKey => STATS_CPU_GPU_MEMORY_COLORS[statKey]}
            formatTitle={statKey => STATS_CPU_GPU_MEMORY_NAMES[statKey]}
          />
        </MetricCard>
      </div>
    );
  }
}

export const CHART_COLORS = {
  tax: '#3478F5',
  osg: '#0EA271',
  dev: '#6B46E8',
  accent: '#4B63F7',
  warn: '#D4820A',
  risk: '#D03040',
};

export const AXIS_STYLE = {
  tick: { fontSize: 9, fill: '#B0BBC8', fontFamily: "'Instrument Sans', sans-serif" },
  axisLine: { stroke: '#E4E9F0' },
  tickLine: false as const,
};

export const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: '#EEF2F6',
  vertical: false as const,
};

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #E4E9F0',
    borderRadius: 8,
    fontSize: 12,
    fontFamily: "'Instrument Sans', sans-serif",
    boxShadow: '0 4px 16px rgba(0,0,0,.1)',
  },
  cursor: { fill: 'rgba(75,99,247,.04)' },
};

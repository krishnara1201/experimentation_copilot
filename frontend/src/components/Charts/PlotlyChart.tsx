import React from 'react';
import Plot from 'react-plotly.js';

interface PlotlyChartProps {
  data: any[];
  layout?: any;
  config?: any;
}

const PlotlyChart: React.FC<PlotlyChartProps> = ({ data, layout, config }) => {
  return (
    <Plot
      data={data}
      layout={layout}
      config={config}
    />
  );
};

export default PlotlyChart;
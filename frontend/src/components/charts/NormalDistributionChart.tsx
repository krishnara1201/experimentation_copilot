export interface DistributionCurve {
  label: string;
  mean: number;
  stdDev: number;
  color: string;
}

function normalPdf(x: number, mean: number, stdDev: number): number {
  if (stdDev <= 0) return 0;
  const exponent = -((x - mean) ** 2) / (2 * stdDev ** 2);
  return Math.exp(exponent) / (stdDev * Math.sqrt(2 * Math.PI));
}

function buildCurvePoints(mean: number, stdDev: number, domainMin: number, domainMax: number, samples: number) {
  const step = (domainMax - domainMin) / (samples - 1);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < samples; i++) {
    const x = domainMin + step * i;
    points.push({ x, y: normalPdf(x, mean, stdDev) });
  }
  return points;
}

export default function NormalDistributionChart({
  curves,
  height = 180,
  formatValue = (value: number) => value.toFixed(3),
}: {
  curves: DistributionCurve[];
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const width = 480;
  const margin = { top: 16, right: 16, bottom: 28, left: 16 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const samples = 120;

  const usableCurves = curves.filter((curve) => curve.stdDev > 0);
  if (usableCurves.length === 0) return null;

  const domainMin = Math.min(...usableCurves.map((curve) => curve.mean - 3.75 * curve.stdDev));
  const domainMax = Math.max(...usableCurves.map((curve) => curve.mean + 3.75 * curve.stdDev));

  const curvePoints = usableCurves.map((curve) => ({
    curve,
    points: buildCurvePoints(curve.mean, curve.stdDev, domainMin, domainMax, samples),
  }));
  const maxDensity = Math.max(...curvePoints.flatMap(({ points }) => points.map((point) => point.y)), 1e-9);

  const scaleX = (x: number) => margin.left + ((x - domainMin) / (domainMax - domainMin)) * plotWidth;
  const scaleY = (y: number) => margin.top + plotHeight - (y / maxDensity) * plotHeight * 0.9;
  const baselineY = margin.top + plotHeight;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Distribution comparison chart">
        <line x1={margin.left} y1={baselineY} x2={width - margin.right} y2={baselineY} stroke="#c3c2b7" strokeWidth={1} />
        {curvePoints.map(({ curve, points }) => {
          const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${scaleX(point.x)} ${scaleY(point.y)}`).join(' ');
          const areaPath = `${linePath} L ${scaleX(points[points.length - 1].x)} ${baselineY} L ${scaleX(points[0].x)} ${baselineY} Z`;
          const meanX = scaleX(curve.mean);
          return (
            <g key={curve.label}>
              <path d={areaPath} fill={curve.color} fillOpacity={0.15} />
              <path d={linePath} fill="none" stroke={curve.color} strokeWidth={2} strokeLinejoin="round" />
              <line
                x1={meanX}
                y1={scaleY(normalPdf(curve.mean, curve.mean, curve.stdDev))}
                x2={meanX}
                y2={baselineY}
                stroke={curve.color}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text x={meanX} y={height - 6} textAnchor="middle" fontSize={10} fill="#52514e">
                {formatValue(curve.mean)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {usableCurves.map((curve) => (
          <div key={curve.label} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: curve.color }} />
            {curve.label}
          </div>
        ))}
      </div>
    </div>
  );
}

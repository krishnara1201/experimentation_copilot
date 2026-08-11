export default function ConfidenceIntervalChart({
  estimate,
  lower,
  upper,
  isSignificant,
  formatValue = (value: number) => value.toFixed(4),
  height = 90,
}: {
  estimate: number;
  lower: number;
  upper: number;
  isSignificant: boolean;
  formatValue?: (value: number) => string;
  height?: number;
}) {
  const width = 480;
  const margin = { top: 12, right: 32, bottom: 28, left: 32 };
  const plotWidth = width - margin.left - margin.right;
  const midY = margin.top + (height - margin.top - margin.bottom) / 2;

  const rangeSpan = Math.max(upper - lower, Math.abs(estimate) || 1) || 1;
  const pad = rangeSpan * 0.35 || 0.1;
  const domainMin = Math.min(lower, 0) - pad;
  const domainMax = Math.max(upper, 0) + pad;

  const scaleX = (value: number) => margin.left + ((value - domainMin) / (domainMax - domainMin)) * plotWidth;
  const color = isSignificant ? '#16a34a' : '#64748b';

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Confidence interval chart">
        <line x1={margin.left} y1={midY} x2={width - margin.right} y2={midY} stroke="#e1e0d9" strokeWidth={1} />
        <line
          x1={scaleX(0)}
          y1={margin.top}
          x2={scaleX(0)}
          y2={height - margin.bottom}
          stroke="#c3c2b7"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text x={scaleX(0)} y={height - margin.bottom + 14} textAnchor="middle" fontSize={10} fill="#898781">
          0
        </text>

        <line x1={scaleX(lower)} y1={midY} x2={scaleX(upper)} y2={midY} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <line x1={scaleX(lower)} y1={midY - 6} x2={scaleX(lower)} y2={midY + 6} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <line x1={scaleX(upper)} y1={midY - 6} x2={scaleX(upper)} y2={midY + 6} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <circle cx={scaleX(estimate)} cy={midY} r={5} fill={color} />

        <text x={scaleX(lower)} y={midY - 14} textAnchor="middle" fontSize={10} fill="#52514e">
          {formatValue(lower)}
        </text>
        <text x={scaleX(estimate)} y={margin.top - 2} textAnchor="middle" fontSize={11} fontWeight={600} fill={color}>
          {formatValue(estimate)}
        </text>
        <text x={scaleX(upper)} y={midY - 14} textAnchor="middle" fontSize={10} fill="#52514e">
          {formatValue(upper)}
        </text>
      </svg>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        {isSignificant ? 'Significant — interval excludes zero' : 'Not significant — interval includes zero'}
      </div>
    </div>
  );
}

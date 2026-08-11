export interface SuccessRateBar {
  label: string;
  successes: number;
  total: number;
}

const SUCCESS_COLOR = '#16a34a';
const NOT_SUCCESS_COLOR = '#94a3b8';
const GAP = 2;
const BAR_HEIGHT = 22;
const ROW_HEIGHT = 44;

export default function SuccessRateBarChart({ bars }: { bars: SuccessRateBar[] }) {
  const usableBars = bars.filter((bar) => bar.total > 0);
  if (usableBars.length === 0) return null;

  const width = 480;
  const labelWidth = 96;
  const plotWidth = width - labelWidth - 48;
  const height = usableBars.length * ROW_HEIGHT;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Success rate by variant">
        {usableBars.map((bar, index) => {
          const rate = bar.successes / bar.total;
          const successWidth = Math.max(rate * plotWidth - GAP / 2, 0);
          const notSuccessWidth = Math.max((1 - rate) * plotWidth - GAP / 2, 0);
          const y = index * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
          const barX = labelWidth;

          return (
            <g key={bar.label}>
              <text x={0} y={y + BAR_HEIGHT / 2 + 4} fontSize={11} fill="#0b0b0b">
                {bar.label}
              </text>
              <rect x={barX} y={y} width={successWidth} height={BAR_HEIGHT} rx={4} fill={SUCCESS_COLOR} />
              <rect
                x={barX + successWidth + GAP}
                y={y}
                width={notSuccessWidth}
                height={BAR_HEIGHT}
                rx={4}
                fill={NOT_SUCCESS_COLOR}
              />
              <text x={barX + plotWidth + 8} y={y + BAR_HEIGHT / 2 + 4} fontSize={11} fontWeight={600} fill="#0b0b0b">
                {(rate * 100).toFixed(1)}%
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SUCCESS_COLOR }} />
          Success
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NOT_SUCCESS_COLOR }} />
          Not success
        </div>
      </div>
    </div>
  );
}

interface MiniLineChartProps {
  data: { timestamp: number; value: number }[];
  title: string;
  color?: string;
  height?: number;
  referenceLines?: { value: number; label: string; color: string }[];
}

export default function MiniLineChart({
  data,
  title,
  color = "#3b82f6",
  height = 100,
  referenceLines = [],
}: MiniLineChartProps) {
  if (data.length < 2) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
        <p className="text-xs text-gray-500">{title} — no data</p>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values, ...referenceLines.map((r) => r.value));
  const max = Math.max(...values, ...referenceLines.map((r) => r.value));
  const range = max - min || 1;
  const width = 100;
  const pad = 4;

  const points = data
    .map((d, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2);
      const y = height - pad - ((d.value - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
      <p className="text-xs text-gray-400 mb-2">{title}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {referenceLines.map((ref) => {
          const y = height - pad - ((ref.value - min) / range) * (height - pad * 2);
          return (
            <g key={ref.label}>
              <line
                x1={pad}
                y1={y}
                x2={width - pad}
                y2={y}
                stroke={ref.color}
                strokeWidth="0.3"
                strokeDasharray="1,1"
                opacity={0.6}
              />
            </g>
          );
        })}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.2"
          points={points}
        />
        <circle
          cx={points.split(" ").pop()?.split(",")[0]}
          cy={points.split(" ").pop()?.split(",")[1]}
          r="1.5"
          fill={color}
        />
      </svg>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min.toFixed(1)}</span>
        <span className="font-medium text-gray-300">
          {values[values.length - 1].toFixed(2)}
        </span>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
}

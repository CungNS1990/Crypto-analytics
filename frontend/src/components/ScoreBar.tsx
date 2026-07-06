interface ScoreBarProps {
  bullish: number;
  bearish: number;
}

export default function ScoreBar({ bullish, bearish }: ScoreBarProps) {
  const total = bullish + bearish || 1;
  const bullPct = (bullish / total) * 100;
  const bearPct = (bearish / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-green-400">Bullish {bullish.toFixed(1)}</span>
        <span className="text-red-400">Bearish {bearish.toFixed(1)}</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-800">
        <div
          className="bg-green-500 transition-all duration-500"
          style={{ width: `${bullPct}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-500"
          style={{ width: `${bearPct}%` }}
        />
      </div>
    </div>
  );
}

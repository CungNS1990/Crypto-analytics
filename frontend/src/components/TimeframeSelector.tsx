"use client";

const TIMEFRAMES = ["15m", "1h", "1d"];

interface TimeframeSelectorProps {
  selected: string;
  onChange: (timeframe: string) => void;
  disabled?: boolean;
}

export default function TimeframeSelector({
  selected,
  onChange,
  disabled = false,
}: TimeframeSelectorProps) {
  return (
    <div className={`flex gap-2 ${disabled ? "opacity-60" : ""}`}>
      {TIMEFRAMES.map((tf) => {
        const isActive = tf === selected;
        return (
          <button
            key={tf}
            type="button"
            disabled={disabled}
            onClick={() => onChange(tf)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              disabled ? "cursor-not-allowed" : ""
            } ${
              isActive
                ? "bg-emerald-600 text-white"
                : disabled
                  ? "bg-gray-800 text-gray-500"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {tf}
          </button>
        );
      })}
    </div>
  );
}

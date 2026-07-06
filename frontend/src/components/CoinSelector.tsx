"use client";

interface CoinSelectorProps {
  symbols: string[];
  selected: string;
  onChange: (symbol: string) => void;
  disabled?: boolean;
}

export default function CoinSelector({
  symbols,
  selected,
  onChange,
  disabled = false,
}: CoinSelectorProps) {
  return (
    <div className={`flex gap-2 flex-wrap ${disabled ? "opacity-60" : ""}`}>
      {symbols.map((symbol) => {
        const base = symbol.split("/")[0];
        const isActive = symbol === selected;
        return (
          <button
            key={symbol}
            type="button"
            disabled={disabled}
            onClick={() => onChange(symbol)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              disabled ? "cursor-not-allowed" : ""
            } ${
              isActive
                ? "bg-blue-600 text-white"
                : disabled
                  ? "bg-gray-800 text-gray-500"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {base}
          </button>
        );
      })}
    </div>
  );
}

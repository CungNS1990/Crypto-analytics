"use client";

import type { OHLCVCandle } from "@/lib/api";

interface PriceTableProps {
  data: OHLCVCandle[];
  symbol: string;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatPrice(price: number): string {
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  });
}

export default function PriceTable({ data, symbol }: PriceTableProps) {
  const recent = [...data].reverse().slice(0, 20);

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 overflow-x-auto">
      <h3 className="text-sm font-medium text-gray-400 mb-3">
        {symbol} — Latest 20 Candles
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-2 px-2">Time</th>
            <th className="text-right py-2 px-2">Open</th>
            <th className="text-right py-2 px-2">High</th>
            <th className="text-right py-2 px-2">Low</th>
            <th className="text-right py-2 px-2">Close</th>
            <th className="text-right py-2 px-2">Volume</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((candle) => {
            const isUp = candle.close >= candle.open;
            return (
              <tr
                key={candle.timestamp}
                className="border-b border-gray-800/50 hover:bg-gray-800/30"
              >
                <td className="py-2 px-2 text-gray-400">
                  {formatTime(candle.timestamp)}
                </td>
                <td className="py-2 px-2 text-right">{formatPrice(candle.open)}</td>
                <td className="py-2 px-2 text-right text-green-400">
                  {formatPrice(candle.high)}
                </td>
                <td className="py-2 px-2 text-right text-red-400">
                  {formatPrice(candle.low)}
                </td>
                <td
                  className={`py-2 px-2 text-right font-medium ${
                    isUp ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formatPrice(candle.close)}
                </td>
                <td className="py-2 px-2 text-right text-gray-400">
                  {candle.volume.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

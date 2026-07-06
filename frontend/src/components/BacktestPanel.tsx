"use client";

import type { BacktestResult } from "@/lib/api";

interface BacktestPanelProps {
  result: BacktestResult | null;
  loading: boolean;
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}

export default function BacktestPanel({ result, loading }: BacktestPanelProps) {
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!result) return null;

  const pfColor =
    result.profit_factor >= 1.5
      ? "text-green-400"
      : result.profit_factor >= 1
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="text-lg font-bold">Paper Trading Backtest</h2>
        <p className="text-sm text-gray-400 mt-1">
          {result.symbol} · {result.timeframe} · SL {result.stop_loss_pct}% · TP{" "}
          {result.take_profit_pct}%
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Tỷ lệ thắng"
            value={`${result.win_rate}%`}
            color="text-green-400"
          />
          <StatCard
            label="Tỷ lệ thua"
            value={`${result.loss_rate}%`}
            color="text-red-400"
          />
          <StatCard
            label="Profit Factor"
            value={result.profit_factor >= 999 ? "∞" : result.profit_factor.toFixed(2)}
            color={pfColor}
          />
          <StatCard
            label="Tổng PnL"
            value={`${result.total_pnl_pct >= 0 ? "+" : ""}${result.total_pnl_pct}%`}
            color={result.total_pnl_pct >= 0 ? "text-green-400" : "text-red-400"}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-gray-400">
            Tổng lệnh: <span className="text-white font-medium">{result.total_trades}</span>
          </div>
          <div className="text-gray-400">
            Thắng: <span className="text-green-400 font-medium">{result.wins}</span>
          </div>
          <div className="text-gray-400">
            Thua: <span className="text-red-400 font-medium">{result.losses}</span>
          </div>
          <div className="text-gray-400">
            Lời TB: <span className="text-green-400">+{result.avg_win_pct}%</span> · Lỗ TB:{" "}
            <span className="text-red-400">{result.avg_loss_pct}%</span>
          </div>
        </div>

        {/* Win/Loss visual bar */}
        {result.total_trades > 0 && (
          <div>
            <div className="flex h-4 rounded-full overflow-hidden bg-gray-800">
              <div
                className="bg-green-500 flex items-center justify-center text-[10px] font-bold"
                style={{ width: `${result.win_rate}%` }}
              >
                {result.win_rate > 15 && `${result.win_rate}%`}
              </div>
              <div
                className="bg-red-500 flex items-center justify-center text-[10px] font-bold"
                style={{ width: `${result.loss_rate}%` }}
              >
                {result.loss_rate > 15 && `${result.loss_rate}%`}
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-300 leading-relaxed bg-gray-800/50 rounded-lg p-3">
          {result.summary}
        </p>

        {result.trades.length > 0 && (
          <div className="overflow-x-auto">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Lịch sử lệnh (50 gần nhất)
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2 px-2">Loại</th>
                  <th className="text-left py-2 px-2">Vào</th>
                  <th className="text-left py-2 px-2">Ra</th>
                  <th className="text-right py-2 px-2">Entry</th>
                  <th className="text-right py-2 px-2">Exit</th>
                  <th className="text-right py-2 px-2">PnL</th>
                  <th className="text-center py-2 px-2">Kết quả</th>
                  <th className="text-center py-2 px-2">Lý do</th>
                </tr>
              </thead>
              <tbody>
                {[...result.trades].reverse().map((t, idx) => (
                  <tr
                    key={`${t.entry_time}-${idx}`}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    <td
                      className={`py-2 px-2 font-medium uppercase ${
                        t.type === "long" ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {t.type}
                    </td>
                    <td className="py-2 px-2 text-gray-400 text-xs">
                      {formatTime(t.entry_time)}
                    </td>
                    <td className="py-2 px-2 text-gray-400 text-xs">
                      {formatTime(t.exit_time)}
                    </td>
                    <td className="py-2 px-2 text-right">{t.entry_price.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right">{t.exit_price.toLocaleString()}</td>
                    <td
                      className={`py-2 px-2 text-right font-medium ${
                        t.pnl_pct >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {t.pnl_pct >= 0 ? "+" : ""}
                      {t.pnl_pct}%
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          t.result === "WIN"
                            ? "bg-green-900/40 text-green-400"
                            : "bg-red-900/40 text-red-400"
                        }`}
                      >
                        {t.result}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center text-gray-400 text-xs">
                      {t.exit_reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

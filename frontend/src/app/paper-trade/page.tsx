"use client";

import { useEffect, useState } from "react";
import CoinSelector from "@/components/CoinSelector";
import TimeframeSelector from "@/components/TimeframeSelector";
import {
  fetchPaperStatus,
  fetchSymbols,
  resetPaperBot,
  startPaperBot,
  stopPaperBot,
  tickPaperBot,
  type PaperStatus,
} from "@/lib/api";

const POLL_MS: Record<string, number> = {
  "15m": 30_000,
  "1h": 60_000,
  "1d": 300_000,
};

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}

function directionColor(dir: string): string {
  if (dir === "LONG") return "text-green-400";
  if (dir === "SHORT") return "text-red-400";
  return "text-gray-400";
}

export default function PaperTradePage() {
  const [symbols, setSymbols] = useState<string[]>([
    "BTC/USDT",
    "ETH/USDT",
    "BNB/USDT",
    "XRP/USDT",
  ]);
  const [status, setStatus] = useState<PaperStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [capital, setCapital] = useState("1000");
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [stopLoss, setStopLoss] = useState("2");
  const [takeProfit, setTakeProfit] = useState("4");
  const [minConfidence, setMinConfidence] = useState("40");
  const [botActive, setBotActive] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const s = await fetchPaperStatus();
        setStatus(s);
        setBotActive(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi tải trạng thái");
      } finally {
        setLoading(false);
      }
    };
    fetchSymbols()
      .then((s) => setSymbols(s.map((x) => x.symbol)))
      .catch(() => {});
    init();
  }, []);

  useEffect(() => {
    return () => {
      stopPaperBot().catch(() => {});
      setBotActive(false);
    };
  }, []);

  useEffect(() => {
    if (!status || status.initial_capital <= 0) return;
    setSymbol(status.symbol);
    setTimeframe(status.timeframe);
    setStopLoss(String(status.stop_loss_pct));
    setTakeProfit(String(status.take_profit_pct));
    setMinConfidence(String(status.min_confidence));
    setCapital(String(status.initial_capital));
  }, [
    status?.symbol,
    status?.timeframe,
    status?.stop_loss_pct,
    status?.take_profit_pct,
    status?.min_confidence,
    status?.initial_capital,
  ]);

  useEffect(() => {
    if (!botActive) return;
    const tf = status?.timeframe ?? timeframe;
    const interval = POLL_MS[tf] ?? 60_000;
    const id = setInterval(async () => {
      try {
        const s = await tickPaperBot();
        setStatus(s);
      } catch {
        /* ignore poll errors */
      }
    }, interval);
    return () => clearInterval(id);
  }, [botActive, status?.timeframe, timeframe]);

  const handleStart = async () => {
    const cap = parseFloat(capital);
    if (!cap || cap <= 0) {
      setError("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const s = await startPaperBot({
        capital: cap,
        symbol,
        timeframe,
        stop_loss_pct: parseFloat(stopLoss) || 2,
        take_profit_pct: parseFloat(takeProfit) || 4,
        min_confidence: parseFloat(minConfidence) || 40,
      });
      setStatus(s);
      setBotActive(true);
      const ticked = await tickPaperBot();
      setStatus(ticked);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể khởi động bot");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      setStatus(await stopPaperBot());
      setBotActive(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể dừng bot");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset toàn bộ phiên paper trade?")) return;
    setActionLoading(true);
    try {
      setStatus(await resetPaperBot());
      setBotActive(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể reset");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualTick = async () => {
    setActionLoading(true);
    try {
      setStatus(await tickPaperBot());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tick thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  const running = botActive;
  const stats = status?.stats;
  const equityPnlPct =
    status && status.initial_capital > 0
      ? ((status.equity - status.initial_capital) / status.initial_capital) * 100
      : 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paper Trade Bot</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Bot tự động vào lệnh futures giả lập dựa trên phân tích kỹ thuật. Chỉ
          vào lệnh khi tín hiệu đủ mạnh — nếu không hợp lý sẽ chờ.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Config panel */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">Cấu hình bot</h2>
          {running && (
            <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800/50 px-3 py-1.5 rounded-lg">
              Bot đang chạy — bấm &quot;Dừng bot&quot; để đổi coin / khung thời gian
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Vốn thử nghiệm (USDT)
            </label>
            <input
              type="number"
              min="1"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              disabled={running}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white disabled:opacity-50"
              placeholder="1000"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Coin</label>
            <CoinSelector
              symbols={symbols}
              selected={symbol}
              onChange={setSymbol}
              disabled={running}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Khung thời gian</label>
            <TimeframeSelector
              selected={timeframe}
              onChange={setTimeframe}
              disabled={running}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Stop Loss (%)</label>
            <input
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              disabled={running}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Take Profit (%)</label>
            <input
              type="number"
              min="1"
              max="20"
              step="0.5"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              disabled={running}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Confidence tối thiểu (%)
            </label>
            <input
              type="number"
              min="20"
              max="90"
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
              disabled={running}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white disabled:opacity-50"
            />
            <p className="text-xs text-gray-600 mt-1">
              Dưới ngưỡng này bot sẽ chờ, không vào lệnh
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          {!running ? (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {actionLoading ? "Đang khởi động..." : "Bắt đầu bot"}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={actionLoading}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              Dừng bot
            </button>
          )}
          <button
            onClick={handleManualTick}
            disabled={actionLoading || !running}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm transition-colors"
          >
            Tick ngay
          </button>
          <button
            onClick={handleReset}
            disabled={actionLoading || running}
            className="px-4 py-2.5 border border-gray-700 hover:bg-gray-800 disabled:opacity-50 rounded-lg text-sm transition-colors"
          >
            Reset phiên
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse h-32 bg-gray-900 rounded-xl border border-gray-800" />
      ) : status && status.initial_capital > 0 ? (
        <>
          {/* Status */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                running
                  ? "bg-green-900/40 text-green-400 border border-green-800"
                  : "bg-gray-800 text-gray-400 border border-gray-700"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${running ? "bg-green-400 animate-pulse" : "bg-gray-500"}`}
              />
              {running ? "Bot đang chạy" : "Bot đã dừng"}
            </span>
            {status.last_tick_at && (
              <span className="text-xs text-gray-500">
                Tick cuối: {formatTime(status.last_tick_at)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Vốn ban đầu"
              value={`$${status.initial_capital.toLocaleString()}`}
            />
            <StatCard
              label="Equity hiện tại"
              value={`$${status.equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              sub={`${equityPnlPct >= 0 ? "+" : ""}${equityPnlPct.toFixed(2)}% tổng`}
              color={equityPnlPct >= 0 ? "text-green-400" : "text-red-400"}
            />
            <StatCard
              label="Tỷ lệ thắng"
              value={`${stats?.win_rate ?? 0}%`}
              sub={`${stats?.wins ?? 0}W / ${stats?.losses ?? 0}L`}
              color="text-green-400"
            />
            <StatCard
              label="P/L đã đóng"
              value={`${(stats?.total_pnl_pct ?? 0) >= 0 ? "+" : ""}${stats?.total_pnl_pct ?? 0}%`}
              sub={`$${stats?.total_pnl_usdt ?? 0}`}
              color={
                (stats?.total_pnl_usdt ?? 0) >= 0 ? "text-green-400" : "text-red-400"
              }
            />
          </div>

          {/* Signal & position */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                Tín hiệu phân tích
              </h3>
              {status.last_signal ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-3xl font-bold ${directionColor(status.last_signal.direction)}`}
                    >
                      {status.last_signal.direction}
                    </span>
                    <span className="text-gray-400">
                      {status.last_signal.confidence.toFixed(0)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Score: {status.last_signal.net_score >= 0 ? "+" : ""}
                    {status.last_signal.net_score.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-600">{status.last_signal.summary}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Chưa có tín hiệu</p>
              )}
              {status.wait_reason && (
                <div className="mt-4 p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg">
                  <p className="text-xs text-amber-400">{status.wait_reason}</p>
                </div>
              )}
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                Lệnh đang mở
              </h3>
              {status.position ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xl font-bold uppercase ${status.position.type === "long" ? "text-green-400" : "text-red-400"}`}
                    >
                      {status.position.type}
                    </span>
                    <span className="text-gray-500 text-sm">
                      @ ${status.position.entry_price.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Notional: ${status.position.notional.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-400">
                    Mở lúc: {formatTime(status.position.entry_time)}
                  </p>
                  {status.current_price && (
                    <p className="text-sm">
                      Giá hiện tại: ${status.current_price.toLocaleString()} · P/L chưa
                      chốt:{" "}
                      <span
                        className={
                          status.unrealized_pnl_usdt >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {status.unrealized_pnl_usdt >= 0 ? "+" : ""}
                        {status.unrealized_pnl_usdt.toFixed(2)} USDT (
                        {status.unrealized_pnl_pct >= 0 ? "+" : ""}
                        {status.unrealized_pnl_pct}%)
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Không có lệnh mở</p>
              )}
            </div>
          </div>

          {/* Trade history */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-bold">Lịch sử lệnh</h2>
              <p className="text-sm text-gray-400">
                {status.symbol} · SL {status.stop_loss_pct}% · TP {status.take_profit_pct}%
              </p>
            </div>
            {status.trades.length === 0 ? (
              <p className="p-6 text-gray-500 text-sm">Chưa có lệnh nào được đóng</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left px-4 py-3 font-medium">Loại</th>
                      <th className="text-left px-4 py-3 font-medium">Vào</th>
                      <th className="text-left px-4 py-3 font-medium">Ra</th>
                      <th className="text-right px-4 py-3 font-medium">Entry</th>
                      <th className="text-right px-4 py-3 font-medium">Exit</th>
                      <th className="text-right px-4 py-3 font-medium">P/L</th>
                      <th className="text-center px-4 py-3 font-medium">Kết quả</th>
                      <th className="text-left px-4 py-3 font-medium">Lý do đóng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...status.trades].reverse().map((t, i) => (
                      <tr
                        key={`${t.exit_time}-${i}`}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30"
                      >
                        <td className="px-4 py-3 uppercase font-medium">
                          <span
                            className={
                              t.type === "long" ? "text-green-400" : "text-red-400"
                            }
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                          {formatTime(t.entry_time)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                          {formatTime(t.exit_time)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          ${t.entry_price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          ${t.exit_price.toLocaleString()}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${t.pnl_pct >= 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          {t.pnl_pct >= 0 ? "+" : ""}
                          {t.pnl_pct}% (${t.pnl_usdt >= 0 ? "+" : ""}
                          {t.pnl_usdt})
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              t.result === "WIN"
                                ? "bg-green-900/40 text-green-400"
                                : "bg-red-900/40 text-red-400"
                            }`}
                          >
                            {t.result}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{t.exit_reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center text-gray-500">
          Nhập vốn và bấm &quot;Bắt đầu bot&quot; để bắt đầu paper trade
        </div>
      )}
    </main>
  );
}

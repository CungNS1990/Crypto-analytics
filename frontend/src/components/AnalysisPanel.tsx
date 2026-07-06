"use client";

import type { AnalysisResult } from "@/lib/api";
import MiniLineChart from "./MiniLineChart";
import RsiGauge from "./RsiGauge";
import ScoreBar from "./ScoreBar";

interface AnalysisPanelProps {
  analysis: AnalysisResult | null;
  loading: boolean;
}

const DIRECTION_STYLE = {
  LONG: {
    bg: "bg-green-900/40 border-green-700",
    text: "text-green-400",
    icon: "↑",
    label: "LONG — Xu hướng TĂNG",
  },
  SHORT: {
    bg: "bg-red-900/40 border-red-700",
    text: "text-red-400",
    icon: "↓",
    label: "SHORT — Xu hướng GIẢM",
  },
  NEUTRAL: {
    bg: "bg-gray-800/60 border-gray-600",
    text: "text-gray-300",
    icon: "→",
    label: "NEUTRAL — Sideway",
  },
};

const SIGNAL_STYLE = {
  bullish: "bg-green-900/30 text-green-400 border-green-800",
  bearish: "bg-red-900/30 text-red-400 border-red-800",
  neutral: "bg-gray-800 text-gray-400 border-gray-700",
};

export default function AnalysisPanel({ analysis, loading }: AnalysisPanelProps) {
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-4" />
        <div className="h-20 bg-gray-800 rounded mb-4" />
        <div className="h-32 bg-gray-800 rounded" />
      </div>
    );
  }

  if (!analysis) return null;

  const style = DIRECTION_STYLE[analysis.direction];
  const rsiInd = analysis.indicators.find((i) => i.name.startsWith("RSI"));
  const rsiValue =
    typeof rsiInd?.value === "number"
      ? rsiInd.value
      : parseFloat(String(rsiInd?.value ?? 50));

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header verdict */}
      <div className={`px-6 py-5 border-b border-gray-800 ${style.bg}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`text-4xl font-bold ${style.text}`}>{style.icon}</span>
            <div>
              <h2 className={`text-xl font-bold ${style.text}`}>{style.label}</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {analysis.symbol} · {analysis.timeframe} · $
                {analysis.current_price.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Độ tin cậy</p>
            <p className={`text-3xl font-bold ${style.text}`}>
              {analysis.confidence.toFixed(0)}%
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-300 leading-relaxed">{analysis.summary}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Score + RSI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <p className="text-xs text-gray-400 mb-3">Phân bổ tín hiệu</p>
            <ScoreBar
              bullish={analysis.bullish_score}
              bearish={analysis.bearish_score}
            />
            <p className="text-xs text-gray-500 mt-2">
              Net score: {analysis.net_score > 0 ? "+" : ""}
              {analysis.net_score.toFixed(2)}
            </p>
          </div>
          <RsiGauge value={rsiValue} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MiniLineChart
            title="RSI (50 nến)"
            data={analysis.rsi_history}
            color="#a855f7"
            referenceLines={[
              { value: 30, label: "30", color: "#22c55e" },
              { value: 70, label: "70", color: "#ef4444" },
            ]}
          />
          <MiniLineChart
            title="MACD Histogram"
            data={analysis.macd_history}
            color="#3b82f6"
          />
          <MiniLineChart
            title="Volume"
            data={analysis.volume_history}
            color="#f59e0b"
          />
        </div>

        {/* Indicator breakdown */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Chi tiết từng chỉ báo
          </h3>
          <div className="space-y-2">
            {analysis.indicators.map((ind) => (
              <div
                key={ind.name}
                className={`flex flex-col sm:flex-row sm:items-start gap-2 p-3 rounded-lg border ${SIGNAL_STYLE[ind.signal]}`}
              >
                <div className="flex items-center gap-2 sm:w-40 shrink-0">
                  <span className="font-medium text-sm">{ind.name}</span>
                  <span className="text-xs opacity-70">
                    {typeof ind.value === "number"
                      ? ind.value.toLocaleString(undefined, { maximumFractionDigits: 4 })
                      : ind.value}
                  </span>
                </div>
                <p className="text-sm opacity-90 flex-1">{ind.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

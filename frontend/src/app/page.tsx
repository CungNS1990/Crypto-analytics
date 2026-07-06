"use client";

import { useCallback, useEffect, useState } from "react";
import AnalysisPanel from "@/components/AnalysisPanel";
import BacktestPanel from "@/components/BacktestPanel";
import CoinSelector from "@/components/CoinSelector";
import TimeframeSelector from "@/components/TimeframeSelector";
import PriceChart from "@/components/PriceChart";
import PriceTable from "@/components/PriceTable";
import { useKlineWebSocket } from "@/hooks/useKlineWebSocket";
import { useTickerWebSocket } from "@/hooks/useTickerWebSocket";
import {
  fetchAnalysis,
  fetchBacktest,
  fetchOHLCV,
  fetchLatestPrices,
  fetchSymbols,
  type AnalysisResult,
  type BacktestResult,
  type OHLCVCandle,
  type LatestPrice,
} from "@/lib/api";
import { applyKlineUpdate } from "@/lib/ws";

const DEFAULT_SYMBOL = "BTC/USDT";
const DEFAULT_TIMEFRAME = "1h";

function PriceCard({ item }: { item: LatestPrice }) {
  const change = item.change_24h;
  const isPositive = change !== null && change >= 0;

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="text-sm text-gray-400">{item.base}</div>
      <div className="text-xl font-bold mt-1">
        ${item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
      {change !== null && (
        <div
          className={`text-sm mt-1 ${isPositive ? "text-green-400" : "text-red-400"}`}
        >
          {isPositive ? "+" : ""}
          {change.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

function LiveBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
        connected
          ? "bg-green-900/40 text-green-400 border border-green-800"
          : "bg-amber-900/30 text-amber-400 border border-amber-800"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          connected ? "bg-green-400 animate-pulse" : "bg-amber-400"
        }`}
      />
      {connected ? "Live" : "WS offline — restart backend"}
    </span>
  );
}

export default function Dashboard() {
  const [symbols, setSymbols] = useState<string[]>([
    "BTC/USDT",
    "ETH/USDT",
    "BNB/USDT",
    "XRP/USDT",
  ]);
  const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOL);
  const [timeframe, setTimeframe] = useState(DEFAULT_TIMEFRAME);
  const [ohlcv, setOhlcv] = useState<OHLCVCandle[]>([]);
  const [latestPrices, setLatestPrices] = useState<LatestPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(true);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTicker = useCallback((price: LatestPrice) => {
    setLatestPrices((prev) => {
      const idx = prev.findIndex((p) => p.symbol === price.symbol);
      if (idx === -1) return [...prev, price];
      const next = [...prev];
      next[idx] = price;
      return next;
    });
  }, []);

  const handleKline = useCallback((candle: OHLCVCandle) => {
    setOhlcv((prev) => applyKlineUpdate(prev, candle));
  }, []);

  const tickerConnected = useTickerWebSocket(handleTicker);
  const klineConnected = useKlineWebSocket(
    selectedSymbol,
    timeframe,
    handleKline
  );

  const loadLatestPrices = useCallback(async () => {
    try {
      const prices = await fetchLatestPrices();
      setLatestPrices(prices);
    } catch (e) {
      console.error("Failed to load latest prices:", e);
    }
  }, []);

  const loadOHLCV = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOHLCV(selectedSymbol, timeframe, 500);
      setOhlcv(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, timeframe]);

  const refreshOHLCV = useCallback(async () => {
    try {
      const data = await fetchOHLCV(selectedSymbol, timeframe, 500);
      setOhlcv(data);
    } catch (e) {
      console.error("Failed to refresh OHLCV:", e);
    }
  }, [selectedSymbol, timeframe]);

  useEffect(() => {
    fetchSymbols()
      .then((s) => setSymbols(s.map((x) => x.symbol)))
      .catch(console.error);
    loadLatestPrices();
  }, [loadLatestPrices]);

  useEffect(() => {
    loadOHLCV();
  }, [loadOHLCV]);

  useEffect(() => {
    setAnalysisLoading(true);
    fetchAnalysis(selectedSymbol, timeframe)
      .then(setAnalysis)
      .catch((e) => console.error("Analysis failed:", e))
      .finally(() => setAnalysisLoading(false));
  }, [selectedSymbol, timeframe]);

  useEffect(() => {
    setBacktestLoading(true);
    fetchBacktest(selectedSymbol, timeframe)
      .then(setBacktest)
      .catch((e) => console.error("Backtest failed:", e))
      .finally(() => setBacktestLoading(false));
  }, [selectedSymbol, timeframe]);

  const wsConnected = tickerConnected && klineConnected;

  // Fallback REST polling when WebSocket is down
  useEffect(() => {
    if (wsConnected) return;
    const interval = setInterval(() => {
      loadLatestPrices();
      refreshOHLCV();
    }, 10000);
    return () => clearInterval(interval);
  }, [wsConnected, loadLatestPrices, refreshOHLCV]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Crypto Analytics</h1>
          <p className="text-gray-400 mt-1">
            Real-time market data from Binance — BTC, ETH, BNB, XRP
          </p>
        </div>
        <LiveBadge connected={wsConnected} />
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {latestPrices.map((item) => (
          <PriceCard key={item.symbol} item={item} />
        ))}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4">
        <CoinSelector
          symbols={symbols}
          selected={selectedSymbol}
          onChange={setSelectedSymbol}
        />
        <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
      </section>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4">
          {error}
          <p className="text-sm mt-1 text-red-400">
            Make sure the backend is running (npm run be)
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-96 text-gray-400">
          Loading chart data...
        </div>
      ) : (
        <>
          <AnalysisPanel analysis={analysis} loading={analysisLoading} />
          <BacktestPanel result={backtest} loading={backtestLoading} />
          <PriceChart
            data={ohlcv}
            symbol={selectedSymbol}
            timeframe={timeframe}
            ema9={analysis?.ema9_overlay}
            ema21={analysis?.ema21_overlay}
          />
          <PriceTable data={ohlcv} symbol={selectedSymbol} />
        </>
      )}
    </main>
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

export interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolInfo {
  symbol: string;
  base: string;
  quote: string;
}

export interface LatestPrice {
  symbol: string;
  base: string;
  price: number;
  change_24h: number | null;
}

export async function fetchOHLCV(
  symbol: string,
  timeframe: string = "1h",
  limit: number = 500
): Promise<OHLCVCandle[]> {
  const params = new URLSearchParams({ symbol, timeframe, limit: String(limit) });
  const res = await fetch(`${API_BASE}/api/market/ohlcv?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch OHLCV: ${res.statusText}`);
  return res.json();
}

export async function fetchLatestPrices(): Promise<LatestPrice[]> {
  const res = await fetch(`${API_BASE}/api/market/latest`);
  if (!res.ok) throw new Error(`Failed to fetch latest prices: ${res.statusText}`);
  return res.json();
}

export async function fetchSymbols(): Promise<SymbolInfo[]> {
  const res = await fetch(`${API_BASE}/api/market/symbols`);
  if (!res.ok) throw new Error(`Failed to fetch symbols: ${res.statusText}`);
  return res.json();
}

export interface IndicatorDetail {
  name: string;
  value: number | string;
  signal: "bullish" | "bearish" | "neutral";
  weight: number;
  explanation: string;
}

export interface ChartPoint {
  timestamp: number;
  value: number;
}

export interface AnalysisResult {
  symbol: string;
  timeframe: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  confidence: number;
  current_price: number;
  bullish_score: number;
  bearish_score: number;
  net_score: number;
  summary: string;
  indicators: IndicatorDetail[];
  rsi_history: ChartPoint[];
  macd_history: ChartPoint[];
  ema9_overlay: ChartPoint[];
  ema21_overlay: ChartPoint[];
  volume_history: ChartPoint[];
}

export async function fetchAnalysis(
  symbol: string,
  timeframe: string = "1h"
): Promise<AnalysisResult> {
  const params = new URLSearchParams({ symbol, timeframe });
  const res = await fetch(`${API_BASE}/api/analysis?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch analysis: ${res.statusText}`);
  return res.json();
}

export interface BacktestTrade {
  entry_time: number;
  exit_time: number;
  type: string;
  entry_price: number;
  exit_price: number;
  pnl_pct: number;
  result: string;
  exit_reason: string;
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  stop_loss_pct: number;
  take_profit_pct: number;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  loss_rate: number;
  avg_win_pct: number;
  avg_loss_pct: number;
  profit_factor: number;
  total_pnl_pct: number;
  summary: string;
  trades: BacktestTrade[];
}

export async function fetchBacktest(
  symbol: string,
  timeframe: string = "1h",
  stopLoss: number = 2,
  takeProfit: number = 4
): Promise<BacktestResult> {
  const params = new URLSearchParams({
    symbol,
    timeframe,
    stop_loss: String(stopLoss),
    take_profit: String(takeProfit),
  });
  const res = await fetch(`${API_BASE}/api/backtest?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch backtest: ${res.statusText}`);
  return res.json();
}

export interface PaperPosition {
  type: "long" | "short";
  entry_price: number;
  notional: number;
  entry_time: number;
}

export interface PaperSignal {
  direction: string;
  confidence: number;
  net_score: number;
  summary: string;
}

export interface PaperTrade {
  entry_time: number;
  exit_time: number;
  type: string;
  symbol: string;
  entry_price: number;
  exit_price: number;
  notional: number;
  pnl_usdt: number;
  pnl_pct: number;
  result: string;
  exit_reason: string;
}

export interface PaperStats {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  loss_rate: number;
  total_pnl_usdt: number;
  total_pnl_pct: number;
}

export interface PaperStatus {
  running: boolean;
  initial_capital: number;
  balance: number;
  equity: number;
  symbol: string;
  timeframe: string;
  stop_loss_pct: number;
  take_profit_pct: number;
  min_confidence: number;
  position: PaperPosition | null;
  last_signal: PaperSignal | null;
  wait_reason: string | null;
  last_tick_at: number | null;
  current_price: number | null;
  unrealized_pnl_usdt: number;
  unrealized_pnl_pct: number;
  stats: PaperStats;
  trades: PaperTrade[];
}

export interface PaperStartParams {
  capital: number;
  symbol: string;
  timeframe: string;
  stop_loss_pct?: number;
  take_profit_pct?: number;
  min_confidence?: number;
}

async function paperFetch(path: string, init?: RequestInit): Promise<PaperStatus> {
  const res = await fetch(`${API_BASE}/api/paper${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export async function fetchPaperStatus(): Promise<PaperStatus> {
  return paperFetch("/status");
}

export async function startPaperBot(params: PaperStartParams): Promise<PaperStatus> {
  return paperFetch("/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function stopPaperBot(): Promise<PaperStatus> {
  return paperFetch("/stop", { method: "POST" });
}

export async function resetPaperBot(): Promise<PaperStatus> {
  return paperFetch("/reset", { method: "POST" });
}

export async function tickPaperBot(): Promise<PaperStatus> {
  return paperFetch("/tick", { method: "POST" });
}

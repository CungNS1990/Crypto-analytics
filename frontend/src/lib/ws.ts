import type { OHLCVCandle, LatestPrice } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";
export const WS_BASE = API_BASE.replace(/^http/, "ws");

export interface TickerMessage {
  type: "ticker";
  symbol: string;
  base: string;
  price: number;
  change_24h: number | null;
}

export interface KlineMessage {
  type: "kline";
  symbol: string;
  timeframe: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closed: boolean;
}

export function klineToCandle(msg: KlineMessage): OHLCVCandle {
  return {
    timestamp: msg.timestamp,
    open: msg.open,
    high: msg.high,
    low: msg.low,
    close: msg.close,
    volume: msg.volume,
  };
}

export function tickerToLatestPrice(msg: TickerMessage): LatestPrice {
  return {
    symbol: msg.symbol,
    base: msg.base,
    price: msg.price,
    change_24h: msg.change_24h,
  };
}

export function applyKlineUpdate(
  prev: OHLCVCandle[],
  candle: OHLCVCandle
): OHLCVCandle[] {
  if (prev.length === 0) return [candle];
  const last = prev[prev.length - 1];
  if (last.timestamp === candle.timestamp) {
    return [...prev.slice(0, -1), candle];
  }
  if (candle.timestamp > last.timestamp) {
    return [...prev, candle];
  }
  return prev;
}

export function buildWsUrl(path: string, params?: Record<string, string>): string {
  let url = `${WS_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (params) {
    url += `?${new URLSearchParams(params).toString()}`;
  }
  return url;
}

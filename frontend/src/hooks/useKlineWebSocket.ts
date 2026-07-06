"use client";

import { useEffect, useRef, useState } from "react";
import type { OHLCVCandle } from "@/lib/api";
import { buildWsUrl, klineToCandle, type KlineMessage } from "@/lib/ws";

const RECONNECT_MS = 3000;

export function useKlineWebSocket(
  symbol: string,
  timeframe: string,
  onKline: (candle: OHLCVCandle) => void
): boolean {
  const [connected, setConnected] = useState(false);
  const onKlineRef = useRef(onKline);
  onKlineRef.current = onKline;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    function connect() {
      ws = new WebSocket(
        buildWsUrl("/ws/kline", { symbol, timeframe })
      );

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as KlineMessage;
        if (msg.type === "kline") {
          onKlineRef.current(klineToCandle(msg));
        }
      };

      ws.onclose = (event) => {
        setConnected(false);
        if (event.code !== 1000) {
          console.warn("[WS kline] disconnected:", event.code, event.reason);
        }
        if (!closed) {
          reconnectTimer = setTimeout(connect, RECONNECT_MS);
        }
      };

      ws.onerror = () => ws?.close();
    }

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [symbol, timeframe]);

  return connected;
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { LatestPrice } from "@/lib/api";
import { buildWsUrl, tickerToLatestPrice, type TickerMessage } from "@/lib/ws";

const RECONNECT_MS = 3000;

export function useTickerWebSocket(
  onTicker: (price: LatestPrice) => void
): boolean {
  const [connected, setConnected] = useState(false);
  const onTickerRef = useRef(onTicker);
  onTickerRef.current = onTicker;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    function connect() {
      ws = new WebSocket(buildWsUrl("/ws/tickers"));

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as TickerMessage;
        if (msg.type === "ticker") {
          onTickerRef.current(tickerToLatestPrice(msg));
        }
      };

      ws.onclose = (event) => {
        setConnected(false);
        if (event.code !== 1000) {
          console.warn("[WS tickers] disconnected:", event.code, event.reason);
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
  }, []);

  return connected;
}

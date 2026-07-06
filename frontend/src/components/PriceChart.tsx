"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
} from "lightweight-charts";
import type { ChartPoint, OHLCVCandle } from "@/lib/api";

interface PriceChartProps {
  data: OHLCVCandle[];
  symbol: string;
  timeframe: string;
  ema9?: ChartPoint[];
  ema21?: ChartPoint[];
}

export default function PriceChart({
  data,
  symbol,
  timeframe,
  ema9 = [],
  ema21 = [],
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ema9Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema21Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const prevLenRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#111827" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      width: containerRef.current.clientWidth,
      height: 400,
    });

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const ema9Series = chart.addLineSeries({
      color: "#fbbf24",
      lineWidth: 1,
      title: "EMA9",
    });
    const ema21Series = chart.addLineSeries({
      color: "#818cf8",
      lineWidth: 1,
      title: "EMA21",
    });

    chartRef.current = chart;
    seriesRef.current = series;
    ema9Ref.current = ema9Series;
    ema21Ref.current = ema21Series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      ema9Ref.current = null;
      ema21Ref.current = null;
      initializedRef.current = false;
      prevLenRef.current = 0;
    };
  }, []);

  useEffect(() => {
    initializedRef.current = false;
    prevLenRef.current = 0;
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const candleData = data.map((c) => ({
      time: (c.timestamp / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const lastPoint = candleData[candleData.length - 1];
    const prevLen = prevLenRef.current;

    if (!initializedRef.current || data.length < prevLen) {
      seriesRef.current.setData(candleData);
      chartRef.current?.timeScale().fitContent();
      initializedRef.current = true;
    } else if (data.length === prevLen) {
      seriesRef.current.update(lastPoint);
    } else if (data.length === prevLen + 1) {
      seriesRef.current.update(lastPoint);
    } else {
      seriesRef.current.setData(candleData);
    }

    prevLenRef.current = data.length;
  }, [data, symbol]);

  useEffect(() => {
    if (!ema9Ref.current || !ema21Ref.current) return;
    const toLine = (pts: ChartPoint[]) =>
      pts.map((p) => ({
        time: (p.timestamp / 1000) as UTCTimestamp,
        value: p.value,
      }));
    if (ema9.length) ema9Ref.current.setData(toLine(ema9));
    if (ema21.length) ema21Ref.current.setData(toLine(ema21));
  }, [ema9, ema21]);

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-400">
          {symbol} Candlestick Chart
        </h3>
        <div className="flex gap-3 text-xs">
          <span className="text-amber-400">— EMA9</span>
          <span className="text-indigo-400">— EMA21</span>
        </div>
      </div>
      <div ref={containerRef} />
    </div>
  );
}

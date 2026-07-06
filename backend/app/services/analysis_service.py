import pandas as pd

from app.services.indicators import add_indicators


def _signal_label(score: float) -> str:
    if score > 0:
        return "bullish"
    if score < 0:
        return "bearish"
    return "neutral"


def _analyze_row(row: pd.Series, prev: pd.Series) -> dict:
    indicators: list[dict] = []
    bullish = 0.0
    bearish = 0.0

    # RSI
    rsi = float(row["rsi"])
    if rsi < 30:
        rsi_score, rsi_exp = 1.5, f"RSI {rsi:.1f} — vùng quá bán, khả năng hồi phục tăng"
        bullish += 1.5
    elif rsi > 70:
        rsi_score, rsi_exp = -1.5, f"RSI {rsi:.1f} — vùng quá mua, áp lực bán tăng"
        bearish += 1.5
    elif rsi < 45:
        rsi_score, rsi_exp = 0.5, f"RSI {rsi:.1f} — momentum hơi yếu nhưng chưa oversold"
        bullish += 0.5
    elif rsi > 55:
        rsi_score, rsi_exp = -0.5, f"RSI {rsi:.1f} — momentum hơi mạnh, cần thận trọng"
        bearish += 0.5
    else:
        rsi_score, rsi_exp = 0, f"RSI {rsi:.1f} — vùng trung tính (45–55)"
    indicators.append(
        {
            "name": "RSI (14)",
            "value": round(rsi, 2),
            "signal": _signal_label(rsi_score),
            "weight": abs(rsi_score),
            "explanation": rsi_exp,
        }
    )

    # EMA trend
    ema9, ema21, ema50 = float(row["ema_9"]), float(row["ema_21"]), float(row["ema_50"])
    close = float(row["close"])
    if ema9 > ema21 > ema50:
        ema_score = 2.0
        ema_exp = "EMA 9 > 21 > 50 — xu hướng tăng rõ (golden alignment)"
        bullish += 2.0
    elif ema9 < ema21 < ema50:
        ema_score = -2.0
        ema_exp = "EMA 9 < 21 < 50 — xu hướng giảm rõ (death alignment)"
        bearish += 2.0
    elif ema9 > ema21:
        ema_score = 1.0
        ema_exp = f"EMA9 ({ema9:.2f}) cắt trên EMA21 ({ema21:.2f}) — tín hiệu tăng ngắn hạn"
        bullish += 1.0
    elif ema9 < ema21:
        ema_score = -1.0
        ema_exp = f"EMA9 ({ema9:.2f}) cắt dưới EMA21 ({ema21:.2f}) — tín hiệu giảm ngắn hạn"
        bearish += 1.0
    else:
        ema_score, ema_exp = 0, "EMA9 và EMA21 sát nhau — sideway"
    indicators.append(
        {
            "name": "EMA 9/21/50",
            "value": f"{ema9:.2f} / {ema21:.2f} / {ema50:.2f}",
            "signal": _signal_label(ema_score),
            "weight": abs(ema_score),
            "explanation": ema_exp,
        }
    )

    # MACD
    macd_hist = float(row["macd_hist"])
    prev_hist = float(prev["macd_hist"]) if pd.notna(prev["macd_hist"]) else 0
    if macd_hist > 0 and macd_hist > prev_hist:
        macd_score = 1.5
        macd_exp = f"MACD histogram dương ({macd_hist:.4f}) và đang tăng — momentum mua mạnh"
        bullish += 1.5
    elif macd_hist < 0 and macd_hist < prev_hist:
        macd_score = -1.5
        macd_exp = f"MACD histogram âm ({macd_hist:.4f}) và đang giảm — momentum bán mạnh"
        bearish += 1.5
    elif macd_hist > 0:
        macd_score = 0.75
        macd_exp = f"MACD histogram dương ({macd_hist:.4f}) — bias tăng"
        bullish += 0.75
    elif macd_hist < 0:
        macd_score = -0.75
        macd_exp = f"MACD histogram âm ({macd_hist:.4f}) — bias giảm"
        bearish += 0.75
    else:
        macd_score, macd_exp = 0, "MACD histogram gần 0 — không có momentum rõ"
    indicators.append(
        {
            "name": "MACD",
            "value": round(macd_hist, 4),
            "signal": _signal_label(macd_score),
            "weight": abs(macd_score),
            "explanation": macd_exp,
        }
    )

    # Bollinger Bands
    bb_upper, bb_lower = float(row["bb_upper"]), float(row["bb_lower"])
    bb_mid = float(row["bb_mid"])
    bb_range = bb_upper - bb_lower
    if bb_range > 0:
        position = (close - bb_lower) / bb_range
    else:
        position = 0.5
    if position < 0.2:
        bb_score = 1.0
        bb_exp = f"Giá gần dải dưới Bollinger ({bb_lower:.2f}) — có thể bounce lên"
        bullish += 1.0
    elif position > 0.8:
        bb_score = -1.0
        bb_exp = f"Giá gần dải trên Bollinger ({bb_upper:.2f}) — có thể pullback"
        bearish += 1.0
    else:
        bb_score, bb_exp = 0, f"Giá trong vùng giữa Bollinger ({bb_mid:.2f}) — bình thường"
    indicators.append(
        {
            "name": "Bollinger Bands",
            "value": round(position * 100, 1),
            "signal": _signal_label(bb_score),
            "weight": abs(bb_score),
            "explanation": bb_exp,
        }
    )

    # Volume
    vol = float(row["volume"])
    vol_sma = float(row["volume_sma"]) if pd.notna(row["volume_sma"]) else vol
    vol_ratio = vol / vol_sma if vol_sma > 0 else 1.0
    price_up = close >= float(prev["close"])
    if vol_ratio > 1.5 and price_up:
        vol_score = 1.0
        vol_exp = f"Volume cao gấp {vol_ratio:.1f}x TB, giá tăng — xác nhận lực mua"
        bullish += 1.0
    elif vol_ratio > 1.5 and not price_up:
        vol_score = -1.0
        vol_exp = f"Volume cao gấp {vol_ratio:.1f}x TB, giá giảm — xác nhận lực bán"
        bearish += 1.0
    elif vol_ratio < 0.7:
        vol_score, vol_exp = 0, f"Volume thấp ({vol_ratio:.1f}x TB) — thiếu xác nhận xu hướng"
    else:
        vol_score, vol_exp = 0, f"Volume bình thường ({vol_ratio:.1f}x trung bình 20 nến)"
    indicators.append(
        {
            "name": "Volume",
            "value": round(vol_ratio, 2),
            "signal": _signal_label(vol_score),
            "weight": abs(vol_score),
            "explanation": vol_exp,
        }
    )

    net = bullish - bearish
    max_possible = 7.75

    if net >= 1.5:
        direction = "LONG"
    elif net <= -1.5:
        direction = "SHORT"
    else:
        direction = "NEUTRAL"

    confidence = min(round(abs(net) / max_possible * 100, 1), 100)

    summary = _build_summary(direction, confidence, bullish, bearish, close)

    return {
        "direction": direction,
        "confidence": confidence,
        "bullish_score": round(bullish, 2),
        "bearish_score": round(bearish, 2),
        "net_score": round(net, 2),
        "current_price": close,
        "indicators": indicators,
        "summary": summary,
    }


def _build_summary(
    direction: str, confidence: float, bullish: float, bearish: float, price: float
) -> str:
    if direction == "LONG":
        action = "XU HƯỚNG TĂNG (LONG)"
        advice = "Các chỉ báo nghiêng về mua. Cân nhắc long với stop-loss dưới hỗ trợ gần nhất."
    elif direction == "SHORT":
        action = "XU HƯỚNG GIẢM (SHORT)"
        advice = "Các chỉ báo nghiêng về bán. Cân nhắc short hoặc tránh mua đuổi."
    else:
        action = "TRUNG LẬP (NEUTRAL)"
        advice = "Tín hiệu hỗn hợp, chưa rõ xu hướng. Nên chờ breakout hoặc tín hiệu rõ hơn."

    return (
        f"Nhận định: {action} — độ tin cậy {confidence:.0f}%. "
        f"Điểm bullish {bullish:.1f} vs bearish {bearish:.1f}. "
        f"Giá hiện tại ${price:,.2f}. {advice}"
    )


def analyze_ohlcv(data: list[dict], symbol: str, timeframe: str) -> dict:
    df = pd.DataFrame(data)
    if len(df) < 50:
        raise ValueError("Need at least 50 candles for analysis")

    df = add_indicators(df)
    df = df.dropna()
    if len(df) < 2:
        raise ValueError("Not enough data after indicator calculation")

    latest = df.iloc[-1]
    prev = df.iloc[-2]
    result = _analyze_row(latest, prev)

    history_len = 50
    tail = df.tail(history_len)

    def to_points(col: str, subset: pd.DataFrame | None = None) -> list[dict]:
        src = subset if subset is not None else df
        return [
            {"timestamp": int(r["timestamp"]), "value": round(float(r[col]), 4)}
            for _, r in src.iterrows()
            if pd.notna(r[col])
        ]

    result["symbol"] = symbol
    result["timeframe"] = timeframe
    result["rsi_history"] = to_points("rsi", tail)
    result["macd_history"] = to_points("macd_hist", tail)
    result["ema9_overlay"] = to_points("ema_9")
    result["ema21_overlay"] = to_points("ema_21")
    result["volume_history"] = to_points("volume", tail)

    return result

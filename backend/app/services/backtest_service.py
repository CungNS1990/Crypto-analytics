import pandas as pd

from app.services.analysis_service import _analyze_row
from app.services.indicators import add_indicators


def _get_direction(row: pd.Series, prev: pd.Series) -> str:
    return _analyze_row(row, prev)["direction"]


def run_backtest(
    data: list[dict],
    symbol: str,
    timeframe: str,
    stop_loss_pct: float = 0.02,
    take_profit_pct: float = 0.04,
) -> dict:
    df = pd.DataFrame(data)
    if len(df) < 50:
        raise ValueError("Need at least 50 candles for backtest")

    df = add_indicators(df).dropna().reset_index(drop=True)
    if len(df) < 10:
        raise ValueError("Not enough data after indicator calculation")

    trades: list[dict] = []
    position: dict | None = None

    for i in range(1, len(df)):
        row = df.iloc[i]
        prev = df.iloc[i - 1]
        ts = int(row["timestamp"])
        high = float(row["high"])
        low = float(row["low"])
        close = float(row["close"])

        if position:
            entry = position["entry_price"]
            ptype = position["type"]
            hit_sl = hit_tp = False
            exit_price = close

            if ptype == "long":
                sl_price = entry * (1 - stop_loss_pct)
                tp_price = entry * (1 + take_profit_pct)
                if low <= sl_price:
                    hit_sl, exit_price = True, sl_price
                elif high >= tp_price:
                    hit_tp, exit_price = True, tp_price
                pnl = (exit_price - entry) / entry * 100
            else:
                sl_price = entry * (1 + stop_loss_pct)
                tp_price = entry * (1 - take_profit_pct)
                if high >= sl_price:
                    hit_sl, exit_price = True, sl_price
                elif low <= tp_price:
                    hit_tp, exit_price = True, tp_price
                pnl = (entry - exit_price) / entry * 100

            if hit_sl or hit_tp:
                trades.append(
                    {
                        "entry_time": position["entry_time"],
                        "exit_time": ts,
                        "type": ptype,
                        "entry_price": round(entry, 4),
                        "exit_price": round(exit_price, 4),
                        "pnl_pct": round(pnl, 2),
                        "result": "WIN" if pnl > 0 else "LOSS",
                        "exit_reason": "TP" if hit_tp else "SL",
                    }
                )
                position = None
                continue

            direction = _get_direction(row, prev)
            if (ptype == "long" and direction == "SHORT") or (
                ptype == "short" and direction == "LONG"
            ):
                pnl = (
                    (close - entry) / entry * 100
                    if ptype == "long"
                    else (entry - close) / entry * 100
                )
                trades.append(
                    {
                        "entry_time": position["entry_time"],
                        "exit_time": ts,
                        "type": ptype,
                        "entry_price": round(entry, 4),
                        "exit_price": round(close, 4),
                        "pnl_pct": round(pnl, 2),
                        "result": "WIN" if pnl > 0 else "LOSS",
                        "exit_reason": "SIGNAL",
                    }
                )
                position = None

        if position is None:
            direction = _get_direction(row, prev)
            if direction == "LONG":
                position = {
                    "type": "long",
                    "entry_price": close,
                    "entry_time": ts,
                }
            elif direction == "SHORT":
                position = {
                    "type": "short",
                    "entry_price": close,
                    "entry_time": ts,
                }

    stats = _calc_stats(trades, stop_loss_pct, take_profit_pct, symbol, timeframe)
    stats["trades"] = trades[-50:]
    return stats


def _calc_stats(
    trades: list[dict],
    stop_loss_pct: float,
    take_profit_pct: float,
    symbol: str,
    timeframe: str,
) -> dict:
    total = len(trades)
    if total == 0:
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "stop_loss_pct": stop_loss_pct * 100,
            "take_profit_pct": take_profit_pct * 100,
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "win_rate": 0.0,
            "loss_rate": 0.0,
            "avg_win_pct": 0.0,
            "avg_loss_pct": 0.0,
            "profit_factor": 0.0,
            "total_pnl_pct": 0.0,
            "summary": "Không có lệnh nào được tạo trong khoảng dữ liệu này. Thử timeframe khác hoặc tăng số nến.",
            "trades": [],
        }

    wins = [t for t in trades if t["result"] == "WIN"]
    losses = [t for t in trades if t["result"] == "LOSS"]
    win_rate = len(wins) / total * 100
    loss_rate = len(losses) / total * 100
    avg_win = sum(t["pnl_pct"] for t in wins) / len(wins) if wins else 0
    avg_loss = sum(t["pnl_pct"] for t in losses) / len(losses) if losses else 0
    gross_profit = sum(t["pnl_pct"] for t in wins)
    gross_loss = abs(sum(t["pnl_pct"] for t in losses))
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else float("inf")
    total_pnl = sum(t["pnl_pct"] for t in trades)

    tp_count = sum(1 for t in trades if t["exit_reason"] == "TP")
    sl_count = sum(1 for t in trades if t["exit_reason"] == "SL")

    summary = (
        f"Backtest {symbol} ({timeframe}): {total} lệnh — "
        f"Thắng {len(wins)} ({win_rate:.1f}%), Thua {len(losses)} ({loss_rate:.1f}%). "
        f"Lời TB +{avg_win:.2f}%, Lỗ TB {avg_loss:.2f}%. "
        f"Profit Factor {profit_factor:.2f}, Tổng PnL {total_pnl:+.2f}%. "
        f"TP: {tp_count}, SL: {sl_count}, Đóng theo signal: {total - tp_count - sl_count}."
    )

    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "stop_loss_pct": round(stop_loss_pct * 100, 1),
        "take_profit_pct": round(take_profit_pct * 100, 1),
        "total_trades": total,
        "wins": len(wins),
        "losses": len(losses),
        "win_rate": round(win_rate, 1),
        "loss_rate": round(loss_rate, 1),
        "avg_win_pct": round(avg_win, 2),
        "avg_loss_pct": round(avg_loss, 2),
        "profit_factor": round(profit_factor, 2) if profit_factor != float("inf") else 999.0,
        "total_pnl_pct": round(total_pnl, 2),
        "summary": summary,
    }

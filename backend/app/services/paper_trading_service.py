import json
import time
from pathlib import Path

from app.services.analysis_service import analyze_ohlcv
from app.services.binance_service import binance_service

SESSION_FILE = Path(__file__).resolve().parents[2] / "data" / "paper_session.json"

# running chỉ tồn tại trong memory — không tự chạy lại khi reload trang
_bot_running = False

DEFAULT_SESSION = {
    "running": False,
    "initial_capital": 0.0,
    "balance": 0.0,
    "symbol": "BTC/USDT",
    "timeframe": "1h",
    "stop_loss_pct": 2.0,
    "take_profit_pct": 4.0,
    "min_confidence": 40.0,
    "position": None,
    "trades": [],
    "last_signal": None,
    "wait_reason": None,
    "last_tick_at": None,
}


def _load() -> dict:
    if SESSION_FILE.exists():
        with open(SESSION_FILE, encoding="utf-8") as f:
            return json.load(f)
    return DEFAULT_SESSION.copy()


def _save(session: dict) -> None:
    SESSION_FILE.parent.mkdir(exist_ok=True)
    to_save = {**session, "running": False}
    with open(SESSION_FILE, "w", encoding="utf-8") as f:
        json.dump(to_save, f, indent=2)


def _calc_stats(session: dict) -> dict:
    trades = session.get("trades", [])
    wins = [t for t in trades if t["pnl_usdt"] > 0]
    losses = [t for t in trades if t["pnl_usdt"] <= 0]
    total = len(trades)
    total_pnl = sum(t["pnl_usdt"] for t in trades)
    initial = session.get("initial_capital", 0) or 1
    return {
        "total_trades": total,
        "wins": len(wins),
        "losses": len(losses),
        "win_rate": round(len(wins) / total * 100, 1) if total else 0.0,
        "loss_rate": round(len(losses) / total * 100, 1) if total else 0.0,
        "total_pnl_usdt": round(total_pnl, 2),
        "total_pnl_pct": round(total_pnl / initial * 100, 2) if initial else 0.0,
    }


def _unrealized_pnl(position: dict, current_price: float) -> float:
    entry = position["entry_price"]
    notional = position["notional"]
    if position["type"] == "long":
        return (current_price - entry) / entry * notional
    return (entry - current_price) / entry * notional


def start_session(
    capital: float,
    symbol: str,
    timeframe: str,
    stop_loss_pct: float = 2.0,
    take_profit_pct: float = 4.0,
    min_confidence: float = 40.0,
) -> dict:
    global _bot_running
    _bot_running = True
    session = {
        **DEFAULT_SESSION,
        "initial_capital": capital,
        "balance": capital,
        "symbol": symbol,
        "timeframe": timeframe,
        "stop_loss_pct": stop_loss_pct,
        "take_profit_pct": take_profit_pct,
        "min_confidence": min_confidence,
        "position": None,
        "trades": [],
        "last_signal": None,
        "wait_reason": "Bot đang khởi động...",
        "last_tick_at": None,
    }
    _save(session)
    return get_status()


def stop_session() -> dict:
    global _bot_running
    _bot_running = False
    session = _load()
    session["wait_reason"] = "Bot đã dừng — bấm Bắt đầu bot để chạy lại"
    _save(session)
    return get_status()


def reset_session() -> dict:
    global _bot_running
    _bot_running = False
    _save(DEFAULT_SESSION.copy())
    return get_status()


def get_status() -> dict:
    session = _load()
    stats = _calc_stats(session)

    current_price = None
    unrealized = 0.0
    equity = session["balance"]

    if session.get("position"):
        try:
            tickers = binance_service.fetch_latest_prices()
            t = next((x for x in tickers if x["symbol"] == session["symbol"]), None)
            if t:
                current_price = t["price"]
                unrealized = _unrealized_pnl(session["position"], current_price)
                equity = session["balance"] + session["position"]["notional"] + unrealized
        except Exception:
            pass

    return {
        "running": _bot_running,
        "initial_capital": session["initial_capital"],
        "balance": round(session["balance"], 2),
        "equity": round(equity, 2),
        "symbol": session["symbol"],
        "timeframe": session["timeframe"],
        "stop_loss_pct": session["stop_loss_pct"],
        "take_profit_pct": session["take_profit_pct"],
        "min_confidence": session["min_confidence"],
        "position": session.get("position"),
        "last_signal": session.get("last_signal"),
        "wait_reason": session.get("wait_reason"),
        "last_tick_at": session.get("last_tick_at"),
        "current_price": current_price,
        "unrealized_pnl_usdt": round(unrealized, 2),
        "unrealized_pnl_pct": round(
            unrealized / session["position"]["notional"] * 100, 2
        )
        if session.get("position") and session["position"]["notional"]
        else 0.0,
        "stats": stats,
        "trades": session.get("trades", [])[-50:],
    }


def _close_position(
    session: dict, exit_price: float, reason: str, exit_time: int | None = None
) -> None:
    pos = session["position"]
    if not pos:
        return
    exit_time = exit_time or int(time.time() * 1000)
    pnl = _unrealized_pnl(pos, exit_price)
    session["balance"] += pos["notional"] + pnl
    session["trades"].append(
        {
            "entry_time": pos["entry_time"],
            "exit_time": exit_time,
            "type": pos["type"],
            "symbol": session["symbol"],
            "entry_price": pos["entry_price"],
            "exit_price": round(exit_price, 4),
            "notional": pos["notional"],
            "pnl_usdt": round(pnl, 2),
            "pnl_pct": round(pnl / pos["notional"] * 100, 2),
            "result": "WIN" if pnl > 0 else "LOSS",
            "exit_reason": reason,
        }
    )
    session["position"] = None


def _open_position(session: dict, direction: str, price: float, ts: int) -> None:
    notional = session["balance"]
    if notional <= 0:
        session["wait_reason"] = "Hết vốn, không thể mở lệnh"
        return
    session["balance"] = 0.0
    session["position"] = {
        "type": "long" if direction == "LONG" else "short",
        "entry_price": price,
        "notional": notional,
        "entry_time": ts,
    }
    session["wait_reason"] = None


def tick() -> dict:
    if not _bot_running:
        return get_status()

    session = _load()
    symbol = session["symbol"]
    timeframe = session["timeframe"]
    now = int(time.time() * 1000)

    try:
        data = binance_service.fetch_ohlcv(symbol, timeframe, 500)
        analysis = analyze_ohlcv(data, symbol, timeframe)
        current_price = analysis["current_price"]
        direction = analysis["direction"]
        confidence = analysis["confidence"]

        session["last_signal"] = {
            "direction": direction,
            "confidence": confidence,
            "net_score": analysis["net_score"],
            "summary": analysis["summary"][:120],
        }
        session["last_tick_at"] = now

        sl = session["stop_loss_pct"] / 100
        tp = session["take_profit_pct"] / 100
        min_conf = session["min_confidence"]

        pos = session.get("position")
        if pos:
            entry = pos["entry_price"]
            ptype = pos["type"]
            hit_sl = hit_tp = False

            if ptype == "long":
                if current_price <= entry * (1 - sl):
                    hit_sl = True
                elif current_price >= entry * (1 + tp):
                    hit_tp = True
            else:
                if current_price >= entry * (1 + sl):
                    hit_sl = True
                elif current_price <= entry * (1 - tp):
                    hit_tp = True

            if hit_tp:
                _close_position(session, current_price, "TP", now)
            elif hit_sl:
                _close_position(session, current_price, "SL", now)
            elif (ptype == "long" and direction == "SHORT") or (
                ptype == "short" and direction == "LONG"
            ):
                _close_position(session, current_price, "SIGNAL", now)

        if not session.get("position"):
            if direction == "NEUTRAL":
                session["wait_reason"] = (
                    f"Tín hiệu NEUTRAL — chờ xu hướng rõ hơn (score {analysis['net_score']:+.1f})"
                )
            elif confidence < min_conf:
                session["wait_reason"] = (
                    f"Tín hiệu {direction} nhưng confidence {confidence:.0f}% "
                    f"< ngưỡng {min_conf:.0f}% — chờ thêm"
                )
            else:
                _open_position(session, direction, current_price, now)
                session["wait_reason"] = f"Đã mở lệnh {direction} @ ${current_price:,.2f}"

        _save(session)
    except Exception as e:
        session["wait_reason"] = f"Lỗi tick: {e}"
        _save(session)

    return get_status()

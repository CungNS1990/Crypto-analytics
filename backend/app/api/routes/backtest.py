from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.schemas import BacktestResult
from app.services.backtest_service import run_backtest
from app.services.binance_service import binance_service

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


@router.get("", response_model=BacktestResult)
def get_backtest(
    symbol: str = Query(..., description="Trading pair, e.g. BTC/USDT"),
    timeframe: str = Query("1h", description="Candle timeframe: 15m, 1h, 1d"),
    limit: int = Query(500, ge=50, le=1000),
    stop_loss: float = Query(2.0, ge=0.5, le=10, description="Stop loss %"),
    take_profit: float = Query(4.0, ge=1, le=20, description="Take profit %"),
):
    if symbol not in settings.symbols:
        raise HTTPException(status_code=400, detail=f"Symbol {symbol} not supported")
    if timeframe not in settings.timeframes:
        raise HTTPException(
            status_code=400, detail=f"Timeframe {timeframe} not supported"
        )
    try:
        data = binance_service.fetch_ohlcv(symbol, timeframe, limit)
        return run_backtest(
            data,
            symbol,
            timeframe,
            stop_loss_pct=stop_loss / 100,
            take_profit_pct=take_profit / 100,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Backtest error: {e}")

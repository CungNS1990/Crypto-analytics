from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.schemas import LatestPrice, OHLCVCandle, SymbolInfo
from app.services.binance_service import binance_service

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/symbols", response_model=list[SymbolInfo])
def get_symbols():
    return [
        SymbolInfo(symbol=s, base=s.split("/")[0], quote=s.split("/")[1])
        for s in settings.symbols
    ]


@router.get("/ohlcv", response_model=list[OHLCVCandle])
def get_ohlcv(
    symbol: str = Query(..., description="Trading pair, e.g. BTC/USDT"),
    timeframe: str = Query("1h", description="Candle timeframe: 15m, 1h, 1d"),
    limit: int = Query(500, ge=1, le=1000),
):
    if symbol not in settings.symbols:
        raise HTTPException(status_code=400, detail=f"Symbol {symbol} not supported")
    if timeframe not in settings.timeframes:
        raise HTTPException(
            status_code=400, detail=f"Timeframe {timeframe} not supported"
        )
    try:
        data = binance_service.fetch_ohlcv(symbol, timeframe, limit)
        binance_service.cache_to_csv(symbol, timeframe, data)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Binance API error: {e}")


@router.get("/latest", response_model=list[LatestPrice])
def get_latest_prices():
    try:
        return binance_service.fetch_latest_prices()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Binance API error: {e}")

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.schemas import AnalysisResult
from app.services.analysis_service import analyze_ohlcv
from app.services.binance_service import binance_service

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("", response_model=AnalysisResult)
def get_analysis(
    symbol: str = Query(..., description="Trading pair, e.g. BTC/USDT"),
    timeframe: str = Query("1h", description="Candle timeframe: 15m, 1h, 1d"),
    limit: int = Query(500, ge=50, le=1000),
):
    if symbol not in settings.symbols:
        raise HTTPException(status_code=400, detail=f"Symbol {symbol} not supported")
    if timeframe not in settings.timeframes:
        raise HTTPException(
            status_code=400, detail=f"Timeframe {timeframe} not supported"
        )
    try:
        data = binance_service.fetch_ohlcv(symbol, timeframe, limit)
        return analyze_ohlcv(data, symbol, timeframe)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Analysis error: {e}")

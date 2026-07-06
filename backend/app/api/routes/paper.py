from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.config import settings
from app.services import paper_trading_service as paper

router = APIRouter(prefix="/api/paper", tags=["paper-trading"])


class PaperStartRequest(BaseModel):
    capital: float = Field(..., gt=0, le=1_000_000, description="Vốn thử nghiệm USDT")
    symbol: str = "BTC/USDT"
    timeframe: str = "1h"
    stop_loss_pct: float = Field(2.0, ge=0.5, le=10)
    take_profit_pct: float = Field(4.0, ge=1, le=20)
    min_confidence: float = Field(40.0, ge=20, le=90)


@router.get("/status")
def get_status():
    return paper.get_status()


@router.post("/start")
def start_bot(body: PaperStartRequest):
    if body.symbol not in settings.symbols:
        raise HTTPException(status_code=400, detail=f"Symbol {body.symbol} not supported")
    if body.timeframe not in settings.timeframes:
        raise HTTPException(
            status_code=400, detail=f"Timeframe {body.timeframe} not supported"
        )
    return paper.start_session(
        capital=body.capital,
        symbol=body.symbol,
        timeframe=body.timeframe,
        stop_loss_pct=body.stop_loss_pct,
        take_profit_pct=body.take_profit_pct,
        min_confidence=body.min_confidence,
    )


@router.post("/stop")
def stop_bot():
    return paper.stop_session()


@router.post("/reset")
def reset_bot():
    return paper.reset_session()


@router.post("/tick")
def run_tick():
    try:
        return paper.tick()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Tick error: {e}")

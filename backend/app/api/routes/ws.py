from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.config import settings
from app.services.binance_ws_manager import binance_ws_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/tickers")
async def ws_tickers(websocket: WebSocket):
    await websocket.accept()
    await binance_ws_manager.add_ticker_client(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await binance_ws_manager.remove_ticker_client(websocket)


@router.websocket("/ws/kline")
async def ws_kline(
    websocket: WebSocket,
    symbol: str = Query(...),
    timeframe: str = Query("1h"),
):
    if symbol not in settings.symbols:
        await websocket.close(code=4000, reason="Symbol not supported")
        return
    if timeframe not in settings.timeframes:
        await websocket.close(code=4000, reason="Timeframe not supported")
        return

    await websocket.accept()
    await binance_ws_manager.add_kline_client(websocket, symbol, timeframe)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await binance_ws_manager.remove_kline_client(websocket, symbol, timeframe)

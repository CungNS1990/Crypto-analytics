import asyncio
import json
import logging

import websockets
from fastapi import WebSocket

from app.config import settings
from app.utils.symbols import from_binance_symbol, to_binance_symbol

logger = logging.getLogger(__name__)

BINANCE_WS_BASE = "wss://stream.binance.com:9443"


class BinanceWSManager:
    def __init__(self) -> None:
        self._ticker_clients: set[WebSocket] = set()
        self._ticker_task: asyncio.Task | None = None
        self._kline_clients: dict[str, set[WebSocket]] = {}
        self._kline_tasks: dict[str, asyncio.Task] = {}

    def _kline_key(self, symbol: str, timeframe: str) -> str:
        return f"{to_binance_symbol(symbol)}_{timeframe}"

    async def add_ticker_client(self, ws: WebSocket) -> None:
        self._ticker_clients.add(ws)
        if self._ticker_task is None or self._ticker_task.done():
            self._ticker_task = asyncio.create_task(self._run_ticker_stream())

    async def remove_ticker_client(self, ws: WebSocket) -> None:
        self._ticker_clients.discard(ws)
        if not self._ticker_clients and self._ticker_task and not self._ticker_task.done():
            self._ticker_task.cancel()
            self._ticker_task = None

    async def add_kline_client(self, ws: WebSocket, symbol: str, timeframe: str) -> None:
        key = self._kline_key(symbol, timeframe)
        if key not in self._kline_clients:
            self._kline_clients[key] = set()
        self._kline_clients[key].add(ws)
        if key not in self._kline_tasks or self._kline_tasks[key].done():
            self._kline_tasks[key] = asyncio.create_task(
                self._run_kline_stream(symbol, timeframe, key)
            )

    async def remove_kline_client(self, ws: WebSocket, symbol: str, timeframe: str) -> None:
        key = self._kline_key(symbol, timeframe)
        clients = self._kline_clients.get(key)
        if not clients:
            return
        clients.discard(ws)
        if not clients:
            self._kline_clients.pop(key, None)
            task = self._kline_tasks.pop(key, None)
            if task and not task.done():
                task.cancel()

    async def _broadcast(self, clients: set[WebSocket], message: dict) -> None:
        text = json.dumps(message)
        dead: list[WebSocket] = []
        for ws in clients:
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            clients.discard(ws)

    async def _run_ticker_stream(self) -> None:
        streams = "/".join(
            f"{to_binance_symbol(s)}@miniTicker" for s in settings.symbols
        )
        url = f"{BINANCE_WS_BASE}/stream?streams={streams}"

        while self._ticker_clients:
            try:
                async with websockets.connect(url) as binance_ws:
                    logger.info("Connected to Binance ticker stream")
                    async for raw in binance_ws:
                        if not self._ticker_clients:
                            break
                        payload = json.loads(raw)
                        data = payload.get("data", payload)
                        symbol = from_binance_symbol(data.get("s", ""))
                        message = {
                            "type": "ticker",
                            "symbol": symbol,
                            "base": symbol.split("/")[0],
                            "price": float(data.get("c", 0)),
                            "change_24h": float(data["P"])
                            if data.get("P") is not None
                            else None,
                        }
                        await self._broadcast(self._ticker_clients, message)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning("Ticker stream error: %s, reconnecting...", e)
                await asyncio.sleep(3)

    async def _run_kline_stream(self, symbol: str, timeframe: str, key: str) -> None:
        stream = f"{to_binance_symbol(symbol)}@kline_{timeframe}"
        url = f"{BINANCE_WS_BASE}/ws/{stream}"

        while self._kline_clients.get(key):
            try:
                async with websockets.connect(url) as binance_ws:
                    logger.info("Connected to Binance kline stream: %s", stream)
                    async for raw in binance_ws:
                        clients = self._kline_clients.get(key)
                        if not clients:
                            break
                        payload = json.loads(raw)
                        k = payload.get("k", {})
                        message = {
                            "type": "kline",
                            "symbol": symbol,
                            "timeframe": timeframe,
                            "timestamp": k.get("t"),
                            "open": float(k.get("o", 0)),
                            "high": float(k.get("h", 0)),
                            "low": float(k.get("l", 0)),
                            "close": float(k.get("c", 0)),
                            "volume": float(k.get("v", 0)),
                            "closed": k.get("x", False),
                        }
                        await self._broadcast(clients, message)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning("Kline stream %s error: %s, reconnecting...", key, e)
                await asyncio.sleep(3)


binance_ws_manager = BinanceWSManager()

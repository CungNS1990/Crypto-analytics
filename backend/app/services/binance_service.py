import asyncio
from pathlib import Path

import ccxt
import pandas as pd

from app.config import settings


class BinanceService:
    def __init__(self) -> None:
        self.exchange = ccxt.binance({"enableRateLimit": True})
        self.data_dir = Path(__file__).resolve().parents[2] / "data"
        self.data_dir.mkdir(exist_ok=True)

    def fetch_ohlcv(
        self, symbol: str, timeframe: str = "1h", limit: int | None = None
    ) -> list[dict]:
        limit = limit or settings.default_limit
        candles = self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
        return [
            {
                "timestamp": c[0],
                "open": c[1],
                "high": c[2],
                "low": c[3],
                "close": c[4],
                "volume": c[5],
            }
            for c in candles
        ]

    async def fetch_all_symbols(self, timeframe: str = "1h") -> dict[str, list[dict]]:
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(None, self.fetch_ohlcv, symbol, timeframe)
            for symbol in settings.symbols
        ]
        results = await asyncio.gather(*tasks)
        return dict(zip(settings.symbols, results))

    def fetch_latest_prices(self) -> list[dict]:
        tickers = self.exchange.fetch_tickers(settings.symbols)
        prices = []
        for symbol in settings.symbols:
            ticker = tickers.get(symbol, {})
            base = symbol.split("/")[0]
            prices.append(
                {
                    "symbol": symbol,
                    "base": base,
                    "price": ticker.get("last", 0.0) or 0.0,
                    "change_24h": ticker.get("percentage"),
                }
            )
        return prices

    def cache_to_csv(self, symbol: str, timeframe: str, data: list[dict]) -> None:
        safe_symbol = symbol.replace("/", "_")
        filepath = self.data_dir / f"{safe_symbol}_{timeframe}.csv"
        df = pd.DataFrame(data)
        df.to_csv(filepath, index=False)


binance_service = BinanceService()

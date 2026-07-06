from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analysis, backtest, market, paper, ws
from app.config import settings

app = FastAPI(
    title="Crypto Analytics API",
    description="Market data API for BTC, ETH, BNB, XRP from Binance",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router)
app.include_router(analysis.router)
app.include_router(backtest.router)
app.include_router(paper.router)
app.include_router(ws.router)


@app.get("/health")
def health():
    return {"status": "ok"}

from pydantic import BaseModel


class OHLCVCandle(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class SymbolInfo(BaseModel):
    symbol: str
    base: str
    quote: str


class LatestPrice(BaseModel):
    symbol: str
    base: str
    price: float
    change_24h: float | None = None


class IndicatorDetail(BaseModel):
    name: str
    value: float | str
    signal: str
    weight: float
    explanation: str


class ChartPoint(BaseModel):
    timestamp: int
    value: float


class AnalysisResult(BaseModel):
    symbol: str
    timeframe: str
    direction: str
    confidence: float
    current_price: float
    bullish_score: float
    bearish_score: float
    net_score: float
    summary: str
    indicators: list[IndicatorDetail]
    rsi_history: list[ChartPoint]
    macd_history: list[ChartPoint]
    ema9_overlay: list[ChartPoint]
    ema21_overlay: list[ChartPoint]
    volume_history: list[ChartPoint]


class BacktestTrade(BaseModel):
    entry_time: int
    exit_time: int
    type: str
    entry_price: float
    exit_price: float
    pnl_pct: float
    result: str
    exit_reason: str


class BacktestResult(BaseModel):
    symbol: str
    timeframe: str
    stop_loss_pct: float
    take_profit_pct: float
    total_trades: int
    wins: int
    losses: int
    win_rate: float
    loss_rate: float
    avg_win_pct: float
    avg_loss_pct: float
    profit_factor: float
    total_pnl_pct: float
    summary: str
    trades: list[BacktestTrade]

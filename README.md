# Crypto Analytics

Monorepo for crypto price analysis — Phase 1: market data collection from Binance.

## Stack

- **Backend:** Python 3.11+, FastAPI, ccxt, pandas
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, lightweight-charts

## Supported coins

BTC/USDT, ETH/USDT, BNB/USDT, XRP/USDT

## Quick start

### Cài đặt lần đầu (1 lần)

```bash
npm run setup
```

### Chạy hàng ngày

```bash
# Terminal 1 — Backend (mặc định port 8002)
npm run be

# Terminal 2 — Frontend
npm run fe
```

- API docs: http://localhost:8002/docs
- Dashboard: http://localhost:3000

> Mặc định backend chạy port **8002** (tránh xung đột port 8000 cũ trên Windows).

**Realtime:** Dùng `npm run be` (không reload). Nếu badge hiện "WS offline", hãy Ctrl+C tất cả terminal backend cũ rồi chạy lại `npm run be`. Tránh `npm run be:reload` khi cần WebSocket.

### Chi tiết (nếu cần)

**Backend** — hoặc chạy trực tiếp:

```bash
cd backend
dev.bat          # Windows
./dev.sh         # macOS/Linux
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/market/symbols` | List supported trading pairs |
| GET | `/api/market/ohlcv?symbol=BTC/USDT&timeframe=1h&limit=500` | OHLCV candle data |
| GET | `/api/market/latest` | Latest prices for all coins |
| GET | `/api/analysis?symbol=BTC/USDT&timeframe=1h` | Technical analysis: LONG/SHORT/NEUTRAL + indicators |
| GET | `/api/backtest?symbol=BTC/USDT&timeframe=1h&stop_loss=2&take_profit=4` | Paper trading backtest: win/loss rate |

## WebSocket (realtime)

| Endpoint | Description |
|----------|-------------|
| `ws://localhost:8000/ws/tickers` | Live price updates for all 4 coins (Binance miniTicker) |
| `ws://localhost:8000/ws/kline?symbol=BTC/USDT&timeframe=1h` | Live candle updates for chart |

Flow: REST loads history on page load → WebSocket pushes live updates.

## Project structure

```
Crypto-analytics/
├── backend/          # FastAPI + ccxt data fetcher
│   ├── app/
│   │   ├── api/routes/market.py
│   │   ├── services/binance_service.py
│   │   └── models/schemas.py
│   └── data/         # CSV cache (gitignored)
└── frontend/         # Next.js dashboard
    └── src/
        ├── app/page.tsx
        ├── components/
        └── lib/api.ts
```

## Environment variables

Copy `backend/.env.example` to `backend/.env` if needed.

Frontend API URL (optional):

```
NEXT_PUBLIC_API_URL=http://localhost:8002
```

## Deploy (free via GitHub)

Xem hướng dẫn chi tiết: **[DEPLOY.md](./DEPLOY.md)**

- **Backend:** Render (free) — file `render.yaml`
- **Frontend:** Vercel (free) — root directory `frontend`

## Next phases

- Phase 2: Technical indicators (RSI, EMA, MACD) + Long/Short signals + backtest
- Phase 3: LLM analysis layer
- Phase 4: Auto-trade futures

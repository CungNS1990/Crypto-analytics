from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    symbols: list[str] = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "XRP/USDT"]
    timeframes: list[str] = ["15m", "1h", "1d"]
    default_limit: int = 500
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()

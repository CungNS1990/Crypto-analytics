import json

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    symbols: list[str] = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "XRP/USDT"]
    timeframes: list[str] = ["15m", "1h", "1d"]
    default_limit: int = 500
    cors_origins: list[str] = ["http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, list):
            return value
        raw = value.strip()
        if raw.startswith("["):
            return json.loads(raw)
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()

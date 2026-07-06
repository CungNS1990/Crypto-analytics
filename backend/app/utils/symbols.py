def to_binance_symbol(symbol: str) -> str:
    return symbol.replace("/", "").lower()


def from_binance_symbol(binance_symbol: str) -> str:
    if binance_symbol.endswith("USDT"):
        base = binance_symbol[:-4]
        return f"{base}/USDT"
    return binance_symbol

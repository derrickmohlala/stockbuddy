#!/usr/bin/env python3
"""
Backfill historical prices for JSE instruments. Prefers live Yahoo Finance data,
falls back to deterministic synthetic prices only if all live sources fail.
"""

from app import app
from models import db, Instrument, Price
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
import hashlib
import random
import time
import requests

YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (StockBuddy/1.0; +https://github.com/derrickmohlala/stockbuddy)"
}

try:
    import yfinance as yf
except ImportError:  # pragma: no cover - local dev convenience
    yf = None


def _seed_from_symbol(symbol: str) -> random.Random:
    """Return a deterministic random generator per symbol."""
    digest = hashlib.sha256(symbol.encode("utf-8")).hexdigest()
    seed = int(digest[:8], 16)
    return random.Random(seed)


def _generate_synthetic_series(instrument, months: int = 72):
    """Generate a lightly trending synthetic monthly price series."""
    rng = _seed_from_symbol(instrument.symbol)
    today = date.today()

    if instrument.type == "etf":
        base_price = rng.uniform(35, 110)
        vol_floor, vol_cap = 0.005, 0.025
    elif instrument.type == "reit":
        base_price = rng.uniform(20, 60)
        vol_floor, vol_cap = 0.004, 0.02
    else:
        base_price = rng.uniform(45, 320)
        vol_floor, vol_cap = 0.006, 0.035

    prices = []
    price = base_price
    for step in range(months, 0, -1):
        # Walk backwards so earlier dates are first
        dt = today - relativedelta(months=step)
        drift = rng.uniform(-0.01, 0.018)
        volatility = rng.uniform(vol_floor, vol_cap)
        shock = rng.gauss(0, volatility / 2)
        price = max(5.0, price * (1 + drift + shock))
        dividend = 0.0
        if step % 3 == 0:
            dividend = round(price * rng.uniform(0.002, 0.012), 2)
        prices.append({
            "date": dt,
            "close": round(price, 2),
            "dividend": dividend
        })
    return prices


def _fetch_prices_from_yahoo_api(symbol: str):
    """Fetch historical prices directly from the public Yahoo Finance chart API."""
    try:
        response = requests.get(
            YAHOO_CHART_URL.format(symbol=symbol),
            params={"range": "10y", "interval": "1mo", "events": "div"},
            headers=YAHOO_HEADERS,
            timeout=15
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        print(f"  ✗ Yahoo chart API request failed for {symbol}: {exc}")
        return []

    result = (payload.get("chart") or {}).get("result")
    if not result:
        return []
    chart = result[0]
    timestamps = chart.get("timestamp") or []
    quote = (chart.get("indicators") or {}).get("quote") or [{}]
    quote_data = quote[0] if quote else {}
    closes = quote_data.get("close") or []
    dividends = ((chart.get("events") or {}).get("dividends") or {})

    dividend_map = {}
    for ts, div in dividends.items():
        try:
            dividend_map[int(ts)] = float(div.get("amount", 0.0))
        except (TypeError, ValueError):
            continue

    series = []
    for idx, ts in enumerate(timestamps):
        if ts is None:
            continue
        close_val = closes[idx] if idx < len(closes) else None
        if close_val is None or close_val <= 0:
            continue
        dt = datetime.fromtimestamp(ts).date()
        dividend = dividend_map.get(int(ts), 0.0)
        series.append({
            "date": dt,
            "close": round(float(close_val), 2),
            "dividend": round(dividend, 2)
        })

    return series


def _persist_price_series(instrument, series):
    """Replace instrument price history with provided series."""
    Price.query.filter_by(instrument_id=instrument.id).delete()
    entries = 0
    last_close = None
    for entry in series:
        db.session.add(Price(
            instrument_id=instrument.id,
            date=entry["date"],
            close=entry["close"],
            dividend=entry.get("dividend", 0.0)
        ))
        entries += 1
        last_close = entry["close"]
    db.session.commit()
    return entries, last_close


def backfill_prices():
    with app.app_context():
        instruments = Instrument.query.filter_by(is_active=True).all()
        
        print(f"Backfilling prices for {len(instruments)} instruments...")
        
        real_yf = 0
        real_yahoo = 0
        synthetic = 0
        failed = 0
        
        for instrument in instruments:
            print(f"Fetching prices for {instrument.symbol} ({instrument.name})...")
            price_written = False
            
            if yf:
                try:
                    ticker = yf.Ticker(instrument.symbol)
                    hist = ticker.history(period="10y", interval="1mo", auto_adjust=False)
                except Exception as e:
                    hist = None
                    print(f"  ✗ Error fetching {instrument.symbol} from yfinance: {e}")
                else:
                    if hist is not None and not hist.empty:
                        series = []
                        for date_idx, row in hist.iterrows():
                            close_price = float(row['Close'])
                            if close_price <= 0:
                                continue
                            dividend_value = float(row.get('Dividends', 0) or 0.0)
                            series.append({
                                "date": date_idx.date(),
                                "close": round(close_price, 2),
                                "dividend": round(dividend_value, 2)
                            })
                        if series:
                            entries, latest = _persist_price_series(instrument, series)
                            print(f"  ✓ Added {entries} price points via yfinance (latest: R{latest:.2f})")
                            real_yf += 1
                            price_written = True
                        else:
                            print(f"  ⚠ yfinance returned no usable data for {instrument.symbol}")
                    time.sleep(0.5)
            else:
                print("  ⚠ yfinance not available; skipping direct library fetch.")
            
            if not price_written:
                yahoo_series = _fetch_prices_from_yahoo_api(instrument.symbol)
                if yahoo_series:
                    entries, latest = _persist_price_series(instrument, yahoo_series)
                    print(f"  ✓ Added {entries} price points via Yahoo chart API (latest: R{latest:.2f})")
                    real_yahoo += 1
                    price_written = True
            
            if not price_written:
                print(f"  ⚠ No data found for {instrument.symbol} (skipping synthetic as requested)")
                failed += 1
        
        print(
            "\n✓ Price backfill completed: "
            f"{real_yf} via yfinance, {real_yahoo} via Yahoo API, "
            f"{synthetic} synthetic, {failed} failed"
        )
        if not yf:
            print("⚠ yfinance is not installed; considered Yahoo API and synthetic fallbacks only.")


if __name__ == "__main__":
    backfill_prices()

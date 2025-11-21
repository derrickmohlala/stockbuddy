#!/usr/bin/env python3
"""
Backfill historical prices for JSE instruments using yfinance.
Falls back to deterministic synthetic prices when live data isn't available.
"""

from app import app
from models import db, Instrument, Price
from datetime import date
from dateutil.relativedelta import relativedelta
import hashlib
import random
import time

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

def backfill_prices():
    with app.app_context():
        instruments = Instrument.query.filter_by(is_active=True).all()
        
        print(f"Backfilling prices for {len(instruments)} instruments from yfinance...")
        
        successful = 0
        synthetic = 0
        failed = 0
        
        for instrument in instruments:
            print(f"Fetching prices for {instrument.symbol} ({instrument.name})...")
            
            hist = None
            if yf:
                try:
                    # Fetch historical data from yfinance
                    ticker = yf.Ticker(instrument.symbol)
                    hist = ticker.history(period="10y", interval="1mo", auto_adjust=False)
                except Exception as e:
                    print(f"  ✗ Error fetching {instrument.symbol} from yfinance: {e}")
            
            if yf and hist is not None and not hist.empty:
                # Clear existing prices for this instrument
                Price.query.filter_by(instrument_id=instrument.id).delete()
                
                prices_added = 0
                for date_idx, row in hist.iterrows():
                    close_price = float(row['Close'])
                    if close_price > 0:  # Only add valid prices
                        price = Price(
                            instrument_id=instrument.id,
                            date=date_idx.date(),
                            close=round(close_price, 2),
                            dividend=round(float(row.get('Dividends', 0)), 2)
                        )
                        db.session.add(price)
                        prices_added += 1
                
                db.session.commit()
                
                if prices_added > 0:
                    latest_price = Price.query.filter_by(instrument_id=instrument.id)\
                        .order_by(Price.date.desc()).first()
                    print(f"  ✓ Added {prices_added} real price points (latest: R{latest_price.close:.2f})")
                    successful += 1
                else:
                    print(f"  ⚠ No usable prices returned for {instrument.symbol}, generating synthetic series instead")
                    hist = None  # Force fallback below
                
                # Be nice to the API - rate limiting
                time.sleep(0.5)
            
            if hist is None or (hasattr(hist, "empty") and hist.empty):
                print("  ↺ Using synthetic fallback data")
                Price.query.filter_by(instrument_id=instrument.id).delete()
                synthetic_series = _generate_synthetic_series(instrument)
                for entry in synthetic_series:
                    db.session.add(Price(
                        instrument_id=instrument.id,
                        date=entry["date"],
                        close=entry["close"],
                        dividend=entry["dividend"]
                    ))
                db.session.commit()
                synthetic += 1
                latest_price = synthetic_series[-1]["close"] if synthetic_series else None
                if latest_price:
                    print(f"  ~ Generated {len(synthetic_series)} synthetic price points (latest: R{latest_price:.2f})")
                else:
                    print("  ⚠ Failed to generate synthetic prices")
                    failed += 1
        
        print(f"\n✓ Price backfill completed: {successful} real, {synthetic} synthetic, {failed} failed")
        if not yf:
            print("⚠ yfinance is not installed; synthetic series were generated for all instruments.")
        elif synthetic > 0:
            print(f"⚠ {synthetic} instruments used synthetic pricing because live data was unavailable.")

# Synthetic fallback ensures endpoints always have price history even offline.

if __name__ == "__main__":
    backfill_prices()

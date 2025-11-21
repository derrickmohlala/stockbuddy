#!/usr/bin/env python3
"""
Backfill historical prices for JSE instruments using yfinance
"""

from app import app
from models import db, Instrument, Price
import yfinance as yf
from datetime import datetime, date, timedelta
import time

def backfill_prices():
    with app.app_context():
        instruments = Instrument.query.filter_by(is_active=True).all()
        
        print(f"Backfilling prices for {len(instruments)} instruments from yfinance...")
        
        successful = 0
        failed = 0
        
        for instrument in instruments:
            print(f"Fetching prices for {instrument.symbol} ({instrument.name})...")
            
            try:
                # Fetch historical data from yfinance
                ticker = yf.Ticker(instrument.symbol)
                hist = ticker.history(period="10y", interval="1mo", auto_adjust=False)
                
                if hist.empty:
                    print(f"  ⚠ No data found for {instrument.symbol} on yfinance")
                    failed += 1
                    continue
                
                # Clear existing prices for this instrument
                Price.query.filter_by(instrument_id=instrument.id).delete()
                
                # Add new prices
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
                    print(f"  ✓ Added {prices_added} price points (latest: R{latest_price.close:.2f})")
                    successful += 1
                else:
                    print(f"  ⚠ No valid prices found for {instrument.symbol}")
                    failed += 1
                
                # Be nice to the API - rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                print(f"  ✗ Error fetching {instrument.symbol}: {e}")
                import traceback
                traceback.print_exc()
                failed += 1
                continue
        
        print(f"\n✓ Price backfill completed: {successful} successful, {failed} failed")
        if failed > 0:
            print(f"⚠ {failed} instruments could not be fetched from yfinance. They will show 'No price data available'.")

# Mock price generation removed - only real prices from yfinance are used

if __name__ == "__main__":
    backfill_prices()

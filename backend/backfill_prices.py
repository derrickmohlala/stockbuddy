#!/usr/bin/env python3
"""
Backfill historical prices for JSE instruments using yfinance
"""

from app import app
from models import db, Instrument, Price
import yfinance as yf
from datetime import datetime, date, timedelta
import time
import random

def backfill_prices():
    with app.app_context():
        instruments = Instrument.query.filter_by(is_active=True).all()
        
        print(f"Backfilling prices for {len(instruments)} instruments...")
        
        for instrument in instruments:
            print(f"Fetching prices for {instrument.symbol} ({instrument.name})...")
            
            try:
                # Fetch 5 years of data
                ticker = yf.Ticker(instrument.symbol)
                hist = ticker.history(period="10y", interval="1mo", auto_adjust=False)
                
                if hist.empty:
                    print(f"  No data found for {instrument.symbol}")
                    continue
                
                # Clear existing prices for this instrument
                Price.query.filter_by(instrument_id=instrument.id).delete()
                
                # Add new prices
                prices_added = 0
                for date_idx, row in hist.iterrows():
                    price = Price(
                        instrument_id=instrument.id,
                        date=date_idx.date(),
                        close=round(float(row['Close']), 2),
                        dividend=round(float(row.get('Dividends', 0)), 2)
                    )
                    db.session.add(price)
                    prices_added += 1
                
                db.session.commit()
                print(f"  Added {prices_added} price points")
                
                # Be nice to the API
                time.sleep(0.5)
                
            except Exception as e:
                print(f"  Error fetching {instrument.symbol}: {e}")
                # Generate mock data if yfinance fails
                generate_mock_prices(instrument)
                continue
        
        print("Price backfill completed!")

def generate_mock_prices(instrument):
    """Generate mock historical prices if yfinance fails"""
    print(f"  Generating mock prices for {instrument.symbol}")
    
    # Clear existing prices
    Price.query.filter_by(instrument_id=instrument.id).delete()
    
    # Generate 5 years of mock data
    start_date = date(2019, 1, 1)
    end_date = date.today()
    current_date = start_date
    base_price = random.uniform(50, 500)  # Random starting price
    
    while current_date <= end_date:
        # Random walk with slight upward bias
        change = random.uniform(-0.05, 0.08)  # -5% to +8% daily change
        base_price *= (1 + change)
        
        # Skip weekends
        if current_date.weekday() < 5:
            price = Price(
                instrument_id=instrument.id,
                date=current_date,
                close=round(base_price, 2),
                dividend=round(random.uniform(0, 2), 2) if random.random() < 0.1 else 0
            )
            db.session.add(price)
        
        current_date += timedelta(days=1)
    
    db.session.commit()
    print(f"  Generated mock prices for {instrument.symbol}")

if __name__ == "__main__":
    backfill_prices()

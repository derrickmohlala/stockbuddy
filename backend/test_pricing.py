
import sys
import os
from datetime import datetime

# Add current directory to path
sys.path.append(os.getcwd())

from app import app, db, Instrument, Price, update_prices_batch
import yfinance as yf

def test_system():
    print("=== STOCKBUDDY PRICING DIAGNOSTIC ===")
    
    with app.app_context():
        # 1. Check Instruments
        instruments = Instrument.query.all()
        active = [i for i in instruments if i.is_active]
        print(f"Total Instruments: {len(instruments)}")
        print(f"Active Instruments: {len(active)}")
        
        if not active:
            print("FATAL: No active instruments found!")
            return

        # 2. Test yfinance single fetch
        test_symbol = "STX40.JO"
        print(f"\nTesting yfinance for {test_symbol}...")
        try:
            ticker = yf.Ticker(test_symbol)
            hist = ticker.history(period="5d")
            print(f"Result Key: {hist.keys()}")
            print(f"Rows returned: {len(hist)}")
            if not hist.empty:
                print(f"Latest Close: {hist['Close'].iloc[-1]}")
            else:
                print("WARNING: Empty history returned!")
        except Exception as e:
            print(f"FATAL: yfinance threw exception: {e}")

        # 3. Test Batch Update
        print("\nTesting update_prices_batch()...")
        try:
            result = update_prices_batch()
            print(f"Batch Result: {result}")
        except Exception as e:
            print(f"FATAL: Batch update crashed: {e}")

        # 4. Check DB
        latest = Price.query.order_by(Price.date.desc()).first()
        if latest:
            print(f"\nLatest Price in DB: {latest.date} - {latest.instrument_id} - {latest.close}")
        else:
            print("\nLatest Price in DB: NONE")

if __name__ == "__main__":
    test_system()

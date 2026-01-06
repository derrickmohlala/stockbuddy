import sys
import os
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), '..'))

from app import app, db, Price, Instrument

# --- INSTRUCTIONS ---
# 1. Look up the REAL dividends for your main holdings (e.g. on Sharenet or Moneyweb).
# 2. Add them to the list below.
# 3. Run this script: python3 seed_dividends_manual.py

# Format: (Symbol, "YYYY-MM-DD", Cent Amount per share)
REAL_DIVIDEND_DATA = [
    # Example: STX40 paid ~100 cents (estimated) - replace with REAL data
    ("STX40.JO", "2025-01-15", 45.0),
    ("STX40.JO", "2024-10-15", 42.5),
    ("STX40.JO", "2024-07-15", 40.0),
    ("STX40.JO", "2024-04-15", 38.0),
    
    # Add your other portfolio stocks here...
]

def seed_manual_dividends():
    with app.app_context():
        print(f"Processing {len(REAL_DIVIDEND_DATA)} manual dividend records...")
        
        count = 0
        for symbol, date_str, amount in REAL_DIVIDEND_DATA:
            instr = Instrument.query.filter_by(symbol=symbol).first()
            if not instr:
                print(f"Skipping {symbol} - Not found in DB")
                continue
                
            dt = datetime.strptime(date_str, "%Y-%m-%d").date()
            
            # Find the price record for this date (or create one if missing, though unlikely for major stocks)
            # Note: Dividends usually attached to a generic 'Price' entry.
            price_row = Price.query.filter_by(instrument_id=instr.id, date=dt).first()
            
            if price_row:
                print(f"Updating {symbol} on {dt}: {price_row.dividend} -> {amount}")
                price_row.dividend = float(amount)
                count += 1
            else:
                # If no price exists for that exact date, we might need to find the closest one 
                # OR create a new record. Creating new is safer but 'Close' might be 0.
                print(f"Warning: No price record found for {symbol} on {dt}. Creating dividend-only record.")
                # Try to get close price from previous day?
                # For now, just insert.
                new_price = Price(
                    instrument_id=instr.id,
                    date=dt,
                    close=0.0, # This might look weird on chart if not handled
                    dividend=float(amount)
                )
                db.session.add(new_price)
                count += 1
        
        db.session.commit()
        print(f"Successfully updated/added {count} dividend records.")

if __name__ == "__main__":
    seed_manual_dividends()

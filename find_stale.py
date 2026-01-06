import sys
import os
from datetime import date
from sqlalchemy import func

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, Price, Instrument

def find_stale_instruments():
    with app.app_context():
        cutoff = date(2026, 1, 1)
        print(f"Searching for instruments with no prices after {cutoff}...")
        
        # Query max date per instrument
        results = db.session.query(
            Instrument.symbol, 
            func.max(Price.date)
        ).join(Price).group_by(Instrument.id).all()
        
        stale_count = 0
        for sym, max_dt in results:
            # Handle case where max_dt is string or date
             if isinstance(max_dt, str):
                 max_dt_obj = date.fromisoformat(max_dt)
             else:
                 max_dt_obj = max_dt
                 
             if max_dt_obj < cutoff:
                 print(f"STALE: {sym} (Last: {max_dt})")
                 stale_count += 1
        
        if stale_count == 0:
            print("No stale instruments found. All have 2026 data.")
        else:
            print(f"Found {stale_count} stale instruments.")

if __name__ == "__main__":
    find_stale_instruments()

import sys
import os
from sqlalchemy import func

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, Price, Instrument, User, UserPosition

def check_dates():
    with app.app_context():
        # Get the first user (assuming it's the current user)
        # Or just checking all instruments is fine.
        
        print("--- checking Benchmark (STX40.JO) ---")
        instr = Instrument.query.filter_by(symbol='STX40.JO').first()
        if instr:
            max_date = db.session.query(func.max(Price.date)).filter_by(instrument_id=instr.id).scalar()
            print(f"STX40.JO Latest: {max_date}")
        else:
            print("STX40.JO not found")
            
        print("\n--- Checking All Instruments Latest Date ---")
        # Group by max date to see if there's a cluster of stale ones
        results = db.session.query(
            Instrument.symbol, 
            func.max(Price.date)
        ).join(Price).group_by(Instrument.id).all()
        
        # Sort by date
        results.sort(key=lambda x: x[1] if x[1] else str(datetime.min), reverse=True)
        
        print(f"Total Instruments with prices: {len(results)}")
        print("Top 5 Fresh:")
        for sym, dt in results[:5]:
            print(f"  {sym}: {dt}")
            
        print("Bottom 5 Stale:")
        for sym, dt in results[-5:]:
            print(f"  {sym}: {dt}")

if __name__ == "__main__":
    check_dates()

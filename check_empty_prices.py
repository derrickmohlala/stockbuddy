import sys
import os
from sqlalchemy import func

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, Price, Instrument, UserPosition

def find_empty_instruments():
    with app.app_context():
        # Get all instruments referenced by positions
        # We can't filter by user easily (script limitation), but we can check ALL positions
        distinct_symbols = db.session.query(UserPosition.symbol).distinct().all()
        distinct_symbols = [s[0] for s in distinct_symbols]
        print(f"Symbols in Portfolios: {distinct_symbols}")
        
        for sym in distinct_symbols:
            instr = Instrument.query.filter_by(symbol=sym).first()
            if not instr:
                print(f"WARN: Symbol {sym} in Position, but not in Instrument table!")
                continue
                
            count = Price.query.filter_by(instrument_id=instr.id).count()
            if count == 0:
                print(f"CRITICAL: {sym} has 0 price records!")
            else:
                # Check max date
                max_date = db.session.query(func.max(Price.date)).filter_by(instrument_id=instr.id).scalar()
                print(f"OK: {sym} has {count} prices. Last: {max_date}")

if __name__ == "__main__":
    find_empty_instruments()

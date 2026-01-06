import sys
import os
from sqlalchemy import func

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, Price, Instrument

def check_data_sample():
    with app.app_context():
        instr = Instrument.query.filter_by(symbol='STX40.JO').first()
        if not instr:
            print("STX40.JO not found")
            return

        # Get first and last date
        min_date = db.session.query(func.min(Price.date)).filter_by(instrument_id=instr.id).scalar()
        max_date = db.session.query(func.max(Price.date)).filter_by(instrument_id=instr.id).scalar()
        print(f"Date Range: {min_date} to {max_date}")
        
        # Sample rows
        rows = Price.query.filter_by(instrument_id=instr.id).order_by(Price.date.desc()).limit(5).all()
        for row in rows:
            print(f"Date: {row.date} | Close: {row.close} | Div: {row.dividend}")

if __name__ == "__main__":
    check_data_sample()

import sys
import os
from datetime import datetime, timedelta
from sqlalchemy import func

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, Price, Instrument

def check_density():
    with app.app_context():
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=90)
        
        symbol = 'STX40.JO'
        instr = Instrument.query.filter_by(symbol=symbol).first()
        if not instr:
            print("STX40 not found")
            return
            
        print(f"Checking {symbol} from {start_date} to {end_date}")
        
        prices = Price.query.filter(
            Price.instrument_id == instr.id,
            Price.date >= start_date,
            Price.date <= end_date
        ).order_by(Price.date.asc()).all()
        
        print(f"Total Rows: {len(prices)}")
        if not prices:
            print("No prices found.")
        else:
            print(f"First: {prices[0].date}, Last: {prices[-1].date}")
            print("Dates found:")
            for p in prices:
                print(f"  {p.date} : {p.close}")

if __name__ == "__main__":
    check_density()

import sys
import os
from sqlalchemy import func

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, Price, Instrument

def check_dividends():
    with app.app_context():
        # Get count of instruments
        total_instr = Instrument.query.count()
        print(f"Total Instruments: {total_instr}")

        # Check top holdings (guess) or just all
        # Let's check STX40.JO and a common stock like SBK.JO
        for symbol in ['STX40.JO', 'SBK.JO', 'NPN.JO', 'VKE.JO']:
            instr = Instrument.query.filter_by(symbol=symbol).first()
            if not instr:
                print(f"{symbol}: Not found")
                continue
                
            # Count prices
            price_count = Price.query.filter_by(instrument_id=instr.id).count()
            
            # Count non-zero dividends
            div_count = Price.query.filter(
                Price.instrument_id == instr.id, 
                Price.dividend > 0
            ).count()
            
            # Sum dividends last year
            last_year_div = db.session.query(func.sum(Price.dividend)).filter(
                Price.instrument_id == instr.id
            ).scalar()
            
            print(f"--- {symbol} ---")
            print(f"  Total Price Rows: {price_count}")
            print(f"  Dividend Pay Dates: {div_count}")
            print(f"  Total Dividends (Sum): {last_year_div}")
            print(f"  Static Yield (Instrument): {instr.dividend_yield}%")

if __name__ == "__main__":
    check_dividends()

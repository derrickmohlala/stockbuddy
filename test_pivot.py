import sys
import os
import pandas as pd
from sqlalchemy import func

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, Price, Instrument, User, UserPosition

def test_pivot_logic():
    with app.app_context():
        # Just get any positions
        positions = UserPosition.query.limit(5).all()
        if not positions:
            print("No positions found in DB.")
            return
            
        print(f"Testing with {len(positions)} positions.")
        
        instrument_ids = []
        symbol_quantities = {}
            
        instrument_ids = []
        symbol_quantities = {}
        for pos in positions:
            instr = Instrument.query.filter_by(symbol=pos.symbol).first()
            if instr:
                instrument_ids.append(instr.id)
                symbol_quantities[pos.symbol] = pos.quantity
                
        print(f"Instruments: {list(symbol_quantities.keys())}")
        
        # Fetch prices
        prices = Price.query.filter(
            Price.instrument_id.in_(instrument_ids)
        ).order_by(Price.date.asc()).all()
        
        if not prices:
            print("No prices found for portfolio.")
            return

        df = pd.DataFrame([
            {"date": p.date, "symbol": Instrument.query.get(p.instrument_id).symbol, "close": p.close}
            for p in prices
        ])
        
        print(f"Raw Price Rows: {len(df)}")
        print(f"Max Date in DF: {df['date'].max()}")
        
        # Pivot Logic
        price_pivot = df.pivot(index='date', columns='symbol', values='close').sort_index()
        print(f"Pivot Index End: {price_pivot.index[-1]}")
        print("Pivot Tail (Pre-Fill):")
        print(price_pivot.tail())
        
        price_pivot = price_pivot.ffill()
        print("Pivot Tail (Post-Fill):")
        print(price_pivot.tail())
        
        # Check if rows are dropped?
        # In app.py: price_pivot = price_pivot.ffill().dropna(axis=1, how='all')
        price_pivot = price_pivot.dropna(axis=1, how='all')
        
        print(f"Final Pivot End: {price_pivot.index[-1]}")

if __name__ == "__main__":
    test_pivot_logic()

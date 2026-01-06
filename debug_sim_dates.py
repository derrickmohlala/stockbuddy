import sys
import os
import pandas as pd
from datetime import date, timedelta
from sqlalchemy import func

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, Price, Instrument, simulate_path

def debug_simulation():
    with app.app_context():
        symbol = 'STX40.JO'
        instr = Instrument.query.filter_by(symbol=symbol).first()
        if not instr:
            print("STX40 not found")
            return

        end_date = date.today()
        # Last 6 months
        start_date = end_date - timedelta(days=180) 
        
        print(f"Fetching prices for {symbol} from {start_date} to {end_date}")
        prices = Price.query.filter(
            Price.instrument_id == instr.id,
            Price.date >= start_date,
            Price.date <= end_date
        ).order_by(Price.date.asc()).all()
        
        if not prices:
            print("No prices.")
            return

        df = pd.DataFrame([
            {"date": p.date, "symbol": symbol, "close": p.close, "dividend": p.dividend}
            for p in prices
        ])
        
        print(f"Price Dates in DB ({len(df)}):")
        print(df['date'].tail(10).tolist())
        
        # Prepare Pivot
        price_pivot = df.pivot(index='date', columns='symbol', values='close').ffill().dropna()
        price_pivot.index = pd.to_datetime(price_pivot.index)
        
        dividend_pivot = df.pivot(index='date', columns='symbol', values='dividend').fillna(0.0)
        dividend_pivot.index = pd.to_datetime(dividend_pivot.index)
        
        print(f"\nPivot Index Ends: {price_pivot.index[-1]}")
        
        # Run Simulation
        print("\nRunning simulate_path...")
        portfolio_series, _, _, _ = simulate_path(
            price_pivot,
            dividend_pivot,
            initial_units={symbol: 100.0},
            contribution_frequency='monthly',
            monthly_contribution=1000.0
        )
        
        print(f"Simulation Result Series Length: {len(portfolio_series)}")
        print("Last 5 points:")
        print(portfolio_series.tail())
        
        last_date = portfolio_series.index[-1]
        print(f"\nFinal Simulation Date: {last_date}")
        
        if last_date.year == 2025 and last_date.month == 11:
            print("!!! REPRODUCED: Simulation ends in Nov 2025 !!!")
        else:
            print("Simulation ends correctly (Dec or Jan).")

if __name__ == "__main__":
    debug_simulation()

import yfinance as yf
import pandas as pd

def test_dividends_property():
    symbol = "STX40.JO"
    print(f"Fetching dividends for {symbol} via .dividends property...")
    
    ticker = yf.Ticker(symbol)
    
    # Method 1: .dividends property
    divs = ticker.dividends
    print("\n--- ticker.dividends ---")
    print(f"Type: {type(divs)}")
    print(divs)
    
    if hasattr(divs, 'sum'):
        print(f"Total: {divs.sum()}")
        
    # Method 2: .actions property
    actions = ticker.actions
    print("\n--- ticker.actions ---")
    print(actions.head())
    
    # Method 3: .calendar
    calendar = ticker.calendar
    print("\n--- ticker.calendar ---")
    print(calendar)

if __name__ == "__main__":
    test_dividends_property()

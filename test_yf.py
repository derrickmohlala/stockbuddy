import yfinance as yf
import pandas as pd

def test_yfinance():
    symbol = "STX40.JO"
    print(f"Fetching {symbol} with period='max'...")
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period="max")
    
    print(f"Shape: {hist.shape}")
    print(hist.head())
    print(hist.tail())
    
    # Check frequency
    if len(hist) > 2:
        diff = hist.index[1] - hist.index[0]
        print(f"Time Diff: {diff}")
        
    print("\n--- Dividends ---")
    print(hist['Dividends'].sum())
    print(hist[hist['Dividends'] > 0])

if __name__ == "__main__":
    test_yfinance()

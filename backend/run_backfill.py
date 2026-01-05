#!/usr/bin/env python3
"""
Script to manually trigger price backfilling.
Run this on Render to populate the database with price data for graphs.
"""

from app import app
import sys

def run_backfill():
    with app.app_context():
        try:
            print("Starting price backfill...", file=sys.stderr)
            from backfill_prices import backfill_prices
            backfill_prices()
            print("✓ Price backfill finished successfully.", file=sys.stderr)
        except Exception as e:
            print(f"✗ Price backfill failed: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    run_backfill()

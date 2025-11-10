#!/usr/bin/env python3
"""
Seed script for South African CPI data
"""

from app import app
from models import db, CPI
from datetime import datetime, date
import random

def seed_cpi():
    with app.app_context():
        # Clear existing CPI data
        CPI.query.delete()
        
        # Generate mock CPI data from 2019 to 2024
        # Starting at 5% annual inflation (typical SA range)
        cpi_data = []
        current_cpi = 100.0  # Base index
        current_date = date(2019, 1, 1)
        
        while current_date <= date(2024, 12, 31):
            # Monthly inflation varies around 0.4% (5% annual)
            monthly_inflation = random.uniform(0.002, 0.006)  # 0.2% to 0.6%
            current_cpi *= (1 + monthly_inflation)
            
            cpi_entry = CPI(
                date=current_date,
                value=round(current_cpi, 2)
            )
            cpi_data.append(cpi_entry)
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        # Add all CPI entries to database
        for entry in cpi_data:
            db.session.add(entry)
        
        db.session.commit()
        print(f"Seeded {len(cpi_data)} CPI data points from 2019-2024")

if __name__ == "__main__":
    seed_cpi()

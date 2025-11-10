#!/usr/bin/env python3
"""
Seed script for JSE instruments (ETFs, Top 40 shares, REITs)
"""

from app import app
from models import db, Instrument
import json

def seed_instruments():
    with app.app_context():
        # Clear existing instruments
        Instrument.query.delete()
        
        instruments = [
            # ETFs
            {"symbol": "STX40.JO", "name": "Satrix Top 40 ETF", "type": "etf", "sector": "Broad Market", "dividend_yield": 2.5, "ter": 0.25},
            {"symbol": "STXDIV.JO", "name": "Satrix Dividend Plus ETF", "type": "etf", "sector": "Dividend", "dividend_yield": 4.2, "ter": 0.30},
            {"symbol": "STXRES.JO", "name": "Satrix Resource ETF", "type": "etf", "sector": "Resources", "dividend_yield": 3.1, "ter": 0.35},
            {"symbol": "STXIND.JO", "name": "Satrix Industrial ETF", "type": "etf", "sector": "Industrial", "dividend_yield": 2.8, "ter": 0.30},
            {"symbol": "STXFIN.JO", "name": "Satrix Financial ETF", "type": "etf", "sector": "Financial", "dividend_yield": 3.5, "ter": 0.30},
            {"symbol": "SYGWD.JO", "name": "Sygnia Itrix MSCI World ETF", "type": "etf", "sector": "Global", "dividend_yield": 1.8, "ter": 0.45},
            
            # Top 40 Shares - Banks
            {"symbol": "SBK.JO", "name": "Standard Bank Group", "type": "share", "sector": "Banking", "dividend_yield": 4.5},
            {"symbol": "FSR.JO", "name": "FirstRand", "type": "share", "sector": "Banking", "dividend_yield": 3.8},
            {"symbol": "ABG.JO", "name": "Absa Group", "type": "share", "sector": "Banking", "dividend_yield": 4.2},
            {"symbol": "NED.JO", "name": "Nedbank Group", "type": "share", "sector": "Banking", "dividend_yield": 3.9},
            
            # Top 40 Shares - Resources
            {"symbol": "NPN.JO", "name": "Naspers", "type": "share", "sector": "Technology", "dividend_yield": 0.8},
            {"symbol": "BHP.JO", "name": "BHP Group", "type": "share", "sector": "Mining", "dividend_yield": 5.2},
            {"symbol": "AGL.JO", "name": "Anglo American", "type": "share", "sector": "Mining", "dividend_yield": 4.8},
            {"symbol": "SOL.JO", "name": "Sasol", "type": "share", "sector": "Oil & Gas", "dividend_yield": 6.1},
            
            # Top 40 Shares - Retail
            {"symbol": "SHF.JO", "name": "Shoprite Holdings", "type": "share", "sector": "Retail", "dividend_yield": 2.9},
            {"symbol": "MRP.JO", "name": "Mr Price Group", "type": "share", "sector": "Retail", "dividend_yield": 3.2},
            {"symbol": "TFG.JO", "name": "The Foschini Group", "type": "share", "sector": "Retail", "dividend_yield": 4.1},
            
            # Top 40 Shares - Telecoms
            {"symbol": "VOD.JO", "name": "Vodacom Group", "type": "share", "sector": "Telecoms", "dividend_yield": 5.8},
            {"symbol": "MTN.JO", "name": "MTN Group", "type": "share", "sector": "Telecoms", "dividend_yield": 4.9},
            
            # Top 40 Shares - Healthcare
            {"symbol": "NTC.JO", "name": "Netcare", "type": "share", "sector": "Healthcare", "dividend_yield": 2.7},
            {"symbol": "LHC.JO", "name": "Life Healthcare", "type": "share", "sector": "Healthcare", "dividend_yield": 3.1},
            
            # REITs
            {"symbol": "GRT.JO", "name": "Growthpoint Properties", "type": "reit", "sector": "Property", "dividend_yield": 8.2},
            {"symbol": "RES.JO", "name": "Resilient REIT", "type": "reit", "sector": "Property", "dividend_yield": 7.8},
            {"symbol": "NRP.JO", "name": "NEPI Rockcastle", "type": "reit", "sector": "Property", "dividend_yield": 7.5},
            {"symbol": "VKE.JO", "name": "Vukile Property Fund", "type": "reit", "sector": "Property", "dividend_yield": 8.5},
            {"symbol": "HAR.JO", "name": "Harrow Properties", "type": "reit", "sector": "Property", "dividend_yield": 7.9},
            {"symbol": "RDF.JO", "name": "Redefine Properties", "type": "reit", "sector": "Property", "dividend_yield": 8.1},
            
            # Additional popular shares
            {"symbol": "CFR.JO", "name": "Compagnie Financière Richemont", "type": "share", "sector": "Luxury", "dividend_yield": 1.2},
            {"symbol": "CPI.JO", "name": "Capitec Bank", "type": "share", "sector": "Banking", "dividend_yield": 2.1},
            {"symbol": "DSY.JO", "name": "Discovery", "type": "share", "sector": "Insurance", "dividend_yield": 2.8},
            {"symbol": "BID.JO", "name": "Bid Corporation", "type": "share", "sector": "Food Services", "dividend_yield": 1.9},
            {"symbol": "IMP.JO", "name": "Impala Platinum", "type": "share", "sector": "Mining", "dividend_yield": 3.4},
        ]
        
        for instrument_data in instruments:
            instrument = Instrument(**instrument_data)
            db.session.add(instrument)
        
        db.session.commit()
        print(f"Seeded {len(instruments)} instruments")

if __name__ == "__main__":
    seed_instruments()

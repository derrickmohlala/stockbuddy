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
            # ========== ETFs ==========
            # Satrix ETFs
            {"symbol": "STX40.JO", "name": "Satrix Top 40 ETF", "type": "etf", "sector": "Broad Market", "dividend_yield": 2.5, "ter": 0.25},
            {"symbol": "STXDIV.JO", "name": "Satrix Dividend Plus ETF", "type": "etf", "sector": "Dividend", "dividend_yield": 4.2, "ter": 0.30},
            {"symbol": "STXRES.JO", "name": "Satrix Resource ETF", "type": "etf", "sector": "Resources", "dividend_yield": 3.1, "ter": 0.35},
            {"symbol": "STXIND.JO", "name": "Satrix Industrial ETF", "type": "etf", "sector": "Industrial", "dividend_yield": 2.8, "ter": 0.30},
            {"symbol": "STXFIN.JO", "name": "Satrix Financial ETF", "type": "etf", "sector": "Financial", "dividend_yield": 3.5, "ter": 0.30},
            {"symbol": "STXNDQ.JO", "name": "Satrix Nasdaq 100 ETF", "type": "etf", "sector": "Global", "dividend_yield": 0.8, "ter": 0.50},
            {"symbol": "STX500.JO", "name": "Satrix S&P 500 ETF", "type": "etf", "sector": "Global", "dividend_yield": 1.5, "ter": 0.45},
            
            # Sygnia ETFs
            {"symbol": "SYGWD.JO", "name": "Sygnia Itrix MSCI World ETF", "type": "etf", "sector": "Global", "dividend_yield": 1.8, "ter": 0.45},
            {"symbol": "SYGEM.JO", "name": "Sygnia Itrix MSCI EM ETF", "type": "etf", "sector": "Global", "dividend_yield": 2.2, "ter": 0.50},
            {"symbol": "SYGEU.JO", "name": "Sygnia Itrix MSCI Europe ETF", "type": "etf", "sector": "Global", "dividend_yield": 2.5, "ter": 0.50},
            
            # CoreShares ETFs
            {"symbol": "CORE50.JO", "name": "CoreShares Top 50 ETF", "type": "etf", "sector": "Broad Market", "dividend_yield": 2.8, "ter": 0.28},
            {"symbol": "CORE10.JO", "name": "CoreShares Top 10 ETF", "type": "etf", "sector": "Broad Market", "dividend_yield": 3.0, "ter": 0.30},
            
            # ========== JSE TOP 40 SHARES ==========
            # Banking & Financial Services
            {"symbol": "SBK.JO", "name": "Standard Bank Group", "type": "share", "sector": "Banking", "dividend_yield": 4.5},
            {"symbol": "FSR.JO", "name": "FirstRand", "type": "share", "sector": "Banking", "dividend_yield": 3.8},
            {"symbol": "ABG.JO", "name": "Absa Group", "type": "share", "sector": "Banking", "dividend_yield": 4.2},
            {"symbol": "NED.JO", "name": "Nedbank Group", "type": "share", "sector": "Banking", "dividend_yield": 3.9},
            {"symbol": "CPI.JO", "name": "Capitec Bank Holdings", "type": "share", "sector": "Banking", "dividend_yield": 2.1},
            {"symbol": "INL.JO", "name": "Investec", "type": "share", "sector": "Financial Services", "dividend_yield": 4.5},
            {"symbol": "DSY.JO", "name": "Discovery", "type": "share", "sector": "Insurance", "dividend_yield": 2.8},
            {"symbol": "SLM.JO", "name": "Sanlam", "type": "share", "sector": "Insurance", "dividend_yield": 5.2},
            {"symbol": "MNP.JO", "name": "Momentum Metropolitan", "type": "share", "sector": "Insurance", "dividend_yield": 4.8},
            {"symbol": "OMU.JO", "name": "Old Mutual", "type": "share", "sector": "Financial Services", "dividend_yield": 4.0},
            
            # Resources & Mining
            {"symbol": "BHP.JO", "name": "BHP Group", "type": "share", "sector": "Mining", "dividend_yield": 5.2},
            {"symbol": "AGL.JO", "name": "Anglo American", "type": "share", "sector": "Mining", "dividend_yield": 4.8},
            {"symbol": "GLN.JO", "name": "Glencore", "type": "share", "sector": "Mining", "dividend_yield": 3.5},
            {"symbol": "KIO.JO", "name": "Kumba Iron Ore", "type": "share", "sector": "Mining", "dividend_yield": 8.5},
            {"symbol": "IMP.JO", "name": "Impala Platinum", "type": "share", "sector": "Mining", "dividend_yield": 3.4},
            {"symbol": "AMS.JO", "name": "Anglo American Platinum", "type": "share", "sector": "Mining", "dividend_yield": 4.2},
            {"symbol": "NCM.JO", "name": "Newcrest Mining", "type": "share", "sector": "Mining", "dividend_yield": 2.8},
            {"symbol": "SOL.JO", "name": "Sasol", "type": "share", "sector": "Oil & Gas", "dividend_yield": 6.1},
            
            # Technology & Media
            {"symbol": "NPN.JO", "name": "Naspers", "type": "share", "sector": "Technology", "dividend_yield": 0.8},
            {"symbol": "PRX.JO", "name": "Prosus", "type": "share", "sector": "Technology", "dividend_yield": 0.5},
            {"symbol": "APH.JO", "name": "Alphawave IP Group", "type": "share", "sector": "Technology", "dividend_yield": 1.2},
            
            # Retail & Consumer Goods
            {"symbol": "SHP.JO", "name": "Shoprite Holdings", "type": "share", "sector": "Retail", "dividend_yield": 2.9},
            {"symbol": "MRP.JO", "name": "Mr Price Group", "type": "share", "sector": "Retail", "dividend_yield": 3.2},
            {"symbol": "TFG.JO", "name": "The Foschini Group", "type": "share", "sector": "Retail", "dividend_yield": 4.1},
            {"symbol": "TRU.JO", "name": "Truworths International", "type": "share", "sector": "Retail", "dividend_yield": 4.5},
            {"symbol": "WHL.JO", "name": "Woolworths Holdings", "type": "share", "sector": "Retail", "dividend_yield": 3.8},
            {"symbol": "SPP.JO", "name": "Spar Group", "type": "share", "sector": "Retail", "dividend_yield": 4.2},
            {"symbol": "PEP.JO", "name": "Pepkor Holdings", "type": "share", "sector": "Retail", "dividend_yield": 3.5},
            
            # Telecoms
            {"symbol": "VOD.JO", "name": "Vodacom Group", "type": "share", "sector": "Telecoms", "dividend_yield": 5.8},
            {"symbol": "MTN.JO", "name": "MTN Group", "type": "share", "sector": "Telecoms", "dividend_yield": 4.9},
            {"symbol": "TKG.JO", "name": "Telkom SA", "type": "share", "sector": "Telecoms", "dividend_yield": 4.2},
            
            # Healthcare
            {"symbol": "NTC.JO", "name": "Netcare", "type": "share", "sector": "Healthcare", "dividend_yield": 2.7},
            {"symbol": "LHC.JO", "name": "Life Healthcare Group", "type": "share", "sector": "Healthcare", "dividend_yield": 3.1},
            {"symbol": "APN.JO", "name": "Aspen Pharmacare", "type": "share", "sector": "Healthcare", "dividend_yield": 2.5},
            
            # Food & Beverages  
            {"symbol": "AFE.JO", "name": "AECI", "type": "share", "sector": "Chemicals", "dividend_yield": 3.2},
            {"symbol": "TBS.JO", "name": "Tiger Brands", "type": "share", "sector": "Food", "dividend_yield": 4.2},
            
            # Industrial & Construction
            {"symbol": "BID.JO", "name": "Bid Corporation", "type": "share", "sector": "Food Services", "dividend_yield": 1.9},
            {"symbol": "BVT.JO", "name": "Bidvest Group", "type": "share", "sector": "Industrial", "dividend_yield": 3.8},
            {"symbol": "BTI.JO", "name": "British American Tobacco", "type": "share", "sector": "Tobacco", "dividend_yield": 6.5},
            {"symbol": "BAW.JO", "name": "Barloworld", "type": "share", "sector": "Industrial", "dividend_yield": 3.5},
            
            # Luxury & Consumer
            {"symbol": "CFR.JO", "name": "Compagnie Financière Richemont", "type": "share", "sector": "Luxury", "dividend_yield": 1.2},
            
            # Diversified
            {"symbol": "RMH.JO", "name": "Remgro", "type": "share", "sector": "Diversified", "dividend_yield": 3.8},
            {"symbol": "RMI.JO", "name": "Rand Merchant Investment Holdings", "type": "share", "sector": "Diversified", "dividend_yield": 4.1},
            
            # ========== REITs ==========
            {"symbol": "GRT.JO", "name": "Growthpoint Properties", "type": "reit", "sector": "Property", "dividend_yield": 8.2},
            {"symbol": "RES.JO", "name": "Resilient REIT", "type": "reit", "sector": "Property", "dividend_yield": 7.8},
            {"symbol": "NRP.JO", "name": "NEPI Rockcastle", "type": "reit", "sector": "Property", "dividend_yield": 7.5},
            {"symbol": "VKE.JO", "name": "Vukile Property Fund", "type": "reit", "sector": "Property", "dividend_yield": 8.5},
            {"symbol": "HAR.JO", "name": "Harrow Properties", "type": "reit", "sector": "Property", "dividend_yield": 7.9},
            {"symbol": "RDF.JO", "name": "Redefine Properties", "type": "reit", "sector": "Property", "dividend_yield": 8.1},
            {"symbol": "ITE.JO", "name": "Italtile", "type": "reit", "sector": "Property", "dividend_yield": 6.8},
            {"symbol": "SAC.JO", "name": "SA Corporate Real Estate", "type": "reit", "sector": "Property", "dividend_yield": 7.2},
            {"symbol": "EMI.JO", "name": "Emira Property Fund", "type": "reit", "sector": "Property", "dividend_yield": 8.0},
            {"symbol": "ATL.JO", "name": "Attacq", "type": "reit", "sector": "Property", "dividend_yield": 7.5},
            {"symbol": "OCT.JO", "name": "Octodec Investments", "type": "reit", "sector": "Property", "dividend_yield": 7.8},
            {"symbol": "DIB.JO", "name": "Dipula Income Fund", "type": "reit", "sector": "Property", "dividend_yield": 8.3},
            {"symbol": "FBR.JO", "name": "Fairvest", "type": "reit", "sector": "Property", "dividend_yield": 8.0},
            {"symbol": "CLH.JO", "name": "City Lodge Hotels", "type": "reit", "sector": "Property", "dividend_yield": 6.5},
            
            # ========== MID-CAP & OTHER POPULAR SHARES ==========
            {"symbol": "ARI.JO", "name": "African Rainbow Minerals", "type": "share", "sector": "Mining", "dividend_yield": 4.5},
            {"symbol": "ANG.JO", "name": "Anglogold Ashanti", "type": "share", "sector": "Mining", "dividend_yield": 2.8},
            {"symbol": "CLS.JO", "name": "Clicks Group", "type": "share", "sector": "Retail", "dividend_yield": 2.8},
            {"symbol": "CVW.JO", "name": "Castleview Property Fund", "type": "reit", "sector": "Property", "dividend_yield": 7.0},
            {"symbol": "DTC.JO", "name": "Datatec", "type": "share", "sector": "Technology", "dividend_yield": 3.2},
            {"symbol": "EXX.JO", "name": "Exxaro Resources", "type": "share", "sector": "Mining", "dividend_yield": 5.5},
            {"symbol": "GND.JO", "name": "Grindrod", "type": "share", "sector": "Industrial", "dividend_yield": 2.5},
            {"symbol": "HRM.JO", "name": "Harmony Gold", "type": "share", "sector": "Mining", "dividend_yield": 2.0},
            {"symbol": "HYP.JO", "name": "Hyprop Investments", "type": "reit", "sector": "Property", "dividend_yield": 7.2},
            {"symbol": "IPL.JO", "name": "Imperial Logistics", "type": "share", "sector": "Logistics", "dividend_yield": 3.5},
            {"symbol": "JSE.JO", "name": "JSE Limited", "type": "share", "sector": "Financial Services", "dividend_yield": 4.0},
            {"symbol": "KAP.JO", "name": "KAP Industrial", "type": "share", "sector": "Industrial", "dividend_yield": 3.2},
            {"symbol": "MND.JO", "name": "Mondi", "type": "share", "sector": "Paper & Packaging", "dividend_yield": 4.5},
            {"symbol": "NVS.JO", "name": "Novus Holdings", "type": "share", "sector": "Printing", "dividend_yield": 4.2},
            {"symbol": "NWH.JO", "name": "Northam Platinum", "type": "share", "sector": "Mining", "dividend_yield": 2.5},
            {"symbol": "PAN.JO", "name": "Pan African Resources", "type": "share", "sector": "Mining", "dividend_yield": 4.8},
            {"symbol": "PPE.JO", "name": "PPC", "type": "share", "sector": "Construction", "dividend_yield": 3.5},
            {"symbol": "S32.JO", "name": "South32", "type": "share", "sector": "Mining", "dividend_yield": 4.2},
            {"symbol": "SAP.JO", "name": "Sappi", "type": "share", "sector": "Paper & Packaging", "dividend_yield": 3.8},
            {"symbol": "SUI.JO", "name": "Sun International", "type": "share", "sector": "Gaming", "dividend_yield": 2.5},
            {"symbol": "TSG.JO", "name": "Tsogo Sun Gaming", "type": "share", "sector": "Gaming", "dividend_yield": 3.0},
        ]
        
        for instrument_data in instruments:
            # Ensure is_active is explicitly set to True
            if 'is_active' not in instrument_data:
                instrument_data['is_active'] = True
            instrument = Instrument(**instrument_data)
            db.session.add(instrument)
        
        db.session.commit()
        instrument_count = Instrument.query.count()
        print(f"✓ Seeded {len(instruments)} instruments (total in database: {instrument_count})")

if __name__ == "__main__":
    seed_instruments()

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=True)  # Optional for backwards compat
    password_hash = db.Column(db.String(255), nullable=True)  # Optional for backwards compat
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    age_band = db.Column(db.String(20), nullable=True)      # 18-24, 25-34, 35-44, 45-54, 55+
    experience = db.Column(db.String(20), nullable=True)    # novice, intermediate, advanced
    goal = db.Column(db.String(50), nullable=True)          # growth, balanced, income
    risk = db.Column(db.Integer, nullable=True)             # slider value 0–100
    horizon = db.Column(db.String(20), nullable=True)       # short, medium, long
    anchor_stock = db.Column(db.String(50), nullable=True)  # e.g. Capitec
    literacy_level = db.Column(db.String(20), nullable=True)# novice, intermediate, advanced
    interests = db.Column(db.Text)                           # JSON array of interests
    cellphone = db.Column(db.String(20), nullable=True)      # Phone number
    province = db.Column(db.String(50), nullable=True)       # South African province
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class Instrument(db.Model):
    __tablename__ = "instruments"
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(20), unique=True, nullable=False)  # e.g. NPN.JO
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(20), nullable=False)         # etf, share, reit
    sector = db.Column(db.String(50), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    dividend_yield = db.Column(db.Float, default=0.0)
    ter = db.Column(db.Float, default=0.0)                  # Total Expense Ratio for ETFs
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class Price(db.Model):
    __tablename__ = "prices"
    __table_args__ = (
        db.Index('idx_price_instrument_date', 'instrument_id', 'date'),
    )
    id = db.Column(db.Integer, primary_key=True)
    instrument_id = db.Column(db.Integer, db.ForeignKey("instruments.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    close = db.Column(db.Float, nullable=False)
    dividend = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class Basket(db.Model):
    __tablename__ = "baskets"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)  # e.g. DREAMER, NAVIGATOR
    name = db.Column(db.String(100), nullable=False)
    goal = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    allocations = db.Column(db.Text)                         # JSON string
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class UserPortfolio(db.Model):
    __tablename__ = "user_portfolios"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    archetype = db.Column(db.String(50), nullable=False)     # Dreamer, Navigator, Anchor
    allocations = db.Column(db.Text)                         # JSON string
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class PortfolioBaseline(db.Model):
    __tablename__ = "portfolio_baselines"
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    allocations = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

class SuggestionAction(db.Model):
    __tablename__ = "suggestion_actions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    replace_symbol = db.Column(db.String(20), nullable=False)
    suggest_symbol = db.Column(db.String(20), nullable=False)
    action = db.Column(db.String(20), nullable=False)  # applied, dismissed
    details = db.Column(db.Text)  # optional json payload
    created_at = db.Column(db.DateTime, server_default=db.func.now(), index=True)

class UserPosition(db.Model):
    __tablename__ = "user_positions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    symbol = db.Column(db.String(20), nullable=False, index=True)
    quantity = db.Column(db.Float, nullable=False)
    avg_price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class UserTrade(db.Model):
    __tablename__ = "user_trades"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    symbol = db.Column(db.String(20), nullable=False, index=True)
    side = db.Column(db.String(10), nullable=False)         # buy, sell
    quantity = db.Column(db.Float, nullable=False)
    price = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now(), index=True)

class CPI(db.Model):
    __tablename__ = "cpi"
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    value = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

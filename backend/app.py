import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
from werkzeug.security import generate_password_hash, check_password_hash
import json
import uuid
import math
import random
import hashlib
import pandas as pd
import statistics
from urllib.parse import quote_plus

from models import db, User, Instrument, Price, Basket, UserPortfolio, UserPosition, UserTrade, CPI, PortfolioBaseline, SuggestionAction
from news_sources import fetch_live_news, fetch_upcoming_earnings

ARCHETYPE_CONFIG = {
    "Dreamer": {
        "goal": "growth",
        "risk_band": "high",
        "description": "Aggressive growth mix with outsized exposure to local and global equity indices plus high-conviction blue chips.",
        "persona": "Ambitious investors chasing capital expansion and comfortable with deep drawdowns.",
        "guidance": "Stay invested through full cycles and rebalance annually to keep offshore and tech exposure in check.",
        "anchor_cap_pct": 5,
        "sleeves": {
            "STX40.JO": 30,
            "STXIND.JO": 20,
            "SYGWD.JO": 15,
            "NPN.JO": 12,
            "MTN.JO": 8,
            "SBK.JO": 5,
            "SHP.JO": 5
        }
    },
    "Builder": {
        "goal": "growth",
        "risk_band": "medium",
        "description": "Growth-oriented core tilted to diversified indices with steadier blue-chip ballast.",
        "persona": "Long-term savers wanting equity-led compounding without the most extreme volatility.",
        "guidance": "Blend debit-order contributions with annual top-ups; review offshore weighting every 18 months.",
        "anchor_cap_pct": 5,
        "sleeves": {
            "STX40.JO": 28,
            "STXIND.JO": 18,
            "SYGWD.JO": 10,
            "STXDIV.JO": 10,
            "NPN.JO": 10,
            "SBK.JO": 9,
            "MTN.JO": 5,
            "SHP.JO": 5
        }
    },
    "Pathfinder": {
        "goal": "balanced",
        "risk_band": "high",
        "description": "Punchy balanced mix combining growth, dividend yield and a dash of resources for upside shocks.",
        "persona": "Investors who want diversification but still chase outperformance versus the ALSI.",
        "guidance": "Let resources ride in bull phases but trim back to targets during commodity rallies.",
        "anchor_cap_pct": 5,
        "sleeves": {
            "STX40.JO": 30,
            "STXDIV.JO": 15,
            "STXIND.JO": 10,
            "STXRES.JO": 10,
            "NPN.JO": 10,
            "MTN.JO": 8,
            "SBK.JO": 7,
            "SHP.JO": 5
        }
    },
    "Navigator": {
        "goal": "balanced",
        "risk_band": "medium",
        "description": "Core balanced allocation blending broad market ETFs, dividend coverage and household SA blue chips.",
        "persona": "Goal-driven builders seeking steady rand returns with limited downside surprises.",
        "guidance": "Reinvest distributions to fight inflation and keep blue-chip weights from drifting too high.",
        "anchor_cap_pct": 5,
        "sleeves": {
            "STX40.JO": 25,
            "STXDIV.JO": 20,
            "STXIND.JO": 15,
            "STXRES.JO": 8,
            "SBK.JO": 8,
            "NPN.JO": 7,
            "MTN.JO": 7,
            "SHP.JO": 5
        }
    },
    "Harvestor": {
        "goal": "income",
        "risk_band": "high",
        "description": "High-yield income blend focused on dividend ETFs and growth-orientated listed property.",
        "persona": "Income hunters comfortable with property cyclicality in exchange for stronger cash flow.",
        "guidance": "Monitor payout ratios and reinvest a portion of distributions to offset property-sector volatility.",
        "anchor_cap_pct": 5,
        "sleeves": {
            "STXDIV.JO": 25,
            "GRT.JO": 15,
            "NRP.JO": 15,
            "RDF.JO": 12,
            "VKE.JO": 10,
            "SBK.JO": 8,
            "MTN.JO": 5,
            "STX40.JO": 5
        }
    },
    "Provider": {
        "goal": "income",
        "risk_band": "medium",
        "description": "Steady rand income profile blending dividend ETFs with resilient REIT and bank exposure.",
        "persona": "Investors needing reliable payouts who still want modest capital growth.",
        "guidance": "Channel distributions into an emergency fund first, then reinvest overflow quarterly.",
        "anchor_cap_pct": 5,
        "sleeves": {
            "STXDIV.JO": 30,
            "GRT.JO": 15,
            "RDF.JO": 10,
            "STX40.JO": 10,
            "SBK.JO": 10,
            "VKE.JO": 10,
            "MTN.JO": 5,
            "NRP.JO": 5
        }
    },
    "Anchor": {
        "goal": "fallback",
        "risk_band": "low",
        "description": "Defensive fallback mix leaning on broad market and dividend ETFs with blue-chip ballast.",
        "persona": "Capital preservers prioritising rand stability and downside protection.",
        "guidance": "Keep contributions regular and revisit equity weights only if your risk tolerance shifts.",
        "anchor_cap_pct": 5,
        "sleeves": {
            "STX40.JO": 30,
            "STXDIV.JO": 25,
            "SBK.JO": 10,
            "NPN.JO": 10,
            "MTN.JO": 10,
            "STXIND.JO": 5,
            "SHP.JO": 5
        }
    }
}

BENCHMARK_CONFIG = {
    "STX40.JO": {"label": "Satrix Top 40 ETF", "drift": 0.0055, "vol": 0.02},
    "STXDIV.JO": {"label": "Satrix Dividend Plus ETF", "drift": 0.0045, "vol": 0.018},
    "SYGWD.JO": {"label": "Sygnia MSCI World ETF", "drift": 0.006, "vol": 0.021},
    "STXIND.JO": {"label": "Satrix Industrial ETF", "drift": 0.005, "vol": 0.019},
    "STXRES.JO": {"label": "Satrix Resources ETF", "drift": 0.0058, "vol": 0.023},
    "GRT.JO": {"label": "Growthpoint Properties", "drift": 0.0035, "vol": 0.018},
    "NRP.JO": {"label": "NEPI Rockcastle", "drift": 0.0038, "vol": 0.017}
}

app = Flask(__name__)

# Database configuration: Use PostgreSQL on Render, SQLite for local development
database_url = os.environ.get('DATABASE_URL')
if database_url:
    # PostgreSQL (Render): DATABASE_URL format is postgresql://user:pass@host:port/dbname
    # SQLAlchemy needs postgresql:// (not postgres://) for some versions
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    print(f"✓ Using PostgreSQL database: {database_url.split('@')[1] if '@' in database_url else 'configured'}")
else:
    # SQLite (local development): Use instance folder if it exists, otherwise current directory
    instance_path = os.path.join(os.path.dirname(__file__), '..', 'instance')
    if os.path.exists(instance_path):
        os.makedirs(instance_path, exist_ok=True)
        db_path = os.path.join(instance_path, 'stockbuddy.db')
    else:
        db_path = os.path.join(os.path.dirname(__file__), 'stockbuddy.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    print(f"✓ Using SQLite database: {db_path}")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

db.init_app(app)
CORS(app)
jwt = JWTManager(app)

def run_sqlite_migrations():
    """Run SQLite-specific migrations (only for local development)"""
    if 'sqlite' not in app.config['SQLALCHEMY_DATABASE_URI'].lower():
        # Not SQLite, skip migrations (PostgreSQL uses SQLAlchemy migrations)
        return
    
    try:
        import sqlite3
        
        # Extract database path from SQLite URI
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        if db_uri.startswith('sqlite:///'):
            db_path = db_uri.replace('sqlite:///', '')
        else:
            db_path = db_uri.replace('sqlite://', '')
        
        # If database doesn't exist yet, it will be created by db.create_all(), skip migration
        if not os.path.exists(db_path):
            print("Database not found yet, will be created by db.create_all()")
            return
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check existing columns
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add cellphone if missing
        if 'cellphone' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN cellphone VARCHAR(20)")
            conn.commit()
            print("✓ Added cellphone column to SQLite database")
        
        # Add province if missing
        if 'province' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN province VARCHAR(50)")
            conn.commit()
            print("✓ Added province column to SQLite database")
        
        conn.close()
        print("✓ SQLite migrations complete")
    except Exception as e:
        # Don't fail startup if migration has issues - just log it
        print(f"SQLite migration warning (non-fatal): {e}")

def auto_seed():
    """Automatically seed the database if it's empty or incomplete (first-time setup)"""
    try:
        # Check if database needs seeding by checking if instruments exist
        instrument_count = Instrument.query.count()
        EXPECTED_INSTRUMENTS = 90  # Expected number of instruments from seed_instruments.py (comprehensive list)
        
        # If we have a reasonable number of instruments, assume seeding is complete
        if instrument_count >= EXPECTED_INSTRUMENTS:
            print(f"✓ Database already seeded ({instrument_count} instruments), skipping auto-seed")
            return
        
        # If we have some instruments but not enough, re-seed (might be incomplete)
        if instrument_count > 0 and instrument_count < EXPECTED_INSTRUMENTS:
            print(f"⚠ Database appears partially seeded ({instrument_count}/{EXPECTED_INSTRUMENTS} instruments), re-seeding...")
        else:
            print("⚠ Database is empty, running automatic seeding...")
        
        # Import seed functions
        from seed_instruments import seed_instruments
        from seed_cpi import seed_cpi
        from seed_baskets import seed_baskets
        from backfill_prices import backfill_prices
        
        # Run all seed scripts in order
        print("Seeding instruments...")
        seed_instruments()
        
        # Verify instruments were seeded
        new_instrument_count = Instrument.query.count()
        if new_instrument_count < EXPECTED_INSTRUMENTS:
            print(f"⚠ Warning: Expected {EXPECTED_INSTRUMENTS} instruments but found {new_instrument_count}")
        else:
            print(f"✓ Seeded {new_instrument_count} instruments successfully")
        
        print("Seeding CPI data...")
        seed_cpi()
        
        print("Seeding baskets...")
        seed_baskets()
        
        print("Backfilling prices (this may take a minute)...")
        backfill_prices()
        
        print("✓ Automatic seeding completed successfully!")
        
    except Exception as e:
        # Don't fail app startup if seeding fails - just log it
        print(f"⚠ Auto-seed warning (non-fatal): {e}")
        import traceback
        traceback.print_exc()

with app.app_context():
    # Create all tables based on models
    db.create_all()
    # Run SQLite-specific migrations only for local development
    run_sqlite_migrations()
    # Auto-seed database if empty (first-time setup)
    auto_seed()

# Health check
@app.route("/api/health")
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

# Authentication endpoints
@app.route("/api/auth/register", methods=["POST"])
def register():
    import re
    import traceback
    
    try:
        data = request.json or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        first_name = data.get('first_name', '').strip()
        
        # Check if onboarding data is included (for unified signup flow)
        has_onboarding_data = all([
            data.get('age_band'),
            data.get('experience'),
            data.get('goal'),
            data.get('risk') is not None,
            data.get('horizon'),
            data.get('anchor_stock'),
            data.get('literacy_level')
        ])
        
        if not email or not password or not first_name:
            return jsonify({"error": "Email, password, and first name are required"}), 400
        
        # Validate email format
        email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_pattern, email):
            return jsonify({"error": "Please enter a valid email address"}), 400
        
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        if len(first_name) < 1:
            return jsonify({"error": "First name is required"}), 400
        
        # Check if user already exists
        existing = User.query.filter_by(email=email).first()
        if existing:
            return jsonify({"error": "A user with this email already exists"}), 400
        
        # Create new user with basic info
        try:
            password_hash = generate_password_hash(password)
            if isinstance(password_hash, bytes):
                password_hash = password_hash.decode('utf-8')
        except Exception as hash_error:
            print(f"Error hashing password: {hash_error}")
            traceback.print_exc()
            return jsonify({"error": "Unable to process password"}), 400
        
        user_data = {
            "email": email,
            "password_hash": password_hash,
            "first_name": first_name,
            "is_admin": False
        }
        
        # If onboarding data is provided, include it
        if has_onboarding_data:
            try:
                risk_value = int(data.get('risk'))
            except (TypeError, ValueError):
                risk_value = 50  # Default risk
            
            interests_value = data.get('interests', [])
            if not isinstance(interests_value, list):
                interests_value = []
            
            user_data.update({
                "age_band": str(data.get('age_band')).strip(),
                "experience": str(data.get('experience')).strip(),
                "goal": str(data.get('goal')).strip(),
                "risk": risk_value,
                "horizon": str(data.get('horizon')).strip(),
                "anchor_stock": str(data.get('anchor_stock')).strip(),
                "literacy_level": str(data.get('literacy_level')).strip(),
                "interests": json.dumps(interests_value)
            })
        
        # Create user
        user = User(**user_data)
        db.session.add(user)
        db.session.commit()
        
        # If onboarding data was provided, create portfolio immediately
        if has_onboarding_data:
            try:
                archetype = generate_archetype(user)
                allocations = generate_starter_allocations(user, archetype)
                
                # Create user portfolio
                portfolio = UserPortfolio(
                    user_id=user.id,
                    archetype=archetype,
                    allocations=json.dumps(allocations)
                )
                db.session.add(portfolio)
                db.session.commit()
                
                # Create initial positions
                try:
                    create_initial_positions(user.id, allocations)
                    db.session.commit()
                except Exception as pos_error:
                    db.session.rollback()
                    print(f"Warning: Failed to create initial positions for user {user.id}: {pos_error}")
                    traceback.print_exc()
                    # Continue without positions - user can add them later
                
                # Create baseline
                try:
                    baseline = PortfolioBaseline(
                        user_id=user.id,
                        allocations=json.dumps(allocations)
                    )
                    db.session.add(baseline)
                    db.session.commit()
                except Exception as baseline_error:
                    db.session.rollback()
                    print(f"Warning: Failed to create baseline for user {user.id}: {baseline_error}")
                    traceback.print_exc()
                    # Continue without baseline
            except Exception as portfolio_error:
                # Don't rollback user creation, just log the portfolio error
                print(f"Warning: Failed to create portfolio for user {user.id}: {portfolio_error}")
                traceback.print_exc()
                # Continue - user is created, portfolio can be set up later
        
        # Generate token
        access_token = create_access_token(identity=user.id, additional_claims={"is_admin": user.is_admin})
        
        # Determine if user is onboarded (has goal and risk)
        is_onboarded = bool(user.goal and user.risk is not None)
        
        return jsonify({
            "user_id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "is_admin": user.is_admin,
            "is_onboarded": is_onboarded,
            "access_token": access_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        error_detail = str(e)
        error_traceback = traceback.format_exc()
        print(f"Registration error: {error_detail}")
        print(error_traceback)
        
        # Provide more specific error messages
        if "UNIQUE constraint failed" in error_detail or "duplicate key" in error_detail.lower():
            return jsonify({"error": "A user with this email already exists"}), 400
        elif "NOT NULL constraint failed" in error_detail:
            return jsonify({"error": "Missing required information. Please fill in all fields.", "detail": error_detail}), 400
        elif "pattern" in error_detail.lower() or "match" in error_detail.lower():
            # Check for validation errors
            if "email" in error_detail.lower():
                return jsonify({"error": "Please enter a valid email address"}), 400
            else:
                return jsonify({"error": "Invalid input format", "detail": error_detail}), 400
        
        # Return 500 with error details so frontend can display it
        return jsonify({"error": "Unable to create user account. Please try again.", "detail": error_detail}), 500

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user or not user.password_hash:
        return jsonify({"error": "Invalid email or password"}), 401
    
    if not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401
    
    # Generate token
    access_token = create_access_token(identity=user.id, additional_claims={"is_admin": user.is_admin})
    
    # Determine if user is onboarded (has goal and risk)
    is_onboarded = bool(user.goal and user.risk is not None)
    
    return jsonify({
        "user_id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "is_admin": user.is_admin,
        "is_onboarded": is_onboarded,
        "access_token": access_token
    }), 200

@app.route("/api/auth/current", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "user_id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "is_admin": user.is_admin,
        "is_onboarded": bool(user.goal and user.risk is not None)
    }), 200

@app.route("/api/profile", methods=["GET"])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        interests = []
        if user.interests:
            try:
                interests = json.loads(user.interests)
            except:
                interests = []
        
        # Safely get cellphone and province (may not exist if migration hasn't run)
        cellphone = getattr(user, 'cellphone', None) or ""
        province = getattr(user, 'province', None) or ""
        
        return jsonify({
            "user_id": user.id,
            "email": user.email or "",
            "first_name": user.first_name or "",
            "cellphone": cellphone,
            "province": province,
            "age_band": user.age_band or "",
            "experience": user.experience or "",
            "goal": user.goal or "",
            "risk": user.risk or 50,
            "horizon": user.horizon or "",
            "anchor_stock": user.anchor_stock or "",
            "literacy_level": user.literacy_level or "",
            "interests": interests,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }), 200
    except Exception as e:
        import traceback
        error_detail = str(e)
        error_traceback = traceback.format_exc()
        print(f"Error fetching profile: {error_detail}")
        print(error_traceback)
        return jsonify({"error": "Failed to load profile", "detail": error_detail}), 500

@app.route("/api/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    import re
    from werkzeug.security import generate_password_hash, check_password_hash
    import traceback
    
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.json or {}
        
        # Update email if provided
        if 'email' in data:
            new_email = data.get('email', '').strip().lower()
            if new_email:
                # Validate email format
                email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
                if not re.match(email_pattern, new_email):
                    return jsonify({"error": "Please enter a valid email address"}), 400
                
                # Check if email is already taken by another user
                existing = User.query.filter_by(email=new_email).first()
                if existing and existing.id != user_id:
                    return jsonify({"error": "A user with this email already exists"}), 400
                
                user.email = new_email
        
        # Update password if provided
        if 'password' in data and data.get('password'):
            new_password = data.get('password')
            if len(new_password) < 6:
                return jsonify({"error": "Password must be at least 6 characters"}), 400
            
            try:
                password_hash = generate_password_hash(new_password)
                if isinstance(password_hash, bytes):
                    password_hash = password_hash.decode('utf-8')
                user.password_hash = password_hash
            except Exception as hash_error:
                print(f"Error hashing password: {hash_error}")
                return jsonify({"error": "Unable to update password"}), 400
        
        # Update other profile fields
        if 'first_name' in data:
            first_name = data.get('first_name', '').strip()
            if first_name:
                user.first_name = first_name
        
        if 'cellphone' in data:
            if hasattr(user, 'cellphone'):
                user.cellphone = data.get('cellphone', '').strip() or None
        
        if 'province' in data:
            if hasattr(user, 'province'):
                user.province = data.get('province', '').strip() or None
        
        if 'age_band' in data:
            user.age_band = data.get('age_band', '').strip() or None
        
        if 'experience' in data:
            user.experience = data.get('experience', '').strip() or None
        
        if 'goal' in data:
            user.goal = data.get('goal', '').strip() or None
        
        if 'risk' in data:
            try:
                user.risk = int(data.get('risk', 50))
            except (TypeError, ValueError):
                pass
        
        if 'horizon' in data:
            user.horizon = data.get('horizon', '').strip() or None
        
        if 'anchor_stock' in data:
            user.anchor_stock = data.get('anchor_stock', '').strip() or None
        
        if 'literacy_level' in data:
            user.literacy_level = data.get('literacy_level', '').strip() or None
        
        if 'interests' in data:
            interests_value = data.get('interests', [])
            if isinstance(interests_value, list):
                user.interests = json.dumps(interests_value)
            else:
                user.interests = None
        
        db.session.commit()
        
        # Return updated profile
        interests = []
        if user.interests:
            try:
                interests = json.loads(user.interests)
            except:
                interests = []
        
        # Safely get cellphone and province
        cellphone = getattr(user, 'cellphone', None) or ""
        province = getattr(user, 'province', None) or ""
        
        return jsonify({
            "user_id": user.id,
            "email": user.email or "",
            "first_name": user.first_name or "",
            "cellphone": cellphone,
            "province": province,
            "age_band": user.age_band or "",
            "experience": user.experience or "",
            "goal": user.goal or "",
            "risk": user.risk or 50,
            "horizon": user.horizon or "",
            "anchor_stock": user.anchor_stock or "",
            "literacy_level": user.literacy_level or "",
            "interests": interests,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "message": "Profile updated successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        error_detail = str(e)
        error_traceback = traceback.format_exc()
        print(f"Error in update_profile endpoint: {error_detail}")
        print(error_traceback)
        return jsonify({"error": "Failed to update profile", "detail": error_detail}), 500

@app.route("/api/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    # With JWT, logout is handled client-side by removing the token
    # But we can blacklist tokens if needed
    return jsonify({"message": "Logged out successfully"}), 200

# Admin endpoints
@app.route("/api/admin/users", methods=["GET"])
@jwt_required()
def get_all_users():
    # Check if user is admin
    claims = get_jwt()
    if not claims.get('is_admin'):
        return jsonify({"error": "Admin access required"}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search = request.args.get('search', '').strip()
    
    query = User.query
    
    # Apply search filter
    if search:
        query = query.filter(
            db.or_(
                User.email.ilike(f'%{search}%'),
                User.first_name.ilike(f'%{search}%')
            )
        )
    
    # Pagination
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    users = []
    for user in pagination.items:
        users.append({
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "is_admin": user.is_admin,
            "age_band": user.age_band,
            "experience": user.experience,
            "goal": user.goal,
            "risk": user.risk,
            "horizon": user.horizon,
            "anchor_stock": user.anchor_stock,
            "literacy_level": user.literacy_level,
            "is_onboarded": bool(user.goal and user.risk is not None),
            "created_at": user.created_at.isoformat() if user.created_at else None
        })
    
    return jsonify({
        "users": users,
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages
    }), 200

# Onboarding endpoint
@app.route("/api/onboarding", methods=["POST"])
def onboarding():
    data = request.json or {}
    user_id = data.get('user_id')

    if user_id:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        user.first_name = data.get('first_name', user.first_name)
        user.age_band = data.get('age_band', user.age_band)
        user.experience = data.get('experience', user.experience)
        user.goal = data.get('goal', user.goal)
        user.risk = data.get('risk', user.risk)
        user.horizon = data.get('horizon', user.horizon)
        user.anchor_stock = data.get('anchor_stock', user.anchor_stock)
        user.literacy_level = data.get('literacy_level', user.literacy_level)
        user.interests = json.dumps(data.get('interests', json.loads(user.interests or '[]')))
    else:
        # Validate required fields for first-time profile creation
        required = [
            'first_name', 'age_band', 'experience', 'goal', 'risk', 'horizon', 'anchor_stock', 'literacy_level'
        ]
        missing = [key for key in required if not data.get(key) and data.get(key) != 0]
        if missing:
            return jsonify({
                "error": "Missing required fields",
                "missing": missing
            }), 400

        try:
            risk_value = int(data.get('risk'))
        except Exception:
            return jsonify({"error": "Invalid risk value; expected integer 0-100"}), 400

        interests_value = data.get('interests')
        if interests_value is None:
            interests_value = []
        elif not isinstance(interests_value, list):
            # Defensive: coerce scalar to list
            interests_value = [str(interests_value)]

        user = User(
            first_name=str(data.get('first_name')).strip(),
            age_band=str(data.get('age_band')).strip(),
            experience=str(data.get('experience')).strip(),
            goal=str(data.get('goal')).strip(),
            risk=risk_value,
            horizon=str(data.get('horizon')).strip(),
            anchor_stock=str(data.get('anchor_stock')).strip(),
            literacy_level=str(data.get('literacy_level')).strip(),
            interests=json.dumps(interests_value)
        )
        db.session.add(user)

    # Commit profile changes safely
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Unable to save profile", "detail": str(e)}), 400

    # Generate archetype and starter basket
    archetype = generate_archetype(user)
    allocations = generate_starter_allocations(user, archetype)

    # Create or update user portfolio
    portfolio = UserPortfolio.query.filter_by(user_id=user.id).first()
    if portfolio:
        portfolio.archetype = archetype
        portfolio.allocations = json.dumps(allocations)
    else:
        portfolio = UserPortfolio(
            user_id=user.id,
            archetype=archetype,
            allocations=json.dumps(allocations)
        )
        db.session.add(portfolio)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Unable to create portfolio", "detail": str(e)}), 400

    # Seed starter positions so portfolio view has holdings immediately
    create_initial_positions(user.id, allocations)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Unable to create baseline", "detail": str(e)}), 400

    baseline = PortfolioBaseline.query.filter_by(user_id=user.id).first()
    baseline_payload = json.dumps(allocations)
    if baseline:
        baseline.allocations = baseline_payload
    else:
        baseline = PortfolioBaseline(user_id=user.id, allocations=baseline_payload)
        db.session.add(baseline)
    db.session.commit()

    return jsonify({
        "user_id": user.id,
        "archetype": archetype,
        "allocations": allocations,
        "profile_copy": f"Welcome {user.first_name}! You're a {archetype} investor focused on {user.goal}."
    })

# Instruments endpoint
@app.route("/api/instruments")
def get_instruments():
    instrument_type = request.args.get('type')
    sector = request.args.get('sector')
    
    query = Instrument.query.filter_by(is_active=True)
    
    if instrument_type:
        query = query.filter_by(type=instrument_type)
    if sector:
        query = query.filter_by(sector=sector)
    
    instruments = query.all()
    
    result = []
    for instrument in instruments:
        # Get latest price
        latest_price = Price.query.filter_by(instrument_id=instrument.id)\
            .order_by(Price.date.desc()).first()
        
        # Get mini series for chart (last 30 days or last 30 price points)
        mini_series_query = Price.query.filter_by(instrument_id=instrument.id)\
            .order_by(Price.date.desc()).limit(30).all()
        
        mini_series = [{"date": p.date.isoformat(), "close": p.close} for p in reversed(mini_series_query)]
        
        result.append({
            "id": instrument.id,
            "symbol": instrument.symbol,
            "name": instrument.name,
            "type": instrument.type,
            "sector": instrument.sector,
            "dividend_yield": instrument.dividend_yield,
            "ter": instrument.ter,
            "latest_price": latest_price.close if latest_price else None,
            "price_date": latest_price.date.isoformat() if latest_price else None,
            "mini_series": mini_series
        })
    
    return jsonify(result)


@app.route("/api/users/<int:user_id>")
def get_user_profile(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "first_name": user.first_name,
        "age_band": user.age_band,
        "experience": user.experience,
        "goal": user.goal,
        "risk": user.risk,
        "horizon": user.horizon,
        "anchor_stock": user.anchor_stock,
        "literacy_level": user.literacy_level,
        "interests": json.loads(user.interests or '[]'),
        "created_at": user.created_at.isoformat() if user.created_at else None
    })

# Single instrument endpoint
@app.route("/api/instruments/<symbol>")
def get_instrument(symbol):
    instrument = Instrument.query.filter_by(symbol=symbol, is_active=True).first()
    if not instrument:
        return jsonify({"error": "Instrument not found"}), 404
    
    # Get latest price and mini series (last 30 days)
    latest_price = Price.query.filter_by(instrument_id=instrument.id)\
        .order_by(Price.date.desc()).first()
    
    mini_series = Price.query.filter_by(instrument_id=instrument.id)\
        .order_by(Price.date.desc()).limit(30).all()
    
    series_data = [{"date": p.date.isoformat(), "close": p.close} for p in reversed(mini_series)]
    
    return jsonify({
        "id": instrument.id,
        "symbol": instrument.symbol,
        "name": instrument.name,
        "type": instrument.type,
        "sector": instrument.sector,
        "dividend_yield": instrument.dividend_yield,
        "ter": instrument.ter,
        "latest_price": latest_price.close if latest_price else None,
        "price_date": latest_price.date.isoformat() if latest_price else None,
        "mini_series": series_data
    })


@app.route("/api/archetypes")
def list_archetypes():
    archetypes = []
    for name, config in ARCHETYPE_CONFIG.items():
        sleeves = config.get("sleeves", {})
        archetypes.append({
            "name": name,
            "goal": config.get("goal"),
            "risk_band": config.get("risk_band"),
            "description": config.get("description"),
            "persona": config.get("persona"),
            "guidance": config.get("guidance"),
            "anchor_cap_pct": config.get("anchor_cap_pct", 5),
            "sleeves": sleeves,
            "total_pre_anchor": sum(sleeves.values())
        })
    return jsonify(archetypes)


@app.route("/api/benchmarks")
def list_benchmarks():
    items = []
    for symbol, config in BENCHMARK_CONFIG.items():
        items.append({
            "symbol": symbol,
            "label": config.get("label", symbol)
        })
    return jsonify(items)

# Portfolio endpoints
@app.route("/api/portfolio/<int:user_id>")
def get_portfolio(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        portfolio = UserPortfolio.query.filter_by(user_id=user_id).first()
        positions = UserPosition.query.filter_by(user_id=user_id).all()
        
        # Handle case where portfolio doesn't exist yet (newly registered user)
        if not portfolio:
            return jsonify({
                "user_id": user_id,
                "first_name": user.first_name,
                "archetype": None,
                "total_value": 0,
                "total_cost": 0,
                "total_pnl": 0,
                "total_pnl_pct": 0,
                "holdings": [],
                "allocation_targets": {},
                "plan_summary": None,
                "plan_persona": None,
                "plan_guidance": None,
                "plan_goal": None,
                "plan_risk_band": None,
                "plan_anchor_cap_pct": None,
                "suggestions": [],
                "applied_suggestions": [],
                "baseline_allocations": {},
                "alerts": [],
                "weighted_dividend_yield_pct": None,
                "current_annual_dividends": None
            })
        
        allocation_targets = json.loads(portfolio.allocations) if portfolio.allocations else {}
        archetype_copy = get_archetype_copy(portfolio.archetype, allocation_targets)
        
        # Calculate portfolio value and P/L
        total_value = 0
        total_cost = 0
        
        holdings = []
        for position in positions:
            instrument = Instrument.query.filter_by(symbol=position.symbol).first()
            if instrument:
                latest_price = Price.query.filter_by(instrument_id=instrument.id)\
                    .order_by(Price.date.desc()).first()
                
                if latest_price:
                    current_value = position.quantity * latest_price.close
                    cost_basis = position.quantity * position.avg_price
                    pnl = current_value - cost_basis
                    pnl_pct = (pnl / cost_basis * 100) if cost_basis > 0 else 0
                    
                    total_value += current_value
                    total_cost += cost_basis
                    
                    holdings.append({
                        "symbol": position.symbol,
                        "name": instrument.name,
                        "quantity": position.quantity,
                        "avg_price": position.avg_price,
                        "current_price": latest_price.close,
                        "current_value": current_value,
                        "cost_basis": cost_basis,
                        "pnl": pnl,
                        "pnl_pct": pnl_pct,
                        "weight": 0  # Will calculate after getting total
                    })
        
        # Calculate weights
        for holding in holdings:
            holding["weight"] = (holding["current_value"] / total_value * 100) if total_value > 0 else 0

        total_pnl = total_value - total_cost
        total_pnl_pct = (total_pnl / total_cost * 100) if total_cost > 0 else 0

        applied_actions = SuggestionAction.query.filter_by(user_id=user_id, action='applied') \
            .order_by(SuggestionAction.created_at.desc()).limit(3).all()
        
        suggestions = []
        try:
            suggestions = generate_suggestions(holdings, portfolio, allocation_targets, applied_actions) if portfolio else []
        except Exception as e:
            print(f"Error generating suggestions: {e}")
            import traceback
            traceback.print_exc()
        
        applied_suggestions = [{
            "id": action.id,
            "replace_symbol": action.replace_symbol,
            "suggest_symbol": action.suggest_symbol,
            "created_at": action.created_at.isoformat() if action.created_at else None
        } for action in applied_actions]

        alerts = []
        try:
            alerts = generate_goal_alerts(user, portfolio, holdings, allocation_targets, archetype_copy, total_value) if portfolio else []
        except Exception as e:
            print(f"Error generating goal alerts: {e}")
            import traceback
            traceback.print_exc()

        # Dividend yield snapshot for Health page
        weighted_dividend_yield_pct = None
        current_annual_dividends = None
        try:
            wy = calculate_weighted_dividend_yield(user_id)
            if wy is not None:
                weighted_dividend_yield_pct = float(wy)
                # Only calculate annual dividends if we have a portfolio value
                if total_value and total_value > 0 and weighted_dividend_yield_pct > 0:
                    current_annual_dividends = (total_value * weighted_dividend_yield_pct / 100.0)
            else:
                # Fallback: if calculation returns None, use a default
                weighted_dividend_yield_pct = 3.5
        except Exception as e:
            print(f"Error calculating weighted dividend yield: {e}")
            import traceback
            traceback.print_exc()
            # Fallback on error
            weighted_dividend_yield_pct = 3.5

        baseline = PortfolioBaseline.query.filter_by(user_id=user_id).first()
        baseline_allocations = {}
        if baseline and baseline.allocations:
            try:
                baseline_allocations = json.loads(baseline.allocations)
            except json.JSONDecodeError:
                baseline_allocations = {}

        return jsonify({
            "user_id": user_id,
            "first_name": user.first_name,
            "archetype": portfolio.archetype if portfolio else None,
            "total_value": total_value,
            "total_cost": total_cost,
            "total_pnl": total_pnl,
            "total_pnl_pct": total_pnl_pct,
            "holdings": holdings,
            "allocation_targets": allocation_targets,
            "plan_summary": archetype_copy.get("summary") if archetype_copy else None,
            "plan_persona": archetype_copy.get("persona") if archetype_copy else None,
            "plan_guidance": archetype_copy.get("guidance") if archetype_copy else None,
            "plan_goal": archetype_copy.get("goal") if archetype_copy else None,
            "plan_risk_band": archetype_copy.get("risk_band") if archetype_copy else None,
            "plan_anchor_cap_pct": archetype_copy.get("anchor_cap_pct") if archetype_copy else None,
            "suggestions": suggestions,
            "applied_suggestions": applied_suggestions,
            "baseline_allocations": baseline_allocations,
            "alerts": alerts,
            "weighted_dividend_yield_pct": round(weighted_dividend_yield_pct, 2) if weighted_dividend_yield_pct is not None else None,
            "current_annual_dividends": round(current_annual_dividends, 2) if current_annual_dividends is not None else None
        })
    except Exception as e:
        import traceback
        error_detail = str(e)
        error_traceback = traceback.format_exc()
        print(f"Error fetching portfolio for user {user_id}: {error_detail}")
        print(error_traceback)
        return jsonify({"error": f"Failed to load portfolio: {error_detail}"}), 500


@app.route("/api/health/plan", methods=["POST"])
def generate_health_plan():
    data = request.json or {}
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    baseline = aggregate_portfolio_state(user_id)
    if baseline is None:
        return jsonify({"error": "User not found"}), 404

    total_value = baseline.get("total_value") or 0.0
    weighted_yield_pct = baseline.get("weighted_yield_pct") or 0.0

    term_years = data.get('term_years') or 5
    try:
        term_years = max(1, float(term_years))
    except (TypeError, ValueError):
        term_years = 5.0

    annual_return_pct = derive_return_assumption(user_id, total_value, term_years)

    goal_type = (data.get('goal_type') or 'growth').lower()

    if goal_type == 'growth':
        target_value = data.get('target_value')
        if target_value is None:
            target_value = max(total_value * 1.5, total_value + 50000)
        try:
            target_value = float(target_value)
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid target_value"}), 400
        monthly_budget = data.get('monthly_budget')
        try:
            monthly_budget = float(monthly_budget)
        except (TypeError, ValueError):
            monthly_budget = None

        progress_pct = (total_value / target_value * 100) if target_value > 0 else 0
        monthly_required = solve_monthly_contribution(target_value, total_value, annual_return_pct, term_years)
        lump_sum_gap = max(target_value - total_value, 0.0)
        timeline_months = solve_timeline_for_budget(monthly_budget, target_value, total_value, annual_return_pct) if monthly_budget else None
        plan = {
            "goal_type": "growth",
            "term_years": term_years,
            "current_value": round(total_value, 2),
            "target_value": round(target_value, 2),
            "progress_pct": round(progress_pct, 2),
            "annual_return_pct": round(annual_return_pct, 2),
            "required_monthly_contribution": round(monthly_required, 2),
            "lump_sum_gap": round(lump_sum_gap, 2),
            "monthly_budget": round(monthly_budget, 2) if monthly_budget else None,
            "timeline_for_budget_months": round(timeline_months, 1) if timeline_months is not None else None,
            "message": "Add contributions or a top-up to reach your growth target." if lump_sum_gap > 0 else "Your growth target is already met."
        }
        return jsonify(plan)

    if goal_type == 'balanced':
        inflation_mode = (data.get('inflation_target_type') or 'sarb').lower()
        if inflation_mode == 'custom':
            try:
                inflation_target_pct = float(data.get('inflation_target_pct'))
            except (TypeError, ValueError):
                inflation_target_pct = 6.0
        else:
            inflation_target_pct = 6.0
        real_return_pct = annual_return_pct - inflation_target_pct
        status = 'ahead' if real_return_pct >= 0 else 'lagging'
        message = (
            f"You are beating inflation by {real_return_pct:.1f} pts." if status == 'ahead' else
            f"Portfolio return trails inflation by {abs(real_return_pct):.1f} pts. Boost contributions or tilt to higher-growth sleeves."
        )
        plan = {
            "goal_type": "balanced",
            "term_years": term_years,
            "inflation_target_pct": round(inflation_target_pct, 2),
            "nominal_return_pct": round(annual_return_pct, 2),
            "real_return_pct": round(real_return_pct, 2),
            "current_value": round(total_value, 2),
            "status": status,
            "message": message
        }
        return jsonify(plan)

    # Income goal (default)
    income_goal_amount = data.get('income_goal_amount')
    if income_goal_amount is None:
        income_goal_amount = 12000.0
    try:
        income_goal_amount = float(income_goal_amount)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid income_goal_amount"}), 400

    income_frequency = (data.get('income_frequency') or 'monthly').lower()
    if income_frequency not in {'monthly', 'annual'}:
        income_frequency = 'monthly'

    monthly_budget = data.get('monthly_budget')
    try:
        monthly_budget = float(monthly_budget)
    except (TypeError, ValueError):
        monthly_budget = None

    effective_yield = max(weighted_yield_pct, 0.5)
    current_annual_income = total_value * (effective_yield / 100.0)
    current_monthly_income = current_annual_income / 12.0
    target_annual_income = income_goal_amount * 12 if income_frequency == 'monthly' else income_goal_amount
    target_monthly_income = target_annual_income / 12.0
    target_capital = target_annual_income / (effective_yield / 100.0)
    monthly_required = solve_monthly_contribution(target_capital, total_value, annual_return_pct, term_years)
    lump_sum_gap = max(target_capital - total_value, 0.0)
    timeline_months = solve_timeline_for_budget(monthly_budget, target_capital, total_value, annual_return_pct) if monthly_budget else None

    plan = {
        "goal_type": "income",
        "term_years": term_years,
        "current_monthly_income": round(current_monthly_income, 2),
        "current_annual_income": round(current_annual_income, 2),
        "target_monthly_income": round(target_monthly_income, 2),
        "target_annual_income": round(target_annual_income, 2),
        "dividend_yield_pct": round(effective_yield, 2),
        "required_monthly_contribution": round(monthly_required, 2),
        "lump_sum_gap": round(lump_sum_gap, 2),
        "monthly_budget": round(monthly_budget, 2) if monthly_budget else None,
        "timeline_for_budget_months": round(timeline_months, 1) if timeline_months is not None else None,
        "message": "Scale contributions or increase yield to reach your income goal." if target_annual_income > current_annual_income else "Your income goal is already covered."
    }
    return jsonify(plan)

# Baskets endpoint
@app.route("/api/baskets")
def get_baskets():
    baskets = Basket.query.all()
    result = []
    
    for basket in baskets:
        allocations = json.loads(basket.allocations) if basket.allocations else {}
        result.append({
            "id": basket.id,
            "code": basket.code,
            "name": basket.name,
            "goal": basket.goal,
            "description": basket.description,
            "allocations": allocations
        })
    
    return jsonify(result)

# Apply basket endpoint
@app.route("/api/portfolio/apply-basket", methods=["POST"])
def apply_basket():
    data = request.json
    user_id = data.get('user_id')
    basket_id = data.get('basket_id')
    
    basket = Basket.query.get(basket_id)
    if not basket:
        return jsonify({"error": "Basket not found"}), 404
    
    allocations = json.loads(basket.allocations) if basket.allocations else {}
    
    # Update user portfolio
    portfolio = UserPortfolio.query.filter_by(user_id=user_id).first()
    if portfolio:
        portfolio.allocations = json.dumps(allocations)
        portfolio.archetype = basket.name
    else:
        portfolio = UserPortfolio(
            user_id=user_id,
            archetype=basket.name,
            allocations=json.dumps(allocations)
        )
        db.session.add(portfolio)
    
    db.session.commit()
    
    return jsonify({"success": True, "allocations": allocations})

# Simulation endpoints
@app.route("/api/simulate/performance", methods=["POST"])
def simulate_performance():
    data = request.json or {}
    user_id = data.get('user_id')
    timeframe = data.get('timeframe', '5y')
    investment_mode = data.get('investment_mode', 'lump_sum')
    initial_investment = float(data.get('initial_investment', 100000))
    monthly_contribution = float(data.get('monthly_contribution', 2000))
    custom_months = data.get('custom_months')
    benchmark_symbol = data.get('benchmark')
    inflation_adjust = bool(data.get('inflation_adjust'))
    custom_start = data.get('custom_start')
    custom_end = data.get('custom_end')
    distribution_policy = data.get('distribution_policy', 'reinvest')
    if distribution_policy not in {'reinvest', 'cash_out'}:
        distribution_policy = 'reinvest'

    def normalize_frequency(value):
        if isinstance(value, str):
            cleaned = value.strip().lower()
            if cleaned in {'monthly', 'quarterly', 'annual'}:
                return cleaned
        return 'monthly'

    def normalize_annual_month(value):
        try:
            month_int = int(value)
        except (TypeError, ValueError):
            return None
        if 1 <= month_int <= 12:
            return month_int
        return None

    scenario_payload = data.get('contribution_scenario') or {}
    scenario_enabled = isinstance(scenario_payload, dict) and bool(scenario_payload)
    scenario_frequency = normalize_frequency(scenario_payload.get('contribution_frequency'))
    scenario_annual_month = normalize_annual_month(scenario_payload.get('annual_month'))

    start_date, end_date, months = resolve_timeframe(timeframe, custom_months, custom_start, custom_end)

    historical_performance = None
    if user_id:
        historical_performance = calculate_historical_performance(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            timeframe_key=timeframe,
            benchmark_symbol=benchmark_symbol,
            investment_mode=investment_mode,
            initial_investment=initial_investment,
            monthly_contribution=monthly_contribution,
            distribution_policy=distribution_policy,
            contribution_frequency='monthly',
            annual_month=None,
            inflation_adjust=inflation_adjust
        )
    scenario_result = None
    if scenario_enabled and user_id:
        scenario_initial = float(scenario_payload.get('initial_investment', initial_investment))
        scenario_contribution = float(scenario_payload.get('monthly_contribution', monthly_contribution))
        scenario_mode = scenario_payload.get('investment_mode', investment_mode)
        scenario_policy = scenario_payload.get('distribution_policy', distribution_policy)
        if scenario_policy not in {'reinvest', 'cash_out'}:
            scenario_policy = distribution_policy
        scenario_result = calculate_historical_performance(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            timeframe_key=timeframe,
            benchmark_symbol=benchmark_symbol,
            investment_mode=scenario_mode,
            initial_investment=scenario_initial,
            monthly_contribution=scenario_contribution,
            distribution_policy=scenario_policy,
            contribution_frequency=scenario_frequency,
            annual_month=scenario_annual_month,
            inflation_adjust=inflation_adjust
        )

    if historical_performance:
        if scenario_result:
            return jsonify({
                "baseline": historical_performance,
                "scenario": scenario_result
            })

        if scenario_enabled and not scenario_result:
            return jsonify({
                "baseline": historical_performance,
                "scenario": None
            })

        return jsonify(historical_performance)

    simulation = run_performance_simulation(
        user_id=user_id,
        months=months,
        start_date=start_date,
        investment_mode=investment_mode,
        initial_investment=initial_investment,
        monthly_contribution=monthly_contribution,
        timeframe_key=timeframe,
        benchmark_symbol=benchmark_symbol,
        inflation_adjust=inflation_adjust,
        distribution_policy=distribution_policy,
        contribution_frequency='monthly',
        annual_month=None
    )

    if scenario_enabled:
        scenario_initial = float(scenario_payload.get('initial_investment', initial_investment))
        scenario_contribution = float(scenario_payload.get('monthly_contribution', monthly_contribution))
        scenario_mode = scenario_payload.get('investment_mode', investment_mode)
        scenario_policy = scenario_payload.get('distribution_policy', distribution_policy)
        if scenario_policy not in {'reinvest', 'cash_out'}:
            scenario_policy = distribution_policy
        scenario_simulation = run_performance_simulation(
            user_id=user_id,
            months=months,
            start_date=start_date,
            investment_mode=scenario_mode,
            initial_investment=scenario_initial,
            monthly_contribution=scenario_contribution,
            timeframe_key=timeframe,
            benchmark_symbol=benchmark_symbol,
            inflation_adjust=inflation_adjust,
            distribution_policy=scenario_policy,
            contribution_frequency=scenario_frequency,
            annual_month=scenario_annual_month
        )
        return jsonify({
            "baseline": simulation,
            "scenario": scenario_simulation
        })

    return jsonify(simulation)

@app.route("/api/simulate/income", methods=["POST"])
def simulate_income():
    data = request.json or {}
    timeframe = data.get('timeframe', '5y')
    custom_months = data.get('custom_months')
    start_date, end_date, _ = resolve_timeframe(timeframe, custom_months)

    return jsonify({
        "income_series": generate_mock_income_series(start_date.isoformat(), end_date.isoformat()),
        "inflation_series": generate_mock_inflation_series(start_date.isoformat(), end_date.isoformat()),
        "real_return": 4.2,
        "notes": "Simulated income vs inflation"
    })


@app.route("/api/portfolio/suggestions/apply", methods=["POST"])
def apply_portfolio_suggestion():
    data = request.json or {}
    user_id = data.get('user_id')
    replace_symbol = data.get('replace_symbol')
    suggest_symbol = data.get('suggest_symbol')
    target_weight = data.get('target_weight')

    if not user_id or not replace_symbol or not suggest_symbol:
        return jsonify({"error": "Missing required fields"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    portfolio = UserPortfolio.query.filter_by(user_id=user_id).first()
    if not portfolio:
        return jsonify({"error": "Portfolio not found"}), 404

    replacements_instrument = Instrument.query.filter_by(symbol=suggest_symbol, is_active=True).first()
    if not replacements_instrument:
        return jsonify({"error": "Replacement instrument not found"}), 404

    positions = UserPosition.query.filter_by(user_id=user_id).all()
    existing_position = next((pos for pos in positions if pos.symbol == replace_symbol), None)
    if not existing_position:
        return jsonify({"error": "Holding to replace not found"}), 400

    # Snapshot portfolio values
    position_values = {}
    total_value = 0.0
    for pos in positions:
        instrument = Instrument.query.filter_by(symbol=pos.symbol).first()
        latest_price = None
        if instrument:
            latest_price = Price.query.filter_by(instrument_id=instrument.id).order_by(Price.date.desc()).first()
        current_price = latest_price.close if latest_price and latest_price.close else pos.avg_price
        position_value = current_price * pos.quantity
        position_values[pos.symbol] = {
            "value": position_value,
            "price": current_price
        }
        total_value += position_value

    old_value = position_values.get(replace_symbol, {}).get("value", 0.0)
    if old_value <= 0:
        return jsonify({"error": "Unable to determine value of holding to replace"}), 400
    old_quantity = existing_position.quantity
    old_avg_price = existing_position.avg_price

    sleeves = ARCHETYPE_CONFIG.get(portfolio.archetype, ARCHETYPE_CONFIG['Anchor']).get('sleeves', {})
    if target_weight is None:
        candidate_weight = (old_value / total_value) * 100 if total_value > 0 else None
        target_weight = resolve_target_weight(suggest_symbol, candidate_weight, sleeves)
    else:
        try:
            target_weight = float(target_weight)
        except (TypeError, ValueError):
            target_weight = resolve_target_weight(suggest_symbol, (old_value / total_value) * 100 if total_value > 0 else None, sleeves)

    # Remove the old holding
    db.session.delete(existing_position)

    # Determine purchase quantity based on redeploying the same rand value
    replacement_price = Price.query.filter_by(instrument_id=replacements_instrument.id).order_by(Price.date.desc()).first()
    if not replacement_price or not replacement_price.close:
        return jsonify({"error": "Replacement instrument price unavailable"}), 400

    quantity = round(old_value / replacement_price.close, 4)
    if quantity <= 0:
        return jsonify({"error": "Calculated quantity is not positive"}), 400

    new_position = UserPosition(
        user_id=user_id,
        symbol=suggest_symbol,
        quantity=quantity,
        avg_price=round(replacement_price.close, 2)
    )
    db.session.add(new_position)

    # Update portfolio allocation targets
    allocations = {}
    if portfolio.allocations:
        try:
            allocations = json.loads(portfolio.allocations)
        except json.JSONDecodeError:
            allocations = {}

    if not allocations and total_value > 0:
        # fallback to actual weights snapshot before the trade
        for symbol, meta in position_values.items():
            allocations[symbol] = (meta['value'] / total_value) * 100

    old_weight = allocations.get(replace_symbol)
    if old_weight is None and total_value > 0:
        old_weight = (old_value / total_value) * 100

    allocations.pop(replace_symbol, None)
    allocations[suggest_symbol] = target_weight
    normalized_allocations = normalize_allocation_map(allocations)
    portfolio.allocations = json.dumps(normalized_allocations)

    db.session.commit()

    action_meta = json.dumps({
        "target_weight": target_weight,
        "old_weight": old_weight,
        "value_reallocated": old_value,
        "old_quantity": old_quantity,
        "old_avg_price": old_avg_price,
        "new_quantity": quantity,
        "new_avg_price": round(replacement_price.close, 2),
        "new_weight": target_weight
    })
    action = SuggestionAction(
        user_id=user_id,
        replace_symbol=replace_symbol,
        suggest_symbol=suggest_symbol,
        action='applied',
        details=action_meta
    )
    db.session.add(action)
    db.session.commit()

    excess_actions = SuggestionAction.query.filter_by(user_id=user_id, action='applied') \
        .order_by(SuggestionAction.created_at.desc()).offset(3).all()
    for extra in excess_actions:
        db.session.delete(extra)
    db.session.commit()

    return get_portfolio(user_id)


@app.route("/api/portfolio/suggestions/reverse", methods=["POST"])
def reverse_portfolio_suggestion():
    data = request.json or {}
    user_id = data.get('user_id')
    action_id = data.get('action_id')

    if not user_id or not action_id:
        return jsonify({"error": "Missing required fields"}), 400

    action = SuggestionAction.query.filter_by(id=action_id, user_id=user_id, action='applied').first()
    if not action:
        return jsonify({"error": "Applied suggestion not found"}), 404

    portfolio = UserPortfolio.query.filter_by(user_id=user_id).first()
    if not portfolio:
        return jsonify({"error": "Portfolio not found"}), 404

    try:
        details = json.loads(action.details or '{}')
    except json.JSONDecodeError:
        details = {}

    old_quantity = details.get('old_quantity')
    old_avg_price = details.get('old_avg_price')
    old_weight = details.get('old_weight')

    # Remove the replacement holding
    new_position = UserPosition.query.filter_by(user_id=user_id, symbol=action.suggest_symbol).first()
    if new_position:
        db.session.delete(new_position)

    # Restore the previous holding if we have baseline information
    if old_quantity and old_quantity > 0 and old_avg_price is not None:
        restored_position = UserPosition(
            user_id=user_id,
            symbol=action.replace_symbol,
            quantity=old_quantity,
            avg_price=old_avg_price
        )
        db.session.add(restored_position)

    allocations = {}
    if portfolio.allocations:
        try:
            allocations = json.loads(portfolio.allocations)
        except json.JSONDecodeError:
            allocations = {}

    allocations.pop(action.suggest_symbol, None)
    if old_weight and old_weight > 0:
        allocations[action.replace_symbol] = old_weight
    else:
        positions_snapshot = UserPosition.query.filter_by(user_id=user_id).all()
        total_value_snapshot = 0.0
        snapshot_values = {}
        for pos in positions_snapshot:
            instrument = Instrument.query.filter_by(symbol=pos.symbol).first()
            latest_price = None
            if instrument:
                latest_price = Price.query.filter_by(instrument_id=instrument.id).order_by(Price.date.desc()).first()
            price_value = latest_price.close if latest_price and latest_price.close else pos.avg_price
            snapshot_values[pos.symbol] = price_value * pos.quantity
            total_value_snapshot += price_value * pos.quantity
        if total_value_snapshot > 0:
            allocations = {symbol: (value / total_value_snapshot) * 100 for symbol, value in snapshot_values.items()}

    normalized_allocations = normalize_allocation_map(allocations)
    portfolio.allocations = json.dumps(normalized_allocations)

    db.session.delete(action)
    db.session.commit()

    return get_portfolio(user_id)


@app.route("/api/portfolio/reset-plan", methods=["POST"])
def reset_portfolio_plan():
    data = request.json or {}
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400

    portfolio = UserPortfolio.query.filter_by(user_id=user_id).first()
    if not portfolio:
        return jsonify({"error": "Portfolio not found"}), 404

    archetype_name = portfolio.archetype or 'Anchor'
    archetype_config = ARCHETYPE_CONFIG.get(archetype_name, ARCHETYPE_CONFIG['Anchor'])
    sleeves = archetype_config.get('sleeves', {})
    normalized_plan = normalize_allocation_map(sleeves)
    if not normalized_plan:
        return jsonify({"error": "Plan allocations unavailable"}), 400

    create_initial_positions(user_id, normalized_plan)
    portfolio.allocations = json.dumps(normalized_plan)
    baseline = PortfolioBaseline.query.filter_by(user_id=user_id).first()
    if baseline:
        baseline.allocations = json.dumps(normalized_plan)
    else:
        baseline = PortfolioBaseline(user_id=user_id, allocations=json.dumps(normalized_plan))
        db.session.add(baseline)
    SuggestionAction.query.filter_by(user_id=user_id, action='applied').delete()
    db.session.commit()
    return get_portfolio(user_id)


@app.route("/api/portfolio/custom", methods=["POST"])
def customise_portfolio():
    data = request.json or {}
    user_id = data.get('user_id')
    allocations_payload = data.get('allocations') or []

    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400

    if not isinstance(allocations_payload, list) or not allocations_payload:
        return jsonify({"error": "Provide at least one allocation"}), 400

    portfolio = UserPortfolio.query.filter_by(user_id=user_id).first()
    if not portfolio:
        return jsonify({"error": "Portfolio not found"}), 404

    holdings = UserPosition.query.filter_by(user_id=user_id).all()
    total_value = 0.0
    for position in holdings:
        instrument = Instrument.query.filter_by(symbol=position.symbol).first()
        latest_price = None
        if instrument:
            latest_price = Price.query.filter_by(instrument_id=instrument.id).order_by(Price.date.desc()).first()
        price_value = latest_price.close if latest_price and latest_price.close else position.avg_price
        total_value += price_value * position.quantity

    if total_value <= 0:
        total_value = float(data.get('capital') or 100000)

    requested_allocations = {}
    for entry in allocations_payload:
        symbol = entry.get('symbol')
        weight = entry.get('weight')
        if not symbol:
            continue
        try:
            weight_value = float(weight)
        except (TypeError, ValueError):
            continue
        requested_allocations[symbol.upper()] = max(0.0, weight_value)

    normalized = normalize_allocation_map(requested_allocations)
    if not normalized:
        return jsonify({"error": "Invalid allocation weights"}), 400

    UserPosition.query.filter_by(user_id=user_id).delete()

    for symbol, weight in normalized.items():
        instrument = Instrument.query.filter_by(symbol=symbol, is_active=True).first()
        if not instrument:
            continue
        latest_price = Price.query.filter_by(instrument_id=instrument.id).order_by(Price.date.desc()).first()
        if not latest_price or not latest_price.close:
            continue
        target_value = total_value * (weight / 100)
        quantity = round(target_value / latest_price.close, 4)
        if quantity <= 0:
            continue
        position = UserPosition(
            user_id=user_id,
            symbol=symbol,
            quantity=quantity,
            avg_price=round(latest_price.close, 2)
        )
        db.session.add(position)

    portfolio.allocations = json.dumps(normalized)
    db.session.commit()

    return get_portfolio(user_id)


@app.route("/api/news/<int:user_id>")
def portfolio_news(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    portfolio = UserPortfolio.query.filter_by(user_id=user_id).first()
    archetype = portfolio.archetype if portfolio else None
    archetype_goal = None
    if archetype:
        archetype_goal = ARCHETYPE_CONFIG.get(archetype, ARCHETYPE_CONFIG['Anchor']).get('goal')

    benchmark_symbol = request.args.get('benchmark')
    anchor_symbol = (user.anchor_stock or "").upper()
    benchmark_news = []
    benchmark_info = None
    anchor_news = []
    anchor_info = None
    earnings_watch = []
    anchor_schedule = []
    benchmark_schedule = []
    portfolio_schedule = []

    if anchor_symbol:
        anchor_instrument = Instrument.query.filter_by(symbol=anchor_symbol).first()
        anchor_info = {
            "symbol": anchor_symbol,
            "name": anchor_instrument.name if anchor_instrument else anchor_symbol
        }
        anchor_items = fetch_live_news(anchor_symbol, limit=5, lookback_days=14)
        for item in anchor_items:
            story = item.copy()
            story["symbol"] = anchor_symbol
            story["name"] = anchor_info["name"]
            if archetype_goal:
                story["summary"] = attach_sentiment_guidance(story.get("summary", ''), story.get("sentiment"), archetype_goal)
            anchor_news.append(story)
        anchor_earnings = fetch_upcoming_earnings(anchor_symbol, horizon_days=60, limit=3)
        for entry in anchor_earnings:
            item = entry.copy()
            item["context"] = "anchor"
            item["name"] = anchor_info["name"]
            anchor_schedule.append(item)
            earnings_watch.append(item)

    if benchmark_symbol:
        benchmark_instrument = Instrument.query.filter_by(symbol=benchmark_symbol).first()
        benchmark_info = {
            "symbol": benchmark_symbol,
            "name": benchmark_instrument.name if benchmark_instrument else benchmark_symbol
        }
        raw_news = fetch_live_news(benchmark_symbol, limit=5, lookback_days=14)
        for item in raw_news:
            story = item.copy()
            story["symbol"] = benchmark_symbol
            story["name"] = benchmark_info["name"]
            if archetype_goal:
                story["summary"] = attach_sentiment_guidance(story.get("summary", ''), story.get("sentiment"), archetype_goal)
            benchmark_news.append(story)
        benchmark_earnings = fetch_upcoming_earnings(benchmark_symbol, horizon_days=60, limit=3)
        for entry in benchmark_earnings:
            item = entry.copy()
            item["context"] = "benchmark"
            item["name"] = benchmark_info["name"]
            benchmark_schedule.append(item)
            earnings_watch.append(item)

    positions = UserPosition.query.filter_by(user_id=user_id).all()
    holding_payloads = []
    for position in positions:
        if anchor_symbol and position.symbol.upper() == anchor_symbol:
            continue
        instrument = Instrument.query.filter_by(symbol=position.symbol).first()
        if not instrument:
            continue
        stories = []
        raw_news = fetch_live_news(position.symbol, limit=4, lookback_days=14)
        for item in raw_news:
            story = item.copy()
            story["symbol"] = position.symbol
            story["name"] = instrument.name
            if archetype_goal:
                story["summary"] = attach_sentiment_guidance(story.get("summary", ''), story.get("sentiment"), archetype_goal)
            stories.append(story)
        holding_payloads.append({
            "symbol": position.symbol,
            "name": instrument.name,
            "news": stories
        })
        holding_earnings = fetch_upcoming_earnings(position.symbol, horizon_days=60, limit=2)
        for entry in holding_earnings:
            item = entry.copy()
            item["context"] = "portfolio"
            item["name"] = instrument.name
            portfolio_schedule.append(item)
            earnings_watch.append(item)

    holding_payloads.sort(key=lambda payload: payload["name"].lower() if payload["name"] else payload["symbol"])

    # Deduplicate earnings by symbol/date and sort ascending
    deduped = {}
    for entry in earnings_watch:
        key = (entry["symbol"], entry["date"])
        if key in deduped:
            continue
        deduped[key] = entry
    earnings_list = sorted(deduped.values(), key=lambda x: x["date"])

    response = {
        "user_id": user_id,
        "archetype": archetype,
        "anchor": {
            "symbol": anchor_info["symbol"],
            "name": anchor_info["name"],
            "news": anchor_news
        } if anchor_info else None,
        "benchmark": {
            "symbol": benchmark_info["symbol"] if benchmark_info else None,
            "name": benchmark_info["name"] if benchmark_info else None,
            "news": benchmark_news
        } if benchmark_info else None,
        "holdings": holding_payloads,
        "earnings_watch": earnings_list,
        "earnings_schedule": {
            "anchor": anchor_schedule,
            "benchmark": benchmark_schedule,
            "portfolio": portfolio_schedule
        }
    }

    return jsonify(response)

@app.route("/api/news/latest")
def latest_news():
    """Fetch latest news from popular JSE instruments without requiring a user."""
    # Popular JSE instruments to fetch news from
    popular_symbols = [
        "STX40.JO",  # Satrix Top 40
        "SBK.JO",    # Standard Bank
        "FSR.JO",    # FirstRand
        "NPN.JO",    # Naspers
        "BHP.JO",    # BHP Group
        "VOD.JO",    # Vodacom
        "MTN.JO",    # MTN Group
        "GRT.JO",    # Growthpoint Properties
        "CPI.JO",    # Capitec
        "SHF.JO",    # Shoprite
    ]
    
    all_news = []
    
    for symbol in popular_symbols:
        instrument = Instrument.query.filter_by(symbol=symbol, is_active=True).first()
        if not instrument:
            continue
        
        raw_news = fetch_live_news(symbol, limit=3, lookback_days=7)
        for item in raw_news:
            story = item.copy()
            story["symbol"] = symbol
            story["name"] = instrument.name
            all_news.append(story)
    
    # Sort by published_at descending
    all_news.sort(key=lambda x: x.get("published_at", ""), reverse=True)
    
    # Limit to most recent 30 stories
    all_news = all_news[:30]
    
    # Group by symbol for easier display
    grouped = {}
    for story in all_news:
        symbol = story.get("symbol")
        if symbol not in grouped:
            instrument = Instrument.query.filter_by(symbol=symbol).first()
            grouped[symbol] = {
                "symbol": symbol,
                "name": instrument.name if instrument else symbol,
                "news": []
            }
        grouped[symbol]["news"].append(story)
    
    return jsonify({
        "news": list(grouped.values()),
        "total_stories": len(all_news)
    })

# Paper trading endpoint
@app.route("/api/trade/sim", methods=["POST"])
def paper_trade():
    data = request.json
    user_id = data.get('user_id')
    symbol = data.get('symbol')
    side = data.get('side')  # buy or sell
    quantity = data.get('quantity')
    price = data.get('price')
    
    # Get current position
    position = UserPosition.query.filter_by(user_id=user_id, symbol=symbol).first()
    
    if side == 'buy':
        if position:
            # Update existing position
            new_quantity = position.quantity + quantity
            new_avg_price = ((position.quantity * position.avg_price) + (quantity * price)) / new_quantity
            position.quantity = new_quantity
            position.avg_price = new_avg_price
        else:
            # Create new position
            position = UserPosition(
                user_id=user_id,
                symbol=symbol,
                quantity=quantity,
                avg_price=price
            )
            db.session.add(position)
    else:  # sell
        if position and position.quantity >= quantity:
            position.quantity -= quantity
            if position.quantity == 0:
                db.session.delete(position)
        else:
            return jsonify({"error": "Insufficient quantity"}), 400
    
    # Record the trade
    trade = UserTrade(
        user_id=user_id,
        symbol=symbol,
        side=side,
        quantity=quantity,
        price=price
    )
    db.session.add(trade)
    db.session.commit()
    
    return jsonify({"success": True, "message": "Simulated trade executed"})

# Helper functions
def generate_archetype(user):
    """Generate user archetype based on profile"""
    goal = (user.goal or '').lower()
    risk = user.risk or 0

    if risk < 30:
        return "Anchor"

    if goal == 'growth':
        return "Dreamer" if risk >= 70 else "Builder"

    if goal == 'balanced':
        return "Pathfinder" if risk >= 70 else "Navigator"

    if goal == 'income':
        return "Harvestor" if risk >= 65 else "Provider"

    return "Anchor"

def generate_starter_allocations(user, archetype):
    """Generate starter allocations based on archetype"""
    config = ARCHETYPE_CONFIG.get(archetype, ARCHETYPE_CONFIG["Anchor"])
    base_allocations = dict(config.get("sleeves", {}))
    anchor_cap = config.get("anchor_cap_pct", 5)
    anchor_symbol = user.anchor_stock or "SBK.JO"

    if anchor_symbol:
        base_allocations[anchor_symbol] = base_allocations.get(anchor_symbol, 0) + anchor_cap

    # Remove any empty tickers (defensive) and normalise to 100%
    allocations = {symbol: weight for symbol, weight in base_allocations.items() if symbol and weight > 0}

    total_weight = sum(allocations.values())
    if total_weight == 0:
        return allocations

    normalized = {}
    running_total = 0.0
    items = list(allocations.items())
    for index, (symbol, weight) in enumerate(items):
        if index == len(items) - 1:
            # Force final weight to make the total exactly 100%
            normalized_weight = round(100 - running_total, 2)
        else:
            normalized_weight = round((weight / total_weight) * 100, 2)
            running_total += normalized_weight

        if normalized_weight <= 0:
            continue
        normalized[symbol] = normalized_weight

    # Guard against rounding dropping the final allocation
    total_normalized = sum(normalized.values())
    if total_normalized != 100 and normalized:
        key = next(reversed(normalized))
        normalized[key] = round(normalized[key] + (100 - total_normalized), 2)

    return normalized


def create_initial_positions(user_id, allocations, starting_value=100000):
    """Create starter UserPosition rows based on allocation targets."""
    # Ensure we start from a clean slate in case onboarding is retried
    UserPosition.query.filter_by(user_id=user_id).delete()

    for symbol, weight in allocations.items():
        instrument = Instrument.query.filter_by(symbol=symbol, is_active=True).first()
        if not instrument:
            instrument = Instrument(
                symbol=symbol,
                name=symbol,
                type='share',
                sector='General',
                dividend_yield=0.0
            )
            db.session.add(instrument)
            db.session.flush()

        latest_price = Price.query.filter_by(instrument_id=instrument.id).order_by(Price.date.desc()).first()
        if not latest_price or not latest_price.close:
            latest_price = Price(
                instrument_id=instrument.id,
                date=date.today(),
                close=100.0,
                dividend=0.0
            )
            db.session.add(latest_price)
            db.session.flush()

        allocation_value = starting_value * (weight / 100)
        if allocation_value <= 0:
            continue

        # Derive a deterministic historical cost basis ~5-10% off current price
        try:
            past_price = Price.query.filter(Price.instrument_id == instrument.id, Price.date <= latest_price.date - relativedelta(days=180)) \
                .order_by(Price.date.desc()).first()
        except Exception:
            past_price = None
        baseline_price = past_price.close if past_price and past_price.close else latest_price.close * 0.94
        if baseline_price <= 0:
            baseline_price = latest_price.close or 100.0
        quantity = round(allocation_value / baseline_price, 4)
        if quantity <= 0:
            continue

        position = UserPosition(
            user_id=user_id,
            symbol=symbol,
            quantity=quantity,
            avg_price=round(baseline_price, 2)
        )
        db.session.add(position)


def get_archetype_copy(archetype, allocations):
    config = ARCHETYPE_CONFIG.get(archetype, ARCHETYPE_CONFIG["Anchor"])
    return {
        "summary": config.get("description", ""),
        "persona": config.get("persona", ""),
        "guidance": config.get("guidance", ""),
        "goal": config.get("goal", ""),
        "risk_band": config.get("risk_band", ""),
        "anchor_cap_pct": config.get("anchor_cap_pct", 5),
        "sleeves": config.get("sleeves", {}),
        "allocation_targets": allocations
    }


def normalize_allocation_map(allocations):
    """Normalise allocation weights so they sum to 100% while keeping ordering."""
    filtered = {symbol: weight for symbol, weight in allocations.items() if weight and weight > 0}
    if not filtered:
        return {}

    total_weight = sum(filtered.values())
    if total_weight <= 0:
        return {}

    normalized = {}
    running_total = 0.0
    items = list(filtered.items())
    for index, (symbol, weight) in enumerate(items):
        if index == len(items) - 1:
            normalized_weight = round(100 - running_total, 2)
        else:
            normalized_weight = round((weight / total_weight) * 100, 2)
            running_total += normalized_weight

        if normalized_weight <= 0 and len(items) > 1:
            continue
        normalized[symbol] = normalized_weight

    delta = round(100 - sum(normalized.values()), 2)
    if normalized and abs(delta) >= 0.01:
        last_key = next(reversed(normalized))
        normalized[last_key] = round(normalized[last_key] + delta, 2)

    return normalized


def normalize_dividend_yield(raw_value):
    """Ensure dividend yield is expressed as a percentage."""
    if raw_value is None:
        return None
    try:
        value = float(raw_value)
    except (TypeError, ValueError):
        return None
    if value < 0:
        return None
    if value <= 1:
        return value * 100.0
    return value


def calculate_weighted_dividend_yield(user_id):
    """Estimate the portfolio's weighted dividend yield percentage."""
    if not user_id:
        return 3.5

    positions = UserPosition.query.filter_by(user_id=user_id).all()
    if not positions:
        return 3.5

    total_value = 0.0
    weighted_yield = 0.0

    for position in positions:
        instrument = Instrument.query.filter_by(symbol=position.symbol).first()
        if not instrument:
            continue
        latest_price = Price.query.filter_by(instrument_id=instrument.id) \
            .order_by(Price.date.desc()).first()
        if not latest_price or not latest_price.close:
            continue
        current_value = position.quantity * latest_price.close
        dividend_yield_pct = normalize_dividend_yield(instrument.dividend_yield)
        # If static yield is missing, approximate a trailing 12-month yield from Price.dividend
        if dividend_yield_pct is None or dividend_yield_pct == 0:
            try:
                cutoff = latest_price.date - relativedelta(years=1)
                ttm_div = db.session.query(db.func.sum(Price.dividend)).filter(
                    Price.instrument_id == instrument.id,
                    Price.date >= cutoff
                ).scalar() or 0.0
                if latest_price.close > 0 and ttm_div > 0:
                    dividend_yield_pct = (ttm_div / latest_price.close) * 100.0
            except Exception:
                pass
        if dividend_yield_pct is None:
            continue
        total_value += current_value
        weighted_yield += current_value * dividend_yield_pct

    if total_value <= 0:
        return 3.5
    return weighted_yield / total_value


def aggregate_portfolio_state(user_id):
    user = User.query.get(user_id)
    if not user:
        return None

    positions = UserPosition.query.filter_by(user_id=user_id).all()
    if not positions:
        return {
            "user": user,
            "positions": [],
            "total_value": 0.0,
            "total_cost": 0.0,
            "weighted_yield_pct": calculate_weighted_dividend_yield(user_id)
        }

    holdings = []
    total_value = 0.0
    total_cost = 0.0
    for position in positions:
        instrument = Instrument.query.filter_by(symbol=position.symbol).first()
        if not instrument:
            continue
        latest_price = Price.query.filter_by(instrument_id=instrument.id).order_by(Price.date.desc()).first()
        if not latest_price:
            continue
        current_value = position.quantity * latest_price.close
        cost_basis = position.quantity * position.avg_price
        total_value += current_value
        total_cost += cost_basis
        holdings.append({
            "symbol": position.symbol,
            "name": instrument.name,
            "quantity": position.quantity,
            "current_price": latest_price.close,
            "current_value": current_value
        })

    return {
        "user": user,
        "positions": holdings,
        "total_value": total_value,
        "total_cost": total_cost,
        "weighted_yield_pct": calculate_weighted_dividend_yield(user_id)
    }


def derive_return_assumption(user_id, total_value, term_years):
    months = max(int(term_years * 12), 12)
    start_date = date.today() - relativedelta(months=months - 1)
    simulation = run_performance_simulation(
        user_id=user_id,
        months=months,
        start_date=start_date,
        investment_mode='lump_sum',
        initial_investment=max(total_value, 1.0),
        monthly_contribution=0.0,
        timeframe_key='custom',
        benchmark_symbol=None,
        inflation_adjust=False,
        distribution_policy='reinvest',
        contribution_frequency='monthly',
        annual_month=None
    )
    annual_return = simulation.get('annual_return') if isinstance(simulation, dict) else None
    if annual_return is None:
        return 8.0
    return annual_return


def solve_monthly_contribution(target_value, current_value, annual_return_pct, term_years):
    if target_value <= 0:
        return 0.0
    if current_value >= target_value:
        return 0.0
    months = max(int(term_years * 12), 1)
    rate = max(annual_return_pct / 100.0, 0.0)
    monthly_rate = math.pow(1 + rate, 1 / 12) - 1 if rate > 0 else 0.0
    if monthly_rate <= 0:
        return max((target_value - current_value) / months, 0.0)
    factor = math.pow(1 + monthly_rate, months)
    numerator = target_value - current_value * factor
    if numerator <= 0:
        return 0.0
    denominator = factor - 1
    if denominator == 0:
        return 0.0
    payment = (numerator * monthly_rate) / denominator
    return max(payment, 0.0)


def solve_timeline_for_budget(budget, target_value, current_value, annual_return_pct):
    budget = max(budget, 0.0)
    if budget <= 0:
        return None
    if current_value >= target_value:
        return 0.0
    rate = max(annual_return_pct / 100.0, 0.0)
    monthly_rate = math.pow(1 + rate, 1 / 12) - 1 if rate > 0 else 0.0
    if monthly_rate <= 0:
        months = (target_value - current_value) / budget
        return max(months, 0.0)
    numerator = budget + monthly_rate * target_value
    denominator = budget + monthly_rate * current_value
    if denominator <= 0 or numerator <= denominator:
        return None
    months = math.log(numerator / denominator, 1 + monthly_rate)
    return max(months, 0.0)


def resolve_target_weight(replacement_symbol, candidate_weight, sleeves):
    """Pick a sensible target weight for a replacement instrument."""
    sleeve_weight = sleeves.get(replacement_symbol)
    if sleeve_weight and sleeve_weight > 0:
        return round(sleeve_weight, 2)
    if candidate_weight and candidate_weight > 0:
        return round(candidate_weight, 2)
    if sleeves:
        average_weight = sum(sleeves.values()) / max(len(sleeves), 1)
        return round(average_weight, 2)
    return 5.0


def generate_suggestions(holdings, portfolio, allocation_targets, applied_actions=None):
    if not portfolio or not holdings:
        return []

    suggestion_candidates = []
    six_months_ago = date.today() - relativedelta(months=6)
    applied_pairs = set()
    applied_count = 0
    if applied_actions is None and portfolio:
        applied_actions = SuggestionAction.query.filter_by(user_id=portfolio.user_id, action='applied').all()
    if applied_actions:
        applied_pairs = {(action.replace_symbol, action.suggest_symbol) for action in applied_actions}
        applied_count = len(applied_actions)

    for holding in holdings:
        instrument = Instrument.query.filter_by(symbol=holding['symbol']).first()
        if not instrument:
            continue
        past_price = Price.query.filter(Price.instrument_id == instrument.id, Price.date <= six_months_ago) \
            .order_by(Price.date.desc()).first()
        if past_price and past_price.close:
            past_value = past_price.close
        else:
            past_value = holding['avg_price']
        if past_value and past_value > 0:
            trailing_return = (holding['current_price'] - past_value) / past_value * 100
        else:
            trailing_return = 0
        dividend_yield = normalize_dividend_yield(instrument.dividend_yield)
        suggestion_candidates.append({
            "symbol": holding['symbol'],
            "name": holding['name'],
            "trailing_return": trailing_return,
            "weight": holding['weight'],
            "dividend_yield": dividend_yield
        })

    if not suggestion_candidates:
        return []

    suggestion_candidates.sort(key=lambda item: item['trailing_return'])
    archetype_name = portfolio.archetype if portfolio else 'Anchor'
    archetype_config = ARCHETYPE_CONFIG.get(archetype_name, ARCHETYPE_CONFIG['Anchor'])
    goal = archetype_config.get('goal', 'balanced')
    sleeves = archetype_config.get('sleeves', {})
    ranked_targets = sorted(sleeves.items(), key=lambda kv: kv[1], reverse=True)
    existing_symbols = set(h['symbol'] for h in holdings)
    average_trailing = sum(item['trailing_return'] for item in suggestion_candidates) / max(len(suggestion_candidates), 1)

    max_suggestions = max(0, 5 - applied_count)
    if max_suggestions <= 0:
        return []

    # Build candidate replacements from archetype sleeves that are underweight or missing
    available_replacements = []
    for symbol, weight in ranked_targets:
        if symbol in existing_symbols:
            continue
        instrument = Instrument.query.filter_by(symbol=symbol).first()
        if not instrument:
            continue
        latest_price = Price.query.filter_by(instrument_id=instrument.id) \
            .order_by(Price.date.desc()).first()
        baseline_price = None
        if latest_price:
            past_price = Price.query.filter(Price.instrument_id == instrument.id, Price.date <= six_months_ago) \
                .order_by(Price.date.desc()).first()
            if past_price and past_price.close:
                baseline_price = past_price.close
        trailing = 0.0
        if latest_price and latest_price.close and baseline_price and baseline_price > 0:
            trailing = (latest_price.close - baseline_price) / baseline_price * 100
        available_replacements.append({
            "symbol": symbol,
            "name": instrument.name,
            "weight": weight,
            "instrument": instrument,
            "trailing_return": trailing,
            "dividend_yield": normalize_dividend_yield(instrument.dividend_yield)
        })

    # If we still need more choices, expand to the broader instrument universe (excluding current holdings)
    if len(available_replacements) < 6:
        extra_instruments = Instrument.query.filter_by(is_active=True).all()
        for instrument in extra_instruments:
            if instrument.symbol in existing_symbols:
                continue
            if any(option["symbol"] == instrument.symbol for option in available_replacements):
                continue
            latest_price = Price.query.filter_by(instrument_id=instrument.id) \
                .order_by(Price.date.desc()).first()
            if not latest_price or not latest_price.close:
                continue
            past_price = Price.query.filter(Price.instrument_id == instrument.id, Price.date <= six_months_ago) \
                .order_by(Price.date.desc()).first()
            baseline_price = past_price.close if past_price and past_price.close else None
            trailing = 0.0
            if baseline_price and baseline_price > 0:
                trailing = (latest_price.close - baseline_price) / baseline_price * 100
            fallback_weight = resolve_target_weight(instrument.symbol, None, sleeves)
            available_replacements.append({
                "symbol": instrument.symbol,
                "name": instrument.name,
                "weight": fallback_weight,
                "instrument": instrument,
                "trailing_return": trailing,
                "dividend_yield": normalize_dividend_yield(instrument.dividend_yield)
            })

    def score_option(option):
        dividend = option.get("dividend_yield") or 0.0
        trailing = option.get("trailing_return") or 0.0
        weight = option.get("weight") or 0.0
        if goal == 'growth':
            return trailing * 1.0 + dividend * 0.1
        if goal == 'income':
            return dividend * 1.0 + trailing * 0.2
        if goal == 'fallback':
            return dividend * 0.7 + weight * 0.3 + trailing * 0.1
        # balanced default
        return trailing * 0.6 + dividend * 0.4

    sorted_replacements = sorted(available_replacements, key=score_option, reverse=True)

    suggestion_pairs = []
    used_replacement_symbols = set()
    for candidate in suggestion_candidates:
        if len(suggestion_pairs) >= max_suggestions * 2:
            break
        for replacement_option in sorted_replacements:
            replacement_symbol = replacement_option["symbol"]
            if replacement_symbol == candidate['symbol']:
                continue
            if replacement_symbol in used_replacement_symbols:
                continue
            if (candidate['symbol'], replacement_symbol) in applied_pairs:
                continue
            target_weight = resolve_target_weight(replacement_symbol, candidate.get('weight'), sleeves)
            reason = generate_suggestion_reason(
                candidate,
                replacement_option,
                average_trailing,
                archetype_config
            )
            pair_score = score_option(replacement_option) - (candidate.get('trailing_return') or 0.0)
            suggestion_pairs.append({
                "score": pair_score,
                "candidate": candidate,
                "replacement": replacement_option,
                "target_weight": target_weight,
                "reason": reason
            })
            used_replacement_symbols.add(replacement_symbol)
            break

    if not suggestion_pairs:
        return []

    suggestion_pairs.sort(key=lambda item: item['score'], reverse=True)

    suggestions = []
    for entry in suggestion_pairs:
        candidate = entry['candidate']
        replacement_option = entry['replacement']
        replacement_symbol = replacement_option['symbol']
        replacement_instrument = replacement_option['instrument']
        suggestions.append({
            "replace_symbol": candidate['symbol'],
            "replace_name": candidate['name'],
            "trailing_return": round(candidate['trailing_return'], 2),
            "suggest_symbol": replacement_symbol,
            "suggest_name": replacement_instrument.name if replacement_instrument else replacement_symbol,
            "target_weight": entry['target_weight'],
            "suggest_trailing_return": round(replacement_option.get("trailing_return") or 0.0, 2),
            "suggest_dividend_yield": round(replacement_option.get("dividend_yield") or 0.0, 2),
            "reason": entry['reason']
        })
        if len(suggestions) >= max_suggestions:
            break

    return suggestions


def generate_goal_alerts(user, portfolio, holdings, allocation_targets, archetype_meta, total_value):
    alerts = []
    timestamp = datetime.utcnow().isoformat()
    holdings_map = {h["symbol"]: h for h in holdings}

    if not portfolio or not user:
        return alerts

    # Base tolerances
    drift_tolerance = 5.0  # percent points from target weight
    anchor_symbol = (user.anchor_stock or "").upper()
    anchor_cap = None
    if archetype_meta:
        anchor_cap = archetype_meta.get("anchor_cap_pct")
    if anchor_cap is None:
        try:
            anchor_cap = float(allocation_targets.get(anchor_symbol)) if anchor_symbol else None
        except (TypeError, ValueError):
            anchor_cap = None

    # Allocation drift alerts
    for symbol, target in (allocation_targets or {}).items():
        try:
            target_weight = float(target)
        except (TypeError, ValueError):
            continue
        actual_weight = holdings_map.get(symbol, {}).get("weight", 0.0) or 0.0
        if target_weight < 0.01:
            continue
        drift = actual_weight - target_weight
        if abs(drift) >= drift_tolerance:
            severity = "warning" if abs(drift) < max(12.0, target_weight * 0.6) else "critical"
            direction = "overweight" if drift > 0 else "underweight"
            alerts.append({
                "id": f"allocation-{symbol.lower()}",
                "severity": severity,
                "symbol": symbol,
                "metric": "allocation_drift",
                "trigger": {
                    "target": round(target_weight, 2),
                    "actual": round(actual_weight, 2),
                    "delta": round(drift, 2)
                },
                "message": f"{symbol} is {abs(drift):.1f} pts {direction} versus the plan target of {target_weight:.1f}%.",
                "suggested_action": "Rebalance this sleeve back to its target weight.",
                "created_at": timestamp
            })

    # Anchor coverage
    if anchor_symbol:
        anchor_holding = holdings_map.get(anchor_symbol)
        anchor_actual = anchor_holding.get("weight", 0.0) if anchor_holding else 0.0
        anchor_threshold = (anchor_cap or 5.0)
        if not anchor_holding:
            alerts.append({
                "id": f"anchor-missing-{anchor_symbol.lower()}",
                "severity": "critical",
                "symbol": anchor_symbol,
                "metric": "anchor_exposure",
                "message": f"Your anchor stock {anchor_symbol} is missing from the portfolio.",
                "suggested_action": f"Add {anchor_symbol} to restore the {anchor_threshold:.1f}% anchor allocation.",
                "created_at": timestamp
            })
        elif anchor_actual < max(1.0, anchor_threshold - drift_tolerance):
            alerts.append({
                "id": f"anchor-underweight-{anchor_symbol.lower()}",
                "severity": "warning",
                "symbol": anchor_symbol,
                "metric": "anchor_exposure",
                "trigger": {
                    "target": round(anchor_threshold, 2),
                    "actual": round(anchor_actual, 2)
                },
                "message": f"{anchor_symbol} carries {anchor_actual:.1f}% weight versus the {anchor_threshold:.1f}% anchor cap.",
                "suggested_action": f"Top up {anchor_symbol} to maintain your defensive anchor.",
                "created_at": timestamp
            })

    # Loss alerts for individual holdings
    for holding in holdings:
        pnl_pct = holding.get("pnl_pct") or 0.0
        symbol = holding.get("symbol")
        if pnl_pct <= -12.0:
            severity = "warning" if pnl_pct > -25.0 else "critical"
            alerts.append({
                "id": f"loss-{symbol.lower()}",
                "severity": severity,
                "symbol": symbol,
                "metric": "loss_guardrail",
                "trigger": {
                    "pnl_pct": round(pnl_pct, 2),
                    "pnl_value": round(holding.get("pnl") or 0.0, 2)
                },
                "message": f"{symbol} is down {abs(pnl_pct):.1f}% since entry.",
                "suggested_action": "Review recent news and decide whether to trim, switch, or stay the course.",
                "created_at": timestamp
            })

    # Diversification reminder if portfolio is very concentrated
    if total_value and len(holdings) <= 3 and total_value > 0:
        alerts.append({
            "id": "diversification-reminder",
            "severity": "info",
            "metric": "diversification",
            "message": "Only a handful of holdings are active. Consider spreading risk across more sleeves.",
            "suggested_action": "Use the suggestions or contribution lab to broaden your mix.",
            "created_at": timestamp
        })

    return alerts


def generate_suggestion_reason(candidate, replacement_option, universe_avg, archetype_config):
    replace_perf = candidate['trailing_return']
    delta_vs_avg = replace_perf - universe_avg
    goal = archetype_config.get('goal', 'balanced')
    risk_band = archetype_config.get('risk_band', 'medium')
    replacement_symbol = replacement_option.get("symbol")
    replacement_name = replacement_option.get("name", replacement_symbol)
    replacement_return = replacement_option.get("trailing_return")
    replacement_yield = replacement_option.get("dividend_yield")
    candidate_yield = candidate.get("dividend_yield")

    def format_delta(value):
        if abs(value) < 0.5:
            return "roughly in line with"
        sign = "ahead" if value > 0 else "behind"
        return f"{abs(value):.1f} pts {sign}"

    def yield_phrase(yield_value):
        return f"{yield_value:.1f}%" if yield_value is not None else "n/a"

    delta_abs = abs(delta_vs_avg)
    if delta_abs < 0.5:
        delta_summary = "has kept pace with the rest of your sleeve"
        delta_clause = "kept pace with"
    else:
        delta_direction = "ahead of" if delta_vs_avg > 0 else "behind"
        delta_summary = f"is {delta_abs:.1f} pts {delta_direction} the rest of your sleeve"
        delta_clause = f"{delta_abs:.1f} pts {delta_direction}"

    if goal == 'income':
        candidate_yield_phrase = yield_phrase(candidate_yield)
        replacement_yield_phrase = yield_phrase(replacement_yield)
        context = f"{candidate['symbol']} {delta_summary}."
        return (
            f"{context} {replacement_name} offers an estimated dividend yield near {replacement_yield_phrase} "
            f"versus {candidate_yield_phrase} on your current holding, helping the {risk_band} income mix sustain cash flow."
        )

    if goal == 'growth':
        replacement_return_phrase = f"{replacement_return:.1f}%" if replacement_return is not None else "stronger"
        return (
            f"{candidate['symbol']} returned {replace_perf:.1f}% over six months, {delta_clause} "
            f"the rest of your growth sleeve. {replacement_name} compounded at {replacement_return_phrase} in the same window "
            f"and keeps you aligned with the high-growth target weights."
        )

    if goal == 'balanced':
        replacement_return_phrase = f"{replacement_return:.1f}%" if replacement_return is not None else "steadier results"
        replacement_yield_phrase = yield_phrase(replacement_yield)
        delta_line = (
            f"{candidate['symbol']} has {delta_clause} the sleeve average."
            if delta_abs >= 0.5 else
            f"{candidate['symbol']} has tracked the sleeve average."
        )
        return (
            f"{delta_line} "
            f"Switching into {replacement_name} adds {replacement_return_phrase} recent performance plus a "
            f"{replacement_yield_phrase} dividend cushion, which suits the balanced mandate."
        )

    # fallback goal
    replacement_yield_phrase = yield_phrase(replacement_yield)
    delta_line = (
        f"{candidate['symbol']} is {delta_clause} your defensive targets."
        if delta_abs >= 0.5 else
        f"{candidate['symbol']} is holding its line within your defensive targets."
    )
    return (
        f"{delta_line} {replacement_name} provides a steadier ballast with a {replacement_yield_phrase} payout, "
        f"supporting the low-risk Anchor profile."
    )


def synthesize_symbol_news(symbol, name, goal=None):
    """Create deterministic news blurbs for a holding based on archetype goal."""
    seed_input = f"news-{symbol}-{goal or 'general'}"
    seed = int.from_bytes(hashlib.sha256(seed_input.encode("utf-8")).digest()[:8], 'big')
    rng = random.Random(seed)

    base_topics = [
        "market outlook",
        "earnings momentum",
        "sector rotation",
        "macro backdrop",
        "regulatory update",
        "dividend guidance",
        "balance sheet strength"
    ]

    goal_topics = {
        "growth": [
            "top-line acceleration",
            "innovation pipeline",
            "offshore expansion",
            "technology leadership"
        ],
        "income": [
            "distribution guidance",
            "yield resilience",
            "cash flow stability",
            "payout sustainability"
        ],
        "balanced": [
            "risk management",
            "portfolio diversification",
            "rand hedging",
            "capital allocation"
        ],
        "fallback": [
            "defensive posture",
            "volatility control",
            "capital preservation",
            "quality bias"
        ]
    }

    sentiments = [
        ("positive", "Positive"),
        ("neutral", "Neutral"),
        ("mixed", "Mixed"),
        ("negative", "Cautious")
    ]

    goal_list = goal_topics.get(goal, [])
    stories = []
    for idx in range(2):
        topic_pool = base_topics + goal_list
        topic = rng.choice(topic_pool)
        sentiment_key, sentiment_label = rng.choice(sentiments)
        days_ago = rng.randint(1, 6 + idx * 2)
        published_at = datetime.now() - relativedelta(days=days_ago)

        if goal == 'income' and 'dividend' not in topic.lower():
            summary_focus = "distribution outlook"
        elif goal == 'growth' and 'growth' not in topic.lower():
            summary_focus = "growth momentum"
        else:
            summary_focus = topic

        headline_templates = {
            'positive': f"{name} shines as {topic} lifts sentiment",
            'neutral': f"{name} steady amid {topic} chatter",
            'mixed': f"{name} sees mixed read-through on {topic}",
            'negative': f"{name} under scrutiny after {topic} update"
        }
        summary_templates = {
            'positive': (
                f"Analysts highlight improving {summary_focus} for {name}, supporting the {goal or 'core'} sleeve."
            ),
            'neutral': (
                f"{name} trades in line with peers while the team reassesses {summary_focus} implications."
            ),
            'mixed': (
                f"Signals on {summary_focus} are mixed, but portfolio managers keep {name} within strategic bounds."
            ),
            'negative': (
                f"Short-term pressure around {summary_focus} keeps risk teams alert, though the long-term thesis remains intact."
            )
        }

        headline_text = headline_templates.get(sentiment_key, headline_templates['neutral'])
        summary_text = summary_templates.get(sentiment_key, summary_templates['neutral'])
        search_query = f"{symbol} {headline_text}".strip()

        stories.append({
            "id": f"{symbol}-{idx}",
            "symbol": symbol,
            "name": name,
            "headline": headline_text,
            "summary": summary_text,
            "sentiment": sentiment_label,
            "topic": topic,
            "published_at": published_at.isoformat(),
            "source": "StockBuddy Insights",
            "url": f"https://www.google.com/search?q={quote_plus(search_query)}"
        })
    return stories


def attach_sentiment_guidance(summary, sentiment, goal):
    message = summary or ''
    if not sentiment:
        return message
    sentiment_key = sentiment.lower()
    if sentiment_key == 'cautious':
        if goal == 'income':
            guidance = "Cautious signals flag potential pressure on dividend cover—monitor distributions and keep emergency cash handy."
        elif goal == 'growth':
            guidance = "Volatility could spike; stay disciplined with rebalancing and avoid chasing the drawdown."
        elif goal == 'balanced':
            guidance = "Expect bumpier returns than usual. Recheck diversification so equity swings don’t overwhelm the mix."
        else:
            guidance = "Keep an eye on defensive sleeves and consider trimming if risk drifts above your comfort zone."
        message = f"{message} {guidance}".strip()
    elif sentiment_key == 'mixed':
        message = f"{message} Keep watching this sleeve—signals are mixed, so wait for confirmation before making big allocation changes.".strip()
    elif sentiment_key == 'positive':
        message = f"{message} Positive momentum supports the current weighting, but continue tracking valuation drift.".strip()
    return message


def simulate_path(
    price_df,
    dividend_df,
    initial_units=None,
    invested_start=0.0,
    initial_investment=0.0,
    monthly_contribution=0.0,
    distribution_policy='reinvest',
    allocation_weights=None,
    contribution_frequency='monthly',
    annual_month=None
):
    price_df = price_df.sort_index()
    dividend_df = dividend_df.reindex(price_df.index, fill_value=0.0) if not dividend_df.empty else pd.DataFrame(0, index=price_df.index, columns=price_df.columns)
    dividend_df = dividend_df.fillna(0.0)

    freq = (contribution_frequency or 'monthly').lower()
    if freq not in {'monthly', 'quarterly', 'annual'}:
        freq = 'monthly'
    annual_month_int = None
    if annual_month is not None:
        try:
            month_candidate = int(annual_month)
            if 1 <= month_candidate <= 12:
                annual_month_int = month_candidate
        except (TypeError, ValueError):
            annual_month_int = None

    contribution_schedule = {}
    if monthly_contribution and monthly_contribution > 0:
        first_date = price_df.index[0]
        start_month = first_date.month
        start_year = first_date.year
        target_month = annual_month_int or start_month
        seen_months = set()
        for date in price_df.index:
            month_key = (date.year, date.month)
            if month_key in seen_months:
                continue
            seen_months.add(month_key)
            include = False
            if freq == 'monthly':
                include = True
            elif freq == 'quarterly':
                delta = (date.year - start_year) * 12 + (date.month - start_month)
                include = (delta % 3 == 0)
            elif freq == 'annual':
                include = date.month == target_month
            if include:
                contribution_schedule[date] = monthly_contribution

    symbols = list(price_df.columns)
    units = {symbol: 0.0 for symbol in symbols}
    if initial_units:
        for symbol, qty in initial_units.items():
            if symbol in units:
                units[symbol] = qty

    invested_total = invested_start
    cash_balance = 0.0
    values = []
    prev_date = None
    total_dividends_generated = 0.0
    total_dividends_distributed = 0.0

    def distribute_investment(amount, prices):
        nonlocal cash_balance
        if amount <= 0:
            return
        allocation_symbols = [symbol for symbol in symbols if prices.get(symbol, 0.0) > 0]
        if not allocation_symbols:
            allocation_symbols = list(symbols)
        if not allocation_symbols:
            cash_balance += amount
            return

        total_value = sum(
            units.get(symbol, 0.0) * prices.get(symbol, 0.0)
            for symbol in allocation_symbols
            if prices.get(symbol, 0.0) > 0
        )

        weights = {}
        if total_value > 0:
            for symbol in allocation_symbols:
                price = prices.get(symbol, 0.0)
                if price > 0:
                    weights[symbol] = (units.get(symbol, 0.0) * price) / total_value
            weight_sum = sum(weights.values())
            if weight_sum > 0:
                weights = {symbol: w / weight_sum for symbol, w in weights.items()}
            else:
                weights = {}
        if not weights:
            if allocation_weights:
                weight_sum = sum(allocation_weights.get(symbol, 0.0) for symbol in allocation_symbols)
                if weight_sum > 0:
                    weights = {
                        symbol: max(allocation_weights.get(symbol, 0.0), 0.0) / weight_sum
                        for symbol in allocation_symbols
                    }
            if not weights:
                weights = {symbol: 1 / len(allocation_symbols) for symbol in allocation_symbols}

        allocated = 0.0
        for symbol in allocation_symbols:
            price = prices.get(symbol, 0.0)
            if price <= 0:
                continue
            weight = weights.get(symbol, 0.0)
            allocation = amount * weight
            if allocation <= 0:
                continue
            units[symbol] = units.get(symbol, 0.0) + allocation / price
            allocated += allocation

        leftover = amount - allocated
        if leftover > 1e-6:
            cash_balance += leftover

    for date, prices in price_df.iterrows():
        prices = prices.fillna(0.0)
        contribution = 0.0
        if prev_date is None and initial_investment > 0:
            contribution += initial_investment
        if contribution_schedule:
            scheduled_amount = contribution_schedule.get(date, 0.0)
            if scheduled_amount > 0:
                contribution += scheduled_amount

        if contribution > 0:
            invested_total += contribution
            distribute_investment(contribution, prices)

        dividends_today = 0.0
        dividend_row = dividend_df.loc[date] if date in dividend_df.index else None
        if dividend_row is not None:
            if isinstance(dividend_row, pd.Series):
                for symbol, dividend in dividend_row.items():
                    if dividend and dividend > 0:
                        dividends_today += units.get(symbol, 0.0) * dividend
            else:
                dividend = float(dividend_row)
                if dividend > 0 and symbols:
                    symbol = symbols[0]
                    dividends_today += units.get(symbol, 0.0) * dividend

        if dividends_today > 0:
            total_dividends_generated += dividends_today
            if distribution_policy == 'cash_out':
                cash_balance += dividends_today
                total_dividends_distributed += dividends_today
            else:
                distribute_investment(dividends_today, prices)

        portfolio_value = sum(units.get(symbol, 0.0) * prices.get(symbol, 0.0) for symbol in symbols)
        if distribution_policy == 'cash_out':
            values.append(portfolio_value)
        else:
            values.append(portfolio_value + cash_balance)
        prev_date = date

    series = pd.Series(values, index=price_df.index)
    return series, invested_total, total_dividends_generated, total_dividends_distributed


def calculate_historical_performance(
    user_id,
    start_date,
    end_date,
    timeframe_key,
    benchmark_symbol=None,
    investment_mode='lump_sum',
    initial_investment=0.0,
    monthly_contribution=0.0,
    distribution_policy='reinvest',
    contribution_frequency='monthly',
    annual_month=None,
    inflation_adjust=False
):
    positions = UserPosition.query.filter_by(user_id=user_id).all()
    if not positions:
        return None

    instrument_ids = set()
    symbol_quantities = {}
    total_invested = 0.0
    for pos in positions:
        instrument = Instrument.query.filter_by(symbol=pos.symbol).first()
        if not instrument:
            continue
        instrument_ids.add(instrument.id)
        symbol_quantities[pos.symbol] = pos.quantity
        total_invested += pos.quantity * pos.avg_price

    if not instrument_ids:
        return None

    price_rows = Price.query.filter(
        Price.instrument_id.in_(list(instrument_ids)),
        Price.date >= start_date,
        Price.date <= end_date
    ).all()

    if not price_rows:
        return None

    instrument_lookup = {}
    instruments = Instrument.query.filter(Instrument.id.in_(list(instrument_ids))).all()
    for inst in instruments:
        instrument_lookup[inst.id] = inst

    data = []
    for row in price_rows:
        inst = instrument_lookup.get(row.instrument_id)
        if not inst:
            continue
        data.append({
            "date": row.date,
            "symbol": inst.symbol,
            "close": row.close,
            "dividend": row.dividend or 0.0,
            "name": inst.name
        })

    if not data:
        return None

    df = pd.DataFrame(data)
    if df.empty:
        return None

    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    price_pivot = df.pivot(index='date', columns='symbol', values='close').sort_index()
    price_pivot.index = pd.to_datetime(price_pivot.index)
    price_pivot = price_pivot.ffill().dropna(how='all')
    start_ts = pd.Timestamp(start_date)
    end_ts = pd.Timestamp(end_date)
    price_pivot = price_pivot.loc[(price_pivot.index >= start_ts) & (price_pivot.index <= end_ts)]

    if price_pivot.empty:
        return None

    quantities_series = pd.Series(symbol_quantities)
    price_pivot = price_pivot.reindex(columns=quantities_series.index, fill_value=None)
    price_pivot = price_pivot.ffill().dropna(axis=1, how='all')
    if price_pivot.empty:
        return None

    value_series = price_pivot.mul(quantities_series, axis=1).sum(axis=1)
    value_series = value_series.dropna()
    if value_series.empty:
        return None

    latest_prices = price_pivot.iloc[-1]
    weights_raw = {}
    for symbol in price_pivot.columns:
        quantity = symbol_quantities.get(symbol, 0.0)
        price_ref = latest_prices.get(symbol)
        if quantity and price_ref and price_ref > 0:
            weights_raw[symbol] = quantity * price_ref
    total_weight = sum(weights_raw.values())
    weight_map = {}
    if total_weight > 0:
        weight_map = {symbol: value / total_weight for symbol, value in weights_raw.items()}
    else:
        count = len(price_pivot.columns)
        if count > 0:
            weight_map = {symbol: 1 / count for symbol in price_pivot.columns}

    initial_units = {symbol: 0.0 for symbol in price_pivot.columns}

    dividend_pivot = df.pivot(index='date', columns='symbol', values='dividend').sort_index().fillna(0.0)
    dividend_pivot.index = pd.to_datetime(dividend_pivot.index)

    freq = (contribution_frequency or 'monthly').lower()
    if freq not in {'monthly', 'quarterly', 'annual'}:
        freq = 'monthly'
    annual_month_int = None
    if annual_month is not None:
        try:
            month_candidate = int(annual_month)
            if 1 <= month_candidate <= 12:
                annual_month_int = month_candidate
        except (TypeError, ValueError):
            annual_month_int = None

    monthly_amount = monthly_contribution if investment_mode == 'monthly' and monthly_contribution else 0.0
    applied_initial_investment = initial_investment if initial_investment and initial_investment > 0 else 0.0

    portfolio_series, invested_total_sim, dividends_total, dividends_distributed = simulate_path(
        price_pivot,
        dividend_pivot,
        initial_units=initial_units,
        invested_start=0.0,
        initial_investment=applied_initial_investment,
        monthly_contribution=monthly_amount,
        distribution_policy=distribution_policy,
        allocation_weights=weight_map if weight_map else None,
        contribution_frequency=freq,
        annual_month=annual_month_int
    )

    if portfolio_series.empty:
        return None

    total_invested_sim = invested_total_sim
    ending_value_holdings = portfolio_series.iloc[-1]
    effective_ending_value = ending_value_holdings + (dividends_distributed if distribution_policy == 'cash_out' else 0.0)
    total_return = effective_ending_value - total_invested_sim
    total_return_pct = (total_return / total_invested_sim * 100) if total_invested_sim > 0 else 0.0

    days = max((portfolio_series.index[-1] - portfolio_series.index[0]).days, 1)
    years = days / 365.25
    annual_return_pct = ((effective_ending_value / total_invested_sim) ** (1 / years) - 1) * 100 if total_invested_sim > 0 and effective_ending_value > 0 else 0.0

    returns = portfolio_series.pct_change().dropna()
    volatility_pct = returns.std() * (252 ** 0.5) * 100 if not returns.empty else 0.0
    running_max = portfolio_series.cummax()
    drawdown = (portfolio_series - running_max) / running_max * 100
    max_drawdown = drawdown.min() if not drawdown.empty else 0.0

    series = [{"date": idx.strftime('%Y-%m-%d'), "value": round(val, 2)} for idx, val in portfolio_series.items()]

    benchmark_series = []
    benchmark_label = None
    benchmark_total_return_pct = None
    benchmark_volatility_pct = None
    benchmark_max_drawdown = None
    benchmark_cagr_pct = None
    benchmark_dividends_total = 0.0
    bench_dividends_total_sim = None
    benchmark_average_dividend_yield = None
    downside_ratios = []
    if benchmark_symbol:
        benchmark_instrument = Instrument.query.filter_by(symbol=benchmark_symbol).first()
        if benchmark_instrument:
            bench_prices = Price.query.filter(
                Price.instrument_id == benchmark_instrument.id,
                Price.date >= start_date,
                Price.date <= end_date
            ).order_by(Price.date.asc()).all()
            if bench_prices:
                bench_df = pd.DataFrame([
                    {"date": row.date, "close": row.close} for row in bench_prices
                ])
                bench_df = bench_df.sort_values('date').drop_duplicates('date', keep='last')
                bench_df = bench_df.set_index('date')
                bench_df.index = pd.to_datetime(bench_df.index)
                bench_df = bench_df.reindex(portfolio_series.index, method='ffill')
                bench_df = bench_df.dropna()
                bench_price_df = bench_df[['close']]
                bench_price_df = bench_price_df.rename(columns={'close': benchmark_symbol})
                bench_dividend_df = pd.DataFrame([
                    {"date": row.date, "dividend": row.dividend or 0.0}
                    for row in bench_prices
                ])
                bench_dividend_df = bench_dividend_df.sort_values('date').drop_duplicates('date', keep='last')
                bench_dividend_df = bench_dividend_df.set_index('date')
                bench_dividend_df.index = pd.to_datetime(bench_dividend_df.index)
                bench_dividend_df = bench_dividend_df.reindex(bench_price_df.index, fill_value=0.0)
                bench_dividend_df = bench_dividend_df.rename(columns={'dividend': benchmark_symbol})

                bench_series, invested_bench, bench_dividends_total_sim, _ = simulate_path(
                    bench_price_df,
                    bench_dividend_df,
                    initial_units={benchmark_symbol: 0.0},
                    invested_start=0.0,
                    initial_investment=applied_initial_investment,
                    monthly_contribution=monthly_amount,
                    distribution_policy=distribution_policy,
                    allocation_weights={benchmark_symbol: 1.0},
                    contribution_frequency=freq,
                    annual_month=annual_month_int
                )
                bench_series = bench_series.reindex(portfolio_series.index, method='ffill')
                if not bench_series.empty:
                    bench_returns = bench_series.pct_change().dropna()
                    if not bench_returns.empty:
                        benchmark_volatility_pct = bench_returns.std() * (252 ** 0.5) * 100
                        negative_mask = bench_returns < 0
                        if negative_mask.any():
                            portfolio_returns = portfolio_series.pct_change().reindex(bench_returns.index)
                            ratios = portfolio_returns[negative_mask] / bench_returns[negative_mask]
                            ratios = ratios.replace([float('inf'), float('-inf')], float('nan')).dropna()
                            downside_ratios.extend(ratios.tolist())
                    cum_max = bench_series.cummax()
                    drawdowns = ((bench_series / cum_max) - 1) * 100
                    benchmark_max_drawdown = drawdowns.min() if not drawdowns.empty else None
                    first_val = bench_series.iloc[0]
                    last_val = bench_series.iloc[-1]
                    if first_val and first_val > 0:
                        benchmark_total_return_pct = ((last_val - first_val) / first_val) * 100
                        years_bench = years if years > 0 else max(len(bench_series) / 252, 0.0001)
                        if last_val > 0:
                            benchmark_cagr_pct = ((last_val / first_val) ** (1 / years_bench) - 1) * 100
                benchmark_series = [
                    {"date": idx.strftime('%Y-%m-%d'), "value": round(val, 2)}
                    for idx, val in bench_series.items()
                ]
                benchmark_label = benchmark_instrument.name
                if bench_dividends_total_sim and bench_dividends_total_sim > 0:
                    benchmark_dividends_total = bench_dividends_total_sim
                elif not bench_dividend_df.empty:
                    benchmark_dividends_total = bench_dividend_df.sum().sum()
                if invested_bench and invested_bench > 0 and years > 0 and benchmark_dividends_total > 0:
                    benchmark_average_dividend_yield = (benchmark_dividends_total / invested_bench / years * 100)

    months = max(1, int(round(days / 30.0)))

    average_dividend_yield = (dividends_total / total_invested_sim / years * 100) if total_invested_sim > 0 and years > 0 and dividends_total > 0 else None
    downside_capture_pct = None
    if downside_ratios:
        downside_capture_pct = sum(downside_ratios) / len(downside_ratios) * 100
    elif benchmark_total_return_pct is not None and benchmark_total_return_pct < 0 and total_return_pct is not None:
        downside_capture_pct = (total_return_pct / benchmark_total_return_pct) * 100

    inflation_series = []
    real_series = []
    real_dividends_distributed = None
    total_return_real = None
    cagr_real = None
    if inflation_adjust:
        inflation_series = generate_mock_inflation_series(
            portfolio_series.index[0].strftime('%Y-%m-%d'),
            portfolio_series.index[-1].strftime('%Y-%m-%d')
        )
        cumulative_inflation = 1.0
        real_values = []
        for idx, point in enumerate(series):
            monthly_inflation = inflation_series[idx]["inflation"] / 100 if idx < len(inflation_series) else 0.004
            monthly_factor = (1 + monthly_inflation) ** (1 / 12)
            cumulative_inflation *= monthly_factor
            real_value = point["value"] / cumulative_inflation if cumulative_inflation else point["value"]
            real_series.append({"date": point["date"], "value": round(real_value, 2)})
            real_values.append(real_value)
        if real_values:
            ending_real = real_values[-1]
            real_dividends_distributed = dividends_distributed / cumulative_inflation if distribution_policy == 'cash_out' and cumulative_inflation else dividends_distributed
            gross_real_value = ending_real + (real_dividends_distributed or 0.0)
            total_return_real = round(gross_real_value - total_invested_sim, 2)
            if total_invested_sim > 0 and gross_real_value > 0:
                cagr_real = (math.pow(gross_real_value / total_invested_sim, 1 / years) - 1) * 100

    return {
        "series": series,
        "cagr": round(annual_return_pct, 2),
        "annual_return": round(annual_return_pct, 2),
        "volatility": round(volatility_pct, 2),
        "max_drawdown": round(max_drawdown, 2),
        "total_invested": round(total_invested_sim, 2),
        "ending_value": round(effective_ending_value, 2),
        "ending_value_holdings": round(ending_value_holdings, 2),
        "total_return": round(total_return, 2),
        "total_return_pct": round(total_return_pct, 2),
        "months": months,
        "timeframe": timeframe_key,
        "start_date": portfolio_series.index[0].strftime('%Y-%m-%d'),
        "end_date": portfolio_series.index[-1].strftime('%Y-%m-%d'),
        "investment_mode": 'historical',
        "benchmark_symbol": benchmark_symbol,
        "benchmark_label": benchmark_label,
        "benchmark_series": benchmark_series,
        "inflation_adjusted": inflation_adjust,
        "inflation_series": inflation_series if inflation_adjust else [],
        "series_real": real_series if inflation_adjust else [],
        "total_return_real": round(total_return_real, 2) if total_return_real is not None else None,
        "annual_return_real": round(cagr_real, 2) if cagr_real is not None else None,
        "distribution_policy": distribution_policy,
        "contribution_frequency": freq,
        "annual_month": annual_month_int,
        "average_dividend_yield": round(average_dividend_yield, 2) if average_dividend_yield is not None else None,
        "total_dividends": round(dividends_total, 2),
        "dividends_distributed": round(dividends_distributed, 2),
        "real_dividends_distributed": round(real_dividends_distributed, 2) if (inflation_adjust and real_dividends_distributed is not None) else None,
        "benchmark_total_return_pct": round(benchmark_total_return_pct, 2) if benchmark_total_return_pct is not None else None,
        "benchmark_volatility": round(benchmark_volatility_pct, 2) if benchmark_volatility_pct is not None else None,
        "benchmark_max_drawdown": round(benchmark_max_drawdown, 2) if benchmark_max_drawdown is not None else None,
        "benchmark_cagr": round(benchmark_cagr_pct, 2) if benchmark_cagr_pct is not None else None,
        "benchmark_total_dividends": round(benchmark_dividends_total, 2) if benchmark_dividends_total is not None else None,
        "benchmark_average_dividend_yield": round(benchmark_average_dividend_yield, 2) if benchmark_average_dividend_yield is not None else None,
        "downside_capture": round(downside_capture_pct, 2) if downside_capture_pct is not None else None
    }

def resolve_timeframe(timeframe, custom_months=None, custom_start=None, custom_end=None):
    """Return start/end dates and month count for supported timeframe labels."""
    timeframe_map = {
        '1y': 12,
        '3y': 36,
        '5y': 60,
    }

    if timeframe == 'custom':
        if custom_start and custom_end:
            start_date = datetime.strptime(custom_start, '%Y-%m-%d').date()
            end_date = datetime.strptime(custom_end, '%Y-%m-%d').date()
            if end_date <= start_date:
                end_date = start_date + relativedelta(months=1)
            months = max(1, (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1)
            return start_date.replace(day=1), end_date, months
        try:
            months = int(custom_months)
        except (TypeError, ValueError):
            months = 60
        months = max(1, min(months, 360))
    else:
        months = timeframe_map.get(timeframe, 60)

    end_date = date.today()
    start_date = end_date - relativedelta(months=months - 1)
    start_date = start_date.replace(day=1)

    return start_date, end_date, months


def run_performance_simulation(
    user_id,
    months,
    start_date,
    investment_mode,
    initial_investment,
    monthly_contribution,
    timeframe_key,
    benchmark_symbol=None,
    inflation_adjust=False,
    distribution_policy='reinvest',
    contribution_frequency='monthly',
    annual_month=None
):
    """Generate mock performance stats with deterministic randomness per user/mode."""
    seed_input = f"{user_id}-{investment_mode}-{months}-{start_date.isoformat()}"
    seed = int.from_bytes(hashlib.sha256(seed_input.encode("utf-8")).digest()[:8], 'big')
    rng = random.Random(seed)

    average_dividend_yield = calculate_weighted_dividend_yield(user_id)
    monthly_dividend_rate = max(average_dividend_yield, 0) / 100 / 12
    total_dividends = 0.0
    dividends_distributed = 0.0

    frequency = (contribution_frequency or 'monthly').lower()
    if frequency not in {'monthly', 'quarterly', 'annual'}:
        frequency = 'monthly'
    try:
        annual_month_int = int(annual_month) if annual_month is not None else None
        if annual_month_int is not None and not (1 <= annual_month_int <= 12):
            annual_month_int = None
    except (TypeError, ValueError):
        annual_month_int = None
    target_annual_month = annual_month_int or start_date.month

    series = []
    current_value = 0.0
    total_invested = 0.0
    prev_value = None
    returns = []
    peak = 0.0
    max_drawdown = 0.0
    current_date = start_date

    for month in range(months):
        if investment_mode == 'lump_sum' and month == 0 and initial_investment > 0:
            current_value += initial_investment
            total_invested += initial_investment
        elif investment_mode == 'monthly' and monthly_contribution > 0:
            contribute_now = False
            if frequency == 'monthly':
                contribute_now = True
            elif frequency == 'quarterly':
                if month % 3 == 0:
                    contribute_now = True
            elif frequency == 'annual':
                if current_date.month == target_annual_month:
                    contribute_now = True
            if contribute_now:
                current_value += monthly_contribution
                total_invested += monthly_contribution

        # Simulate monthly performance with a slight upward drift
        drift = 0.006  # ~7.5% annualised drift
        volatility = 0.025
        change = rng.gauss(drift, volatility)
        current_value *= max(0.5, 1 + change)  # cap downside to avoid negative balances

        if current_value > 0 and monthly_dividend_rate > 0:
            dividend_income = current_value * monthly_dividend_rate
            total_dividends += dividend_income
            if distribution_policy == 'cash_out':
                payout = min(dividend_income, current_value)
                current_value -= payout
                dividends_distributed += payout
            else:
                current_value += dividend_income

        if prev_value and prev_value > 0:
            returns.append((current_value - prev_value) / prev_value)

        peak = max(peak, current_value)
        if peak > 0:
            drawdown = (current_value - peak) / peak * 100
            max_drawdown = min(max_drawdown, drawdown)

        series.append({
            "date": current_date.isoformat(),
            "value": round(current_value, 2)
        })

        prev_value = current_value
        current_date += relativedelta(months=1)

    ending_value = round(current_value, 2)
    cash_distributions = dividends_distributed if distribution_policy == 'cash_out' else 0.0
    gross_value = ending_value + cash_distributions
    total_invested = round(total_invested, 2)
    total_return = round(gross_value - total_invested, 2)
    total_return_pct = round((total_return / total_invested) * 100, 2) if total_invested else 0.0

    years = max(months / 12, 0.0001)
    if total_invested > 0 and gross_value > 0:
        cagr = (math.pow(gross_value / total_invested, 1 / years) - 1) * 100
    else:
        cagr = 0.0

    if returns:
        mean_return = sum(returns) / len(returns)
        variance = sum((r - mean_return) ** 2 for r in returns) / len(returns)
        volatility_pct = math.sqrt(variance) * math.sqrt(12) * 100
    else:
        volatility_pct = 0.0

    timeframe_label = timeframe_key if timeframe_key in {'1y', '3y', '5y', 'custom'} else f"{months}m"

    benchmark_series = []
    benchmark_label = None
    benchmark_total_return_pct = None
    benchmark_volatility_pct = None
    benchmark_max_drawdown = None
    benchmark_cagr_pct = None
    if benchmark_symbol:
        benchmark_series, benchmark_label = generate_benchmark_series(
            benchmark_symbol,
            months,
            start_date,
            investment_mode=investment_mode,
            initial_investment=initial_investment,
            monthly_contribution=monthly_contribution,
            contribution_frequency=frequency,
            annual_month=annual_month_int
        )
        if benchmark_series:
            bench_values = [point["value"] for point in benchmark_series if point.get("value") is not None]
            if len(bench_values) >= 2:
                returns = []
                for i in range(1, len(bench_values)):
                    prev_val = bench_values[i - 1]
                    current_val = bench_values[i]
                    if prev_val and prev_val > 0 and current_val and current_val > 0:
                        returns.append((current_val / prev_val) - 1)
                if returns:
                    benchmark_volatility_pct = statistics.stdev(returns) * (12 ** 0.5) * 100
                peak = bench_values[0]
                drawdowns = []
                for value in bench_values:
                    if value > peak:
                        peak = value
                    if peak > 0:
                        drawdowns.append((value - peak) / peak * 100)
                benchmark_max_drawdown = min(drawdowns) if drawdowns else None
                benchmark_total_return_pct = ((bench_values[-1] - bench_values[0]) / bench_values[0] * 100) if bench_values[0] > 0 else None
                years_bench = max(months / 12, 0.0001)
                if bench_values[0] > 0 and bench_values[-1] > 0:
                    benchmark_cagr_pct = ((bench_values[-1] / bench_values[0]) ** (1 / years_bench) - 1) * 100

    inflation_series = generate_mock_inflation_series(start_date.isoformat(), (current_date - relativedelta(months=1)).isoformat())
    real_series = []
    real_dividends_distributed = 0.0
    if inflation_adjust and inflation_series:
        cumulative_inflation = 1.0
        real_values = []
        for idx, point in enumerate(series):
            monthly_inflation = inflation_series[idx]["inflation"] / 100 if idx < len(inflation_series) else 0.004
            monthly_factor = (1 + monthly_inflation) ** (1 / 12)
            cumulative_inflation *= monthly_factor
            real_value = point["value"] / cumulative_inflation
            real_series.append({"date": point["date"], "value": round(real_value, 2)})
            real_values.append(real_value)

        ending_real = real_values[-1] if real_values else ending_value
        if distribution_policy == 'cash_out':
            real_dividends_distributed = dividends_distributed / cumulative_inflation if cumulative_inflation else dividends_distributed
        gross_real_value = ending_real + real_dividends_distributed
        total_return_real = round(gross_real_value - total_invested, 2)
        if total_invested > 0 and gross_real_value > 0:
            cagr_real = (math.pow(gross_real_value / total_invested, 1 / years) - 1) * 100
        else:
            cagr_real = 0.0
    else:
        real_series = []
        total_return_real = None
        cagr_real = None

    return {
        "series": series,
        "cagr": round(cagr, 2),
        "annual_return": round(cagr, 2),
        "volatility": round(volatility_pct, 2),
        "max_drawdown": round(max_drawdown, 2),
        "total_invested": total_invested,
        "ending_value": ending_value,
        "total_return": total_return,
        "total_return_pct": total_return_pct,
        "months": months,
        "timeframe": timeframe_label,
        "start_date": start_date.isoformat(),
        "end_date": (current_date - relativedelta(months=1)).isoformat(),
        "investment_mode": investment_mode,
        "benchmark_symbol": benchmark_symbol,
        "benchmark_label": benchmark_label,
        "benchmark_series": benchmark_series,
        "inflation_adjusted": inflation_adjust,
        "inflation_series": inflation_series if inflation_adjust else [],
        "series_real": real_series,
        "total_return_real": round(total_return_real, 2) if total_return_real is not None else None,
        "annual_return_real": round(cagr_real, 2) if cagr_real is not None else None,
        "distribution_policy": distribution_policy,
        "contribution_frequency": frequency,
        "annual_month": annual_month_int,
        "average_dividend_yield": round(average_dividend_yield, 2) if average_dividend_yield is not None else None,
        "total_dividends": round(total_dividends, 2),
        "dividends_distributed": round(dividends_distributed, 2),
        "real_dividends_distributed": round(real_dividends_distributed, 2) if inflation_adjust else None,
        "benchmark_total_return_pct": round(benchmark_total_return_pct, 2) if benchmark_total_return_pct is not None else None,
        "benchmark_volatility": round(benchmark_volatility_pct, 2) if benchmark_volatility_pct is not None else None,
        "benchmark_max_drawdown": round(benchmark_max_drawdown, 2) if benchmark_max_drawdown is not None else None,
        "benchmark_cagr": round(benchmark_cagr_pct, 2) if benchmark_cagr_pct is not None else None
    }


def generate_benchmark_series(symbol, months, start_date, investment_mode='lump_sum', initial_investment=100000, monthly_contribution=0, contribution_frequency='monthly', annual_month=None):
    config = BENCHMARK_CONFIG.get(symbol, {})
    drift = config.get("drift", 0.005)
    vol = config.get("vol", 0.02)
    label = config.get("label", symbol)

    seed_input = f"benchmark-{symbol}-{months}-{start_date.isoformat()}"
    seed = int.from_bytes(hashlib.sha256(seed_input.encode("utf-8")).digest()[:8], 'big')
    rng = random.Random(seed)

    frequency = (contribution_frequency or 'monthly').lower()
    if frequency not in {'monthly', 'quarterly', 'annual'}:
        frequency = 'monthly'
    try:
        annual_month_int = int(annual_month) if annual_month is not None else None
        if annual_month_int is not None and not (1 <= annual_month_int <= 12):
            annual_month_int = None
    except (TypeError, ValueError):
        annual_month_int = None
    target_annual_month = annual_month_int or start_date.month

    series = []
    current_value = 0.0
    current_date = start_date

    for month in range(months):
        if investment_mode == 'lump_sum' and month == 0 and initial_investment > 0:
            current_value += initial_investment
        elif investment_mode == 'monthly' and monthly_contribution > 0:
            contribute_now = False
            if frequency == 'monthly':
                contribute_now = True
            elif frequency == 'quarterly':
                if month % 3 == 0:
                    contribute_now = True
            elif frequency == 'annual':
                if current_date.month == target_annual_month:
                    contribute_now = True
            if contribute_now:
                current_value += monthly_contribution

        change = rng.gauss(drift, vol)
        current_value *= max(0.5, 1 + change)

        series.append({
            "date": current_date.isoformat(),
            "value": round(current_value, 2)
        })

        current_date += relativedelta(months=1)

    return series, label


def generate_mock_income_series(start_date, end_date):
    """Generate mock income data"""
    import random
    series = []
    current_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
    monthly_income = 500
    
    while current_date <= end_date_obj:
        # Income grows slightly over time
        monthly_income *= (1 + random.uniform(0, 0.01))
        
        series.append({
            "date": current_date.isoformat(),
            "income": round(monthly_income, 2)
        })
        
        # Move to next month
        if current_date.month == 12:
            current_date = current_date.replace(year=current_date.year + 1, month=1)
        else:
            current_date = current_date.replace(month=current_date.month + 1)
    
    return series

def generate_mock_inflation_series(start_date, end_date):
    """Generate deterministic mock inflation data based on date range."""
    seed_input = f"{start_date}:{end_date}"
    rng = random.Random(seed_input)
    series = []
    current_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
    inflation_rate = 0.05  # 5% annual baseline

    while current_date <= end_date_obj:
        inflation_rate *= (1 + rng.uniform(-0.1, 0.1))
        series.append({
            "date": current_date.isoformat(),
            "inflation": round(inflation_rate * 100, 2)
        })
        if current_date.month == 12:
            current_date = current_date.replace(year=current_date.year + 1, month=1)
        else:
            current_date = current_date.replace(month=current_date.month + 1)

    return series

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, host="0.0.0.0", port=port)

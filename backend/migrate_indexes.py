#!/usr/bin/env python3
"""
Migration script to add performance indexes to existing tables.
This ensures the app scales to 1000+ users by optimizing:
- Price lookups (instrument_id + date)
- Portfolio fetching (user_id)
- Trade history (user_id, symbol, timestamp)
"""

from app import app, db
from sqlalchemy import text

def migrate_indexes():
    with app.app_context():
        try:
            inspector = db.inspect(db.engine)
            
            # Helper to check if index exists
            def index_exists(table_name, index_name):
                indexes = inspector.get_indexes(table_name)
                for idx in indexes:
                    if idx['name'] == index_name:
                        return True
                return False

            print("Checking database indexes...")

            # 1. Price Indexes
            # idx_price_instrument_date
            if not index_exists('prices', 'idx_price_instrument_date'):
                print("Adding index: idx_price_instrument_date to prices table...")
                # Use CONCURRENTLY if possible, but standard CREATE is safer for this context without detailed transaction control
                db.session.execute(text('CREATE INDEX idx_price_instrument_date ON prices (instrument_id, date)'))
                print("✓ Created idx_price_instrument_date")
            else:
                print("• Index idx_price_instrument_date already exists")

            # 2. UserPosition Indexes
            if not index_exists('user_positions', 'ix_user_positions_user_id'):
                print("Adding index: ix_user_positions_user_id...")
                db.session.execute(text('CREATE INDEX ix_user_positions_user_id ON user_positions (user_id)'))
                print("✓ Created ix_user_positions_user_id")
            
            if not index_exists('user_positions', 'ix_user_positions_symbol'):
                print("Adding index: ix_user_positions_symbol...")
                db.session.execute(text('CREATE INDEX ix_user_positions_symbol ON user_positions (symbol)'))
                print("✓ Created ix_user_positions_symbol")

            # 3. UserPortfolio Indexes
            if not index_exists('user_portfolios', 'ix_user_portfolios_user_id'):
                print("Adding index: ix_user_portfolios_user_id...")
                db.session.execute(text('CREATE INDEX ix_user_portfolios_user_id ON user_portfolios (user_id)'))
                print("✓ Created ix_user_portfolios_user_id")

            # 4. UserTrade Indexes
            if not index_exists('user_trades', 'ix_user_trades_user_id'):
                print("Adding index: ix_user_trades_user_id...")
                db.session.execute(text('CREATE INDEX ix_user_trades_user_id ON user_trades (user_id)'))
                print("✓ Created ix_user_trades_user_id")
            
            if not index_exists('user_trades', 'ix_user_trades_timestamp'):
                print("Adding index: ix_user_trades_timestamp...")
                db.session.execute(text('CREATE INDEX ix_user_trades_timestamp ON user_trades (timestamp)'))
                print("✓ Created ix_user_trades_timestamp")

            db.session.commit()
            print("\n✓ Index migration complete!")
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ Index migration failed: {e}")
            # If table doesn't exist, that's a different issue but we should know
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    migrate_indexes()

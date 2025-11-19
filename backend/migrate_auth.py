#!/usr/bin/env python3
"""
Migration script to add authentication fields to User model
This adds email, password_hash, and is_admin columns to existing users table
"""

from app import app, db
from sqlalchemy import text

def migrate():
    with app.app_context():
        try:
            # Check if columns already exist
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('users')]
            
            if 'email' not in columns:
                print("Adding email column...")
                db.session.execute(text('ALTER TABLE users ADD COLUMN email VARCHAR(255)'))
                db.session.commit()
                print("✓ Added email column")
            else:
                print("Email column already exists")
            
            if 'password_hash' not in columns:
                print("Adding password_hash column...")
                db.session.execute(text('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)'))
                db.session.commit()
                print("✓ Added password_hash column")
            else:
                print("Password_hash column already exists")
            
            if 'is_admin' not in columns:
                print("Adding is_admin column...")
                db.session.execute(text('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0'))
                db.session.commit()
                print("✓ Added is_admin column")
            else:
                print("Is_admin column already exists")
            
            # Make existing nullable fields nullable (they might have been set to NOT NULL)
            try:
                db.session.execute(text('ALTER TABLE users ALTER COLUMN age_band DROP NOT NULL'))
                db.session.execute(text('ALTER TABLE users ALTER COLUMN experience DROP NOT NULL'))
                db.session.execute(text('ALTER TABLE users ALTER COLUMN goal DROP NOT NULL'))
                db.session.execute(text('ALTER TABLE users ALTER COLUMN risk DROP NOT NULL'))
                db.session.execute(text('ALTER TABLE users ALTER COLUMN horizon DROP NOT NULL'))
                db.session.execute(text('ALTER TABLE users ALTER COLUMN anchor_stock DROP NOT NULL'))
                db.session.execute(text('ALTER TABLE users ALTER COLUMN literacy_level DROP NOT NULL'))
                db.session.commit()
                print("✓ Made existing fields nullable")
            except Exception as e:
                print(f"Note: Could not modify existing columns (this is OK if using SQLite): {e}")
            
            print("\n✓ Migration complete!")
            
        except Exception as e:
            db.session.rollback()
            print(f"✗ Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate()


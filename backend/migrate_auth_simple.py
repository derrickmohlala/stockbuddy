#!/usr/bin/env python3
"""
Simple migration script to add authentication fields to User model
This adds email, password_hash, and is_admin columns to existing users table
"""

import sqlite3
import os

# Database path - adjust if needed
db_path = os.path.join(os.path.dirname(__file__), '..', 'instance', 'stockbuddy.db')
if not os.path.exists(db_path):
    # Try alternative location
    db_path = os.path.join(os.path.dirname(__file__), 'stockbuddy.db')
    if not os.path.exists(db_path):
        db_path = os.path.join(os.path.dirname(__file__), '..', 'stockbuddy.db')

if not os.path.exists(db_path):
    print(f"Error: Database not found. Tried:")
    print(f"  - {os.path.join(os.path.dirname(__file__), '..', 'instance', 'stockbuddy.db')}")
    print(f"  - {os.path.join(os.path.dirname(__file__), 'stockbuddy.db')}")
    print(f"  - {os.path.join(os.path.dirname(__file__), '..', 'stockbuddy.db')}")
    exit(1)

print(f"Connecting to database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check existing columns
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]
    
    print(f"Existing columns: {', '.join(columns)}")
    
    # Add email column if it doesn't exist
    if 'email' not in columns:
        print("Adding email column...")
        cursor.execute("ALTER TABLE users ADD COLUMN email VARCHAR(255)")
        conn.commit()
        print("✓ Added email column")
    else:
        print("✓ Email column already exists")
    
    # Add password_hash column if it doesn't exist
    if 'password_hash' not in columns:
        print("Adding password_hash column...")
        cursor.execute("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)")
        conn.commit()
        print("✓ Added password_hash column")
    else:
        print("✓ Password_hash column already exists")
    
    # Add is_admin column if it doesn't exist
    if 'is_admin' not in columns:
        print("Adding is_admin column...")
        cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0")
        conn.commit()
        print("✓ Added is_admin column")
    else:
        print("✓ Is_admin column already exists")
    
    # Verify the columns were added
    cursor.execute("PRAGMA table_info(users)")
    new_columns = [row[1] for row in cursor.fetchall()]
    print(f"\nUpdated columns: {', '.join(new_columns)}")
    
    print("\n✓ Migration complete!")
    
except Exception as e:
    conn.rollback()
    print(f"✗ Migration failed: {e}")
    raise
finally:
    conn.close()


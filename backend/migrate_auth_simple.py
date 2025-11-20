#!/usr/bin/env python3
"""
Simple migration script to add authentication fields to User model
This adds email, password_hash, and is_admin columns to existing users table
"""

import sqlite3
import os

# Find all possible database locations
possible_paths = [
    os.path.join(os.path.dirname(__file__), 'stockbuddy.db'),  # backend/stockbuddy.db
    os.path.join(os.path.dirname(__file__), '..', 'instance', 'stockbuddy.db'),  # instance/stockbuddy.db
    os.path.join(os.path.dirname(__file__), '..', 'stockbuddy.db'),  # root/stockbuddy.db
    os.path.join(os.path.dirname(__file__), 'instance', 'stockbuddy.db'),  # backend/instance/stockbuddy.db
]

db_paths = [path for path in possible_paths if os.path.exists(path)]

if not db_paths:
    print(f"Error: Database not found. Searched:")
    for path in possible_paths:
        print(f"  - {path}")
    exit(1)

print(f"Found {len(db_paths)} database file(s). Migrating all...\n")

# Migrate each database file
for db_path in db_paths:
    print(f"\n{'='*60}")
    print(f"Migrating: {db_path}")
    print(f"{'='*60}")
    
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
        print(f"Updated columns: {', '.join(new_columns)}")
        
        print(f"✓ Migration complete for {db_path}")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Migration failed for {db_path}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

print(f"\n{'='*60}")
print("✓ All databases migrated successfully!")
print(f"{'='*60}")

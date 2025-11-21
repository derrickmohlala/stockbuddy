#!/usr/bin/env python3
"""
Migration script to add profile fields (cellphone, province) to User model
"""

import sqlite3
import os

# Find all possible database locations
possible_paths = [
    os.path.join(os.path.dirname(__file__), 'stockbuddy.db'),
    os.path.join(os.path.dirname(__file__), '..', 'instance', 'stockbuddy.db'),
    os.path.join(os.path.dirname(__file__), '..', 'stockbuddy.db'),
    os.path.join(os.path.dirname(__file__), 'instance', 'stockbuddy.db'),
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
        
        # Add cellphone column if it doesn't exist
        if 'cellphone' not in columns:
            print("Adding cellphone column...")
            cursor.execute("ALTER TABLE users ADD COLUMN cellphone VARCHAR(20)")
            conn.commit()
            print("✓ Added cellphone column")
        else:
            print("✓ Cellphone column already exists")
        
        # Add province column if it doesn't exist
        if 'province' not in columns:
            print("Adding province column...")
            cursor.execute("ALTER TABLE users ADD COLUMN province VARCHAR(50)")
            conn.commit()
            print("✓ Added province column")
        else:
            print("✓ Province column already exists")
        
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


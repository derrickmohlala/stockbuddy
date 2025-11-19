#!/usr/bin/env python3
"""
Script to create an admin user
Usage: python create_admin.py <email> <password> <first_name>
"""

import sys
from app import app
from models import db, User
from werkzeug.security import generate_password_hash

def create_admin(email, password, first_name):
    with app.app_context():
        # Check if user already exists
        existing = User.query.filter_by(email=email).first()
        if existing:
            print(f"User with email {email} already exists. Updating to admin...")
            existing.is_admin = True
            existing.password_hash = generate_password_hash(password)
            db.session.commit()
            print(f"✓ Updated user {email} to admin")
            return
        
        # Create new admin user
        admin = User(
            email=email,
            password_hash=generate_password_hash(password),
            first_name=first_name,
            is_admin=True
        )
        db.session.add(admin)
        db.session.commit()
        print(f"✓ Created admin user: {email} ({first_name})")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python create_admin.py <email> <password> <first_name>")
        sys.exit(1)
    
    email = sys.argv[1].strip().lower()
    password = sys.argv[2]
    first_name = sys.argv[3].strip()
    
    create_admin(email, password, first_name)


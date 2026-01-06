import os
import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app, db, User, UserPortfolio
import json

def check_allocations():
    with app.app_context():
        users = User.query.all()
        print(f"Checking saved allocations for {len(users)} users:\n")
        
        for user in users:
            portfolio = UserPortfolio.query.filter_by(user_id=user.id).first()
            if portfolio:
                print(f"User {user.id} ({user.first_name}):")
                print(f"  Archetype: {portfolio.archetype}")
                print(f"  Anchor Stock: {portfolio.anchor_stock}")
                
                if portfolio.allocations:
                    try:
                        allocs = json.loads(portfolio.allocations)
                        print(f"  Saved Allocations: {allocs}")
                    except:
                        print(f"  Saved Allocations: CORRUPTED")
                else:
                    print(f"  Saved Allocations: NONE")
                print()

if __name__ == "__main__":
    check_allocations()

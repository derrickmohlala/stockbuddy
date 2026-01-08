from app import app, db
from models import User, UserPosition, UserTrade, UserPortfolio, SuggestionAction, PortfolioBaseline

def clear_all_users():
    """
    Safely deletes all users and their associated data from the database.
    Deletes in correct order to respect Foreign Key constraints.
    """
    with app.app_context():
        print("Preparing to clear all user data...")
        
        try:
            # 1. Delete deeply nested / dependent data first
            trades = db.session.query(UserTrade).delete()
            print(f"- Deleted {trades} trades")
            
            positions = db.session.query(UserPosition).delete()
            print(f"- Deleted {positions} positions")
            
            suggestions = db.session.query(SuggestionAction).delete()
            print(f"- Deleted {suggestions} suggestion actions")
            
            portfolios = db.session.query(UserPortfolio).delete()
            print(f"- Deleted {portfolios} portfolios")
            
            baselines = db.session.query(PortfolioBaseline).delete()
            print(f"- Deleted {baselines} baselines")
            
            # 2. Finally delete the users
            users = db.session.query(User).delete()
            print(f"- Deleted {users} users")
            
            db.session.commit()
            print("\nSUCCESS: Database successfully cleared of all users.")
            
        except Exception as e:
            db.session.rollback()
            print(f"\nERROR: Failed to clear database. Rolled back changes.")
            print(f"Error details: {str(e)}")

if __name__ == "__main__":
    print("⚠️  WARNING: This will PERMANENTLY DELETE ALL USERS and their data.")
    print("This includes portfolios, trades, and history.")
    print("Static data like Stock Prices and Instruments will remain untouched.\n")
    
    confirm = input("Type 'DELETE' to confirm: ")
    if confirm == "DELETE":
        clear_all_users()
    else:
        print("Aborted.")

#!/usr/bin/env python3
"""
Seed script for curated model baskets
"""

from app import app, ARCHETYPE_CONFIG, generate_starter_allocations
from models import db, Basket
from types import SimpleNamespace
import json

def seed_baskets():
    with app.app_context():
        # Clear existing baskets
        Basket.query.delete()
        
        baskets = []
        prototype_user = SimpleNamespace(anchor_stock='SBK.JO')

        for name, config in ARCHETYPE_CONFIG.items():
            allocations = generate_starter_allocations(prototype_user, name)
            baskets.append({
                "code": name.upper().replace(' ', '_'),
                "name": name,
                "goal": config.get("goal", ""),
                "description": config.get("description", ""),
                "allocations": allocations
            })
        
        for basket_data in baskets:
            basket = Basket(
                code=basket_data["code"],
                name=basket_data["name"],
                goal=basket_data["goal"],
                description=basket_data["description"],
                allocations=json.dumps(basket_data["allocations"])
            )
            db.session.add(basket)
        
        db.session.commit()
        print(f"Seeded {len(baskets)} model baskets")

if __name__ == "__main__":
    seed_baskets()

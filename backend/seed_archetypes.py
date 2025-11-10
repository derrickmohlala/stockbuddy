from models import db, Archetype
from app import app, ARCHETYPE_CONFIG

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        archetypes = [
            {"name": name, "description": config.get("description", "")}
            for name, config in ARCHETYPE_CONFIG.items()
        ]
        for archetype_data in archetypes:
            existing = Archetype.query.filter_by(name=archetype_data["name"]).first()
            if not existing:
                archetype = Archetype(name=archetype_data["name"], description=archetype_data["description"])
                db.session.add(archetype)
        db.session.commit()

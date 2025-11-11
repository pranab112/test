#!/usr/bin/env python3
"""
Script to populate games table in PostgreSQL database
Run this script once to initialize the games table
"""
from app.database import SessionLocal
from app.models import Game
from sqlalchemy import text

# List of casino games
# Format: (name, display_name, icon_url, category)
games_data = [
    ('bluedragon', 'Blue Dragon', '/static/images/games/bluedragon.png', 'slots'),
    ('cashfrenzy', 'Cash Frenzy', '/static/images/games/cashfrenzy 1.png', 'slots'),
    ('cashmachine', 'Cash Machine', '/static/images/games/cashmachine.png', 'slots'),
    ('casinoignite', 'Casino Ignite', '/static/images/games/casinoignitee.jpg', 'casino'),
    ('casinoroyale', 'Casino Royale', '/static/images/games/casinoroyale.png', 'casino'),
    ('egames', 'E-Games', '/static/images/games/Egames.png', 'multi-game'),
    ('firekirin', 'Fire Kirin', '/static/images/games/firekirin.png', 'fish'),
    ('gameroom', 'Gameroom Online', '/static/images/games/Gameroom online.png', 'multi-game'),
    ('gamevault', 'Game Vault', '/static/images/games/gamevault.png', 'multi-game'),
    ('highstake', 'High Stake', '/static/images/games/Highstake.jpg', 'casino'),
    ('joker777', 'Joker 777', '/static/images/games/joker 777.png', 'slots'),
    ('juwa', 'Juwa Online', '/static/images/games/juwaonline.png', 'multi-game'),
    ('loot', 'Loot', '/static/images/games/loot.jpg', 'slots'),
    ('megaspin', 'Mega Spin', '/static/images/games/Megaspin.jpg', 'slots'),
    ('milkyway', 'Milky Way', '/static/images/games/milkyway 2.png', 'multi-game'),
    ('moolah', 'Moolah', '/static/images/games/moolah.jpg', 'slots'),
    ('orionstars', 'Orion Stars', '/static/images/games/orionstars.jpg', 'multi-game'),
    ('pandamaster', 'Panda Master', '/static/images/games/Panda Master.jpg', 'multi-game'),
    ('paracasino', 'Para Casino', '/static/images/games/Paracasino.jpg', 'casino'),
    ('rivermonster', 'River Monster', '/static/images/games/rivermonster 1.png', 'fish'),
    ('riversweeps1', 'River Sweeps', '/static/images/games/riversweeps 1.png', 'sweepstakes'),
    ('riversweeps2', 'River Sweeps 2', '/static/images/games/riversweeps 2.png', 'sweepstakes'),
    ('riversweeps3', 'River Sweeps 3', '/static/images/games/riversweeps 3.png', 'sweepstakes'),
    ('sirius', 'Sirius', '/static/images/games/sirus.png', 'multi-game'),
    ('ultrapanda', 'Ultra Panda', '/static/images/games/ultrapanda.png', 'multi-game'),
    ('vblink', 'VBlink', '/static/images/games/vblink 2.png', 'multi-game'),
    ('vegasweeps', 'Vega Sweeps', '/static/images/games/Vega Sweeps.png', 'sweepstakes'),
    ('vegasx', 'Vegas X', '/static/images/games/vegas x.png', 'casino'),
    ('vegasroll', 'Vegas Roll', '/static/images/games/vegasroll.png', 'casino'),
    ('winstar', 'Win Star', '/static/images/games/winstar.png', 'casino'),
    ('yolo777', 'Yolo 777', '/static/images/games/yolo777.png', 'slots')
]

def populate_games():
    db = SessionLocal()
    try:
        # Check if games already exist
        existing_count = db.query(Game).count()
        if existing_count > 0:
            print(f"⚠️  Database already has {existing_count} games")
            response = input("Do you want to clear and re-populate? (yes/no): ")
            if response.lower() != 'yes':
                print("Aborted.")
                return

            # Clear existing games
            print("Clearing existing games...")
            db.execute(text("DELETE FROM client_games"))
            db.execute(text("DELETE FROM games"))
            db.commit()
            print("✓ Cleared existing games")

        # Insert games
        print(f"\nInserting {len(games_data)} games into database...")
        inserted = 0
        for name, display_name, icon_url, category in games_data:
            try:
                game = Game(
                    name=name,
                    display_name=display_name,
                    icon_url=icon_url,
                    category=category,
                    is_active=True
                )
                db.add(game)
                inserted += 1
                print(f"✓ Added: {display_name} ({category})")
            except Exception as e:
                print(f"✗ Error inserting {name}: {e}")

        db.commit()

        # Verify insertion
        final_count = db.query(Game).count()
        print(f"\n✅ Successfully populated {final_count} games in the database")

        # Display all games by category
        games = db.query(Game).order_by(Game.category, Game.display_name).all()
        print("\nGames by category:")
        current_category = None
        for game in games:
            if game.category != current_category:
                current_category = game.category
                print(f"\n{game.category.upper() if game.category else 'UNCATEGORIZED'}:")
            print(f"  {game.id}. {game.display_name} ({game.name})")

        print("\n✅ Done! Games are ready for clients to select.")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Casino Games Database Population Script")
    print("=" * 60)
    populate_games()

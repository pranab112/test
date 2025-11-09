#!/usr/bin/env python3
import sqlite3
import os

# Connect to database
conn = sqlite3.connect('casino_royal.db')
cursor = conn.cursor()

# Clear existing games first
cursor.execute("DELETE FROM client_games")
cursor.execute("DELETE FROM games")

# List of casino games based on exact file names from the directory
# Format: (name, display_name, icon_url, category)
games = [
    ('bluedragon', 'Blue Dragon', '/uploads/games/bluedragon.png', 'sweepstakes'),
    ('checkmysweep', 'Check My Sweep', '/uploads/games/brave_screenshot_checkmysweep.com (4).png', 'sweepstakes'),
    ('cashfrenzy', 'Cash Frenzy', '/uploads/games/cashfrenzy 1.png', 'slots'),
    ('cashmachine', 'Cash Machine', '/uploads/games/cashmachine.png', 'slots'),
    ('casinoignite', 'Casino Ignite', '/uploads/games/casinoignitee.jpg', 'casino'),
    ('casinoroyale', 'Casino Royale', '/uploads/games/casinoroyale.png', 'casino'),
    ('egames', 'E-Games', '/uploads/games/Egames.png', 'multi-game'),
    ('firekirin', 'Fire Kirin', '/uploads/games/firekirin.png', 'fish'),
    ('gameroom', 'Gameroom Online', '/uploads/games/Gameroom online.png', 'multi-game'),
    ('gamevault', 'Game Vault', '/uploads/games/gamevault.png', 'sweepstakes'),
    ('highstake', 'High Stake', '/uploads/games/Highstake.jpg', 'casino'),
    ('joker777', 'Joker 777', '/uploads/games/joker 777.png', 'slots'),
    ('juwa', 'Juwa Online', '/uploads/games/juwaonline.png', 'sweepstakes'),
    ('loot', 'Loot', '/uploads/games/loot.jpg', 'slots'),
    ('megaspin', 'Mega Spin', '/uploads/games/Megaspin.jpg', 'slots'),
    ('milkyway', 'Milky Way', '/uploads/games/milkyway 2.png', 'sweepstakes'),
    ('moolah', 'Moolah', '/uploads/games/moolah.jpg', 'slots'),
    ('orionstars', 'Orion Stars', '/uploads/games/orionstars.jpg', 'sweepstakes'),
    ('pandamaster', 'Panda Master', '/uploads/games/Panda Master.jpg', 'fish'),
    ('paracasino', 'Para Casino', '/uploads/games/Paracasino.jpg', 'casino'),
    ('rivermonster1', 'River Monster 1', '/uploads/games/rivermonster 1.png', 'fish'),
    ('rivermonster', 'River Monster', '/uploads/games/Rivermonster.png', 'fish'),
    ('riversweeps1', 'River Sweeps 1', '/uploads/games/riversweeps 1.png', 'sweepstakes'),
    ('riversweeps2', 'River Sweeps 2', '/uploads/games/riversweeps 2.png', 'sweepstakes'),
    ('riversweeps3', 'River Sweeps 3', '/uploads/games/riversweeps 3.png', 'sweepstakes'),
    ('riversweeps', 'River Sweeps', '/uploads/games/riversweeps.png', 'sweepstakes'),
    ('sirius', 'Sirius', '/uploads/games/sirus.png', 'sweepstakes'),
    ('ultrapanda', 'Ultra Panda', '/uploads/games/ultrapanda.png', 'fish'),
    ('vblink', 'V-Blink', '/uploads/games/vblink 2.png', 'sweepstakes'),
    ('vegasweeps', 'Vega Sweeps', '/uploads/games/Vega Sweeps.png', 'sweepstakes'),
    ('vegasx', 'Vegas X', '/uploads/games/vegas x.png', 'casino'),
    ('vegasroll', 'Vegas Roll', '/uploads/games/vegasroll.png', 'slots'),
    ('winstar', 'Win Star', '/uploads/games/winstar.png', 'slots'),
    ('yolo777', 'Yolo 777', '/uploads/games/yolo777.png', 'slots')
]

# Insert games
print(f"Inserting {len(games)} games into database...")
for name, display_name, icon_url, category in games:
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO games (name, display_name, icon_url, category, is_active)
            VALUES (?, ?, ?, ?, 1)
        """, (name, display_name, icon_url, category))
        print(f"✓ Added: {display_name} ({category})")
    except Exception as e:
        print(f"✗ Error inserting {name}: {e}")

# Commit changes
conn.commit()

# Verify insertion
cursor.execute("SELECT COUNT(*) FROM games")
count = cursor.fetchone()[0]
print(f"\nSuccessfully populated {count} games in the database")

# Display all games by category
cursor.execute("SELECT name, display_name, category FROM games ORDER BY category, display_name")
games = cursor.fetchall()
print("\nGames by category:")
current_category = None
for name, display_name, category in games:
    if category != current_category:
        current_category = category
        print(f"\n{category.upper()}:")
    print(f"  - {display_name} ({name})")

conn.close()
print("\nDone! Games are ready for clients to select.")
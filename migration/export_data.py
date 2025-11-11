#!/usr/bin/env python3
"""
Export all data from SQLite database to JSON format for PostgreSQL migration
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path

def datetime_handler(obj):
    """Handle datetime serialization"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def export_sqlite_to_json():
    """Export all tables from SQLite to JSON files"""

    # Create migration directory
    Path("migration/data").mkdir(parents=True, exist_ok=True)

    # Connect to SQLite database
    conn = sqlite3.connect('casino_royal.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [table[0] for table in cursor.fetchall()]

    export_stats = {}

    for table in tables:
        try:
            # Get column names
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [col[1] for col in cursor.fetchall()]

            # Export table data
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()

            # Convert to list of dictionaries
            data = []
            for row in rows:
                row_dict = dict(zip(columns, row))
                # Convert any bytes to string
                for key, value in row_dict.items():
                    if isinstance(value, bytes):
                        row_dict[key] = value.decode('utf-8', errors='ignore')
                data.append(row_dict)

            # Save to JSON file
            output_file = f"migration/data/{table}.json"
            with open(output_file, 'w') as f:
                json.dump(data, f, indent=2, default=datetime_handler)

            export_stats[table] = len(data)
            print(f"✓ Exported {table}: {len(data)} records")

        except Exception as e:
            print(f"✗ Error exporting {table}: {str(e)}")
            export_stats[table] = 0

    # Save export statistics
    with open("migration/data/export_stats.json", 'w') as f:
        json.dump(export_stats, f, indent=2)

    conn.close()

    print("\n=== Export Summary ===")
    for table, count in export_stats.items():
        print(f"{table}: {count} records")

    return export_stats

if __name__ == "__main__":
    export_sqlite_to_json()
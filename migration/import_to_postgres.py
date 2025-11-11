#!/usr/bin/env python3
"""
Import data from JSON files to PostgreSQL database
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.append(str(Path(__file__).parents[1]))

from app.models import (
    Base, User, UserType, FriendRequest, FriendRequestStatus,
    Message, MessageType, Review, Promotion, PromotionType,
    PromotionStatus, PromotionClaim, ClaimStatus,
    PlayerWallet, PaymentMethod, ClientPaymentMethod,
    Game, ClientGame, GameCredentials, Report, ReportStatus
)

def setup_postgres_database(database_url):
    """Create PostgreSQL database and tables"""

    # Fix Render's postgres:// URLs
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    # Create engine
    engine = create_engine(database_url, echo=False)

    # Create all tables
    Base.metadata.create_all(bind=engine)

    return engine

def import_data_to_postgres(database_url):
    """Import all data from JSON files to PostgreSQL"""

    engine = setup_postgres_database(database_url)
    Session = sessionmaker(bind=engine)
    session = Session()

    import_stats = {}

    try:
        # 1. Import users first (no dependencies)
        users_file = "migration/data/users.json"
        if os.path.exists(users_file):
            with open(users_file, 'r') as f:
                users_data = json.load(f)

            for user_data in users_data:
                # Convert user_type string to enum (handle case conversion)
                if 'user_type' in user_data:
                    user_data['user_type'] = UserType(user_data['user_type'].lower())

                # Convert datetime strings
                for date_field in ['created_at', 'last_seen', 'last_activity', 'email_verification_sent_at']:
                    if user_data.get(date_field):
                        user_data[date_field] = datetime.fromisoformat(user_data[date_field])

                # Create user object
                user = User(**user_data)
                session.merge(user)  # Use merge to handle existing records

            session.commit()
            import_stats['users'] = len(users_data)
            print(f"✓ Imported users: {len(users_data)} records")

        # 2. Import friend requests
        fr_file = "migration/data/friend_requests.json"
        if os.path.exists(fr_file):
            with open(fr_file, 'r') as f:
                fr_data = json.load(f)

            for req_data in fr_data:
                # Convert status string to enum (handle case conversion)
                if 'status' in req_data:
                    req_data['status'] = FriendRequestStatus(req_data['status'].lower())

                # Convert datetime strings
                for date_field in ['created_at', 'updated_at']:
                    if req_data.get(date_field):
                        req_data[date_field] = datetime.fromisoformat(req_data[date_field])

                req = FriendRequest(**req_data)
                session.merge(req)

            session.commit()
            import_stats['friend_requests'] = len(fr_data)
            print(f"✓ Imported friend_requests: {len(fr_data)} records")

        # 3. Import friends (many-to-many relationship)
        friends_file = "migration/data/friends.json"
        if os.path.exists(friends_file):
            with open(friends_file, 'r') as f:
                friends_data = json.load(f)

            # Clear existing friends relationships
            session.execute(text("DELETE FROM friends"))

            # Insert friend relationships
            for friend_rel in friends_data:
                session.execute(
                    text("INSERT INTO friends (user_id, friend_id) VALUES (:user_id, :friend_id)"),
                    {"user_id": friend_rel['user_id'], "friend_id": friend_rel['friend_id']}
                )

            session.commit()
            import_stats['friends'] = len(friends_data)
            print(f"✓ Imported friends: {len(friends_data)} relationships")

        # 4. Import messages
        messages_file = "migration/data/messages.json"
        if os.path.exists(messages_file):
            with open(messages_file, 'r') as f:
                messages_data = json.load(f)

            for msg_data in messages_data:
                # Convert message_type string to enum (handle case conversion)
                if 'message_type' in msg_data:
                    msg_data['message_type'] = MessageType(msg_data['message_type'].lower())

                # Convert datetime strings
                if msg_data.get('created_at'):
                    msg_data['created_at'] = datetime.fromisoformat(msg_data['created_at'])

                message = Message(**msg_data)
                session.merge(message)

            session.commit()
            import_stats['messages'] = len(messages_data)
            print(f"✓ Imported messages: {len(messages_data)} records")

        # 5. Import other tables (if they have data)
        other_tables = [
            ('reviews', Review),
            ('promotions', Promotion),
            ('promotion_claims', PromotionClaim),
            ('player_wallets', PlayerWallet),
            ('payment_methods', PaymentMethod),
            ('client_payment_methods', ClientPaymentMethod),
            ('games', Game),
            ('client_games', ClientGame),
            ('game_credentials', GameCredentials),
            ('reports', Report)
        ]

        for table_name, model_class in other_tables:
            file_path = f"migration/data/{table_name}.json"
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    data = json.load(f)

                if data:
                    for record in data:
                        # Handle datetime fields
                        for key, value in record.items():
                            if value and 'at' in key and isinstance(value, str):
                                try:
                                    record[key] = datetime.fromisoformat(value)
                                except:
                                    pass

                        # Handle enum fields based on table (with case conversion)
                        if table_name == 'promotions' and 'promotion_type' in record:
                            record['promotion_type'] = PromotionType(record['promotion_type'].lower())
                        if table_name == 'promotions' and 'status' in record:
                            record['status'] = PromotionStatus(record['status'].lower())
                        if table_name == 'promotion_claims' and 'status' in record:
                            record['status'] = ClaimStatus(record['status'].lower())
                        if table_name == 'reports' and 'status' in record:
                            record['status'] = ReportStatus(record['status'].lower())

                        obj = model_class(**record)
                        session.merge(obj)

                    session.commit()
                    import_stats[table_name] = len(data)
                    print(f"✓ Imported {table_name}: {len(data)} records")

        print("\n=== Import Summary ===")
        for table, count in import_stats.items():
            print(f"{table}: {count} records")

        return import_stats

    except Exception as e:
        session.rollback()
        print(f"✗ Error during import: {str(e)}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    # Use PostgreSQL database URL
    database_url = os.getenv('DATABASE_URL', 'postgresql://apple@localhost:5432/casino_royal')

    print(f"Importing to database: {database_url}")
    import_data_to_postgres(database_url)
#!/usr/bin/env python
"""
Script to migrate existing game credentials from plaintext to encrypted format.
This script can be run multiple times safely (idempotent).

Usage: python scripts/migrate_credentials.py

The script will:
1. Find all credentials without encryption
2. Encrypt them in batches
3. Report progress
"""
import sys
import os
# Add the project root to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import GameCredentials
from app.encryption import encrypt_credential, credential_encryption
import logging
from sqlalchemy import and_

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def migrate_credentials(batch_size: int = 100):
    """
    Migrate game credentials to encrypted format in batches.

    Args:
        batch_size: Number of credentials to process in each batch
    """
    db = SessionLocal()

    try:
        # Check if encryption is enabled
        if not credential_encryption.cipher:
            logger.error("Encryption is not enabled. Please set CREDENTIAL_ENCRYPTION_KEY environment variable.")
            return False

        total_count = db.query(GameCredentials).count()
        logger.info(f"Total credentials in database: {total_count}")

        # Find credentials not yet encrypted
        unencrypted_count = db.query(GameCredentials).filter(
            GameCredentials.game_username_encrypted == None
        ).count()

        if unencrypted_count == 0:
            logger.info("All credentials are already encrypted!")
            return True

        logger.info(f"Found {unencrypted_count} credentials to encrypt")

        migrated = 0
        failed = 0

        while True:
            # Get batch of unencrypted credentials
            credentials = db.query(GameCredentials).filter(
                GameCredentials.game_username_encrypted == None
            ).limit(batch_size).all()

            if not credentials:
                break

            logger.info(f"Processing batch of {len(credentials)} credentials...")

            for credential in credentials:
                try:
                    # Encrypt the credentials
                    credential.game_username_encrypted = encrypt_credential(credential.game_username)
                    credential.game_password_encrypted = encrypt_credential(credential.game_password)

                    if not credential.game_username_encrypted or not credential.game_password_encrypted:
                        logger.warning(f"Failed to encrypt credential ID {credential.id} - encryption returned None")
                        failed += 1
                        continue

                    migrated += 1

                    if migrated % 10 == 0:
                        logger.info(f"Progress: {migrated}/{unencrypted_count} encrypted")

                except Exception as e:
                    logger.error(f"Error encrypting credential ID {credential.id}: {e}")
                    failed += 1
                    continue

            # Commit the batch
            try:
                db.commit()
                logger.info(f"Committed batch. Total migrated: {migrated}")
            except Exception as e:
                logger.error(f"Failed to commit batch: {e}")
                db.rollback()
                break

        # Final statistics
        logger.info("=" * 50)
        logger.info(f"Migration complete!")
        logger.info(f"Successfully encrypted: {migrated} credentials")
        logger.info(f"Failed: {failed} credentials")

        # Verify migration
        remaining = db.query(GameCredentials).filter(
            GameCredentials.game_username_encrypted == None
        ).count()

        if remaining > 0:
            logger.warning(f"Still {remaining} unencrypted credentials remaining")
        else:
            logger.info("All credentials are now encrypted!")

        return failed == 0

    except Exception as e:
        logger.error(f"Migration failed with error: {e}")
        return False

    finally:
        db.close()


def verify_encryption():
    """Verify that encrypted credentials can be decrypted"""
    db = SessionLocal()

    try:
        # Get a sample of encrypted credentials
        sample = db.query(GameCredentials).filter(
            GameCredentials.game_username_encrypted != None
        ).limit(5).all()

        if not sample:
            logger.info("No encrypted credentials found to verify")
            return True

        logger.info(f"Verifying {len(sample)} encrypted credentials...")

        for credential in sample:
            try:
                from app.encryption import decrypt_credential

                username = decrypt_credential(credential.game_username_encrypted)
                password = decrypt_credential(credential.game_password_encrypted)

                if not username or not password:
                    logger.error(f"Failed to decrypt credential ID {credential.id}")
                    return False

                # Verify decrypted matches original (if still present)
                if credential.game_username and username != credential.game_username:
                    logger.error(f"Decrypted username doesn't match original for ID {credential.id}")
                    return False

                logger.info(f"✓ Credential ID {credential.id} verified")

            except Exception as e:
                logger.error(f"Failed to verify credential ID {credential.id}: {e}")
                return False

        logger.info("All sampled credentials verified successfully!")
        return True

    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Migrate game credentials to encrypted format")
    parser.add_argument("--batch-size", type=int, default=100,
                       help="Number of credentials to process in each batch")
    parser.add_argument("--verify-only", action="store_true",
                       help="Only verify existing encrypted credentials")

    args = parser.parse_args()

    if args.verify_only:
        logger.info("Running verification only...")
        success = verify_encryption()
        sys.exit(0 if success else 1)

    # Check if encryption key is set
    encryption_key = os.getenv("CREDENTIAL_ENCRYPTION_KEY")
    if not encryption_key:
        logger.error("ERROR: CREDENTIAL_ENCRYPTION_KEY environment variable not set!")
        logger.error("Generate a key using: python -m app.encryption")
        sys.exit(1)

    logger.info("Starting credential migration...")
    logger.info(f"Batch size: {args.batch_size}")

    success = migrate_credentials(batch_size=args.batch_size)

    if success:
        logger.info("\n✅ Migration completed successfully!")
        logger.info("Running verification...")
        if verify_encryption():
            logger.info("✅ Verification passed!")
        else:
            logger.error("❌ Verification failed!")
            sys.exit(1)
    else:
        logger.error("\n❌ Migration failed!")
        sys.exit(1)
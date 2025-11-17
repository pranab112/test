"""
Encryption utilities for sensitive data (game credentials, etc.)
Using Fernet symmetric encryption for simplicity and security
"""
from cryptography.fernet import Fernet
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class CredentialEncryption:
    """Handle encryption and decryption of sensitive credentials"""

    def __init__(self):
        """Initialize the encryption handler with the encryption key"""
        self.cipher = None
        self.initialize_cipher()

    def initialize_cipher(self):
        """Initialize the cipher with the encryption key from environment"""
        try:
            # Get the encryption key from environment
            encryption_key = os.getenv("CREDENTIAL_ENCRYPTION_KEY")

            if not encryption_key:
                logger.warning("CREDENTIAL_ENCRYPTION_KEY not set. Encryption will be disabled.")
                return

            # Validate the key format
            if not self.is_valid_key(encryption_key):
                # If invalid key format, generate a new one and log warning
                logger.warning("Invalid encryption key format. Generating new key for development.")
                encryption_key = self.generate_key()
                logger.warning(f"Generated development key: {encryption_key}")
                logger.warning("DO NOT use this in production! Set a proper CREDENTIAL_ENCRYPTION_KEY")

            self.cipher = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
            logger.info("Credential encryption initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize encryption: {e}")
            self.cipher = None

    @staticmethod
    def generate_key() -> str:
        """Generate a new Fernet encryption key"""
        return Fernet.generate_key().decode()

    @staticmethod
    def is_valid_key(key: str) -> bool:
        """Check if a key is a valid Fernet key"""
        try:
            Fernet(key.encode() if isinstance(key, str) else key)
            return True
        except Exception:
            return False

    def encrypt(self, plaintext: str) -> Optional[str]:
        """
        Encrypt a plaintext string

        Args:
            plaintext: The string to encrypt

        Returns:
            Encrypted string or None if encryption is disabled
        """
        if not self.cipher:
            logger.debug("Encryption disabled - returning plaintext")
            return None

        if not plaintext:
            return None

        try:
            encrypted = self.cipher.encrypt(plaintext.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Failed to encrypt data: {e}")
            return None

    def decrypt(self, encrypted: str) -> Optional[str]:
        """
        Decrypt an encrypted string

        Args:
            encrypted: The encrypted string to decrypt

        Returns:
            Decrypted string or None if decryption fails
        """
        if not self.cipher:
            logger.debug("Encryption disabled - cannot decrypt")
            return None

        if not encrypted:
            return None

        try:
            decrypted = self.cipher.decrypt(encrypted.encode())
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Failed to decrypt data: {e}")
            return None


# Create a singleton instance
credential_encryption = CredentialEncryption()


# Convenience functions
def encrypt_credential(plaintext: str) -> Optional[str]:
    """Encrypt a credential string"""
    return credential_encryption.encrypt(plaintext)


def decrypt_credential(encrypted: str) -> Optional[str]:
    """Decrypt a credential string"""
    return credential_encryption.decrypt(encrypted)


def generate_encryption_key() -> str:
    """Generate a new encryption key for setup"""
    return CredentialEncryption.generate_key()


# Script to generate a new key (can be run directly)
if __name__ == "__main__":
    print("Generating new encryption key...")
    key = generate_encryption_key()
    print(f"\nNew encryption key: {key}")
    print("\nAdd this to your .env file:")
    print(f"CREDENTIAL_ENCRYPTION_KEY={key}")
    print("\nKEEP THIS KEY SECURE! If lost, encrypted data cannot be recovered.")
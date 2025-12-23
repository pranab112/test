"""
AWS S3 Storage Integration
===========================
Handles file uploads to AWS S3 for persistent storage across deployments.
Replaces local filesystem uploads which are lost on Render's ephemeral filesystem.
"""

import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import logging
from typing import Optional, BinaryIO
from datetime import datetime
import mimetypes
from pathlib import Path

logger = logging.getLogger(__name__)


class S3Storage:
    """Handle AWS S3 file uploads and management"""

    def __init__(self):
        """Initialize S3 client with credentials from environment"""
        self.enabled = self._check_configuration()

        if self.enabled:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            self.bucket_name = os.getenv('AWS_S3_BUCKET_NAME')
            logger.info(f"S3 storage initialized successfully (bucket: {self.bucket_name})")
        else:
            self.s3_client = None
            self.bucket_name = None
            env = os.getenv('ENVIRONMENT', 'development')
            if env == 'development':
                logger.info("S3 storage disabled - using local filesystem (development mode)")
            else:
                logger.warning("S3 storage is disabled - using local filesystem (NOT recommended for production)")

    def _check_configuration(self) -> bool:
        """Check if all required AWS S3 configuration is present"""
        required_vars = [
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_S3_BUCKET_NAME'
        ]

        missing = [var for var in required_vars if not os.getenv(var)]

        if missing:
            env = os.getenv('ENVIRONMENT', 'development')
            if env == 'development':
                logger.debug(f"S3 storage not configured - using local filesystem: {', '.join(missing)} not set")
            else:
                logger.warning(f"S3 storage disabled - missing environment variables: {', '.join(missing)}")
            return False

        return True

    def upload_file(
        self,
        file_content: BinaryIO,
        filename: str,
        folder: str = "uploads",
        content_type: Optional[str] = None
    ) -> Optional[str]:
        """
        Upload a file to S3 bucket

        Args:
            file_content: File-like object (binary content)
            filename: Name of the file (will be used as S3 key)
            folder: S3 folder/prefix (e.g., 'images', 'voice', 'profiles')
            content_type: MIME type (auto-detected if not provided)

        Returns:
            Public URL of uploaded file, or None if upload fails
        """
        if not self.enabled:
            logger.error("Cannot upload to S3 - storage is disabled")
            return None

        try:
            # Build S3 key (path in bucket)
            s3_key = f"{folder}/{filename}"

            # Auto-detect content type if not provided
            if not content_type:
                content_type, _ = mimetypes.guess_type(filename)
                if not content_type:
                    content_type = 'application/octet-stream'

            # Upload to S3
            self.s3_client.upload_fileobj(
                file_content,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': content_type,
                    'ACL': 'public-read',  # Make file publicly accessible
                    'CacheControl': 'max-age=31536000'  # Cache for 1 year
                }
            )

            # Generate public URL
            url = f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
            logger.info(f"File uploaded successfully to S3: {url}")
            return url

        except NoCredentialsError:
            logger.error("AWS credentials not found or invalid")
            return None
        except ClientError as e:
            logger.error(f"Failed to upload file to S3: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error uploading to S3: {e}", exc_info=True)
            return None

    def delete_file(self, file_url: str) -> bool:
        """
        Delete a file from S3 bucket

        Args:
            file_url: Full S3 URL of the file

        Returns:
            True if deleted successfully, False otherwise
        """
        if not self.enabled:
            logger.error("Cannot delete from S3 - storage is disabled")
            return False

        try:
            # Extract S3 key from URL
            # Example: https://bucket-name.s3.amazonaws.com/uploads/images/file.jpg -> uploads/images/file.jpg
            s3_key = file_url.split(f"{self.bucket_name}.s3.amazonaws.com/")[1]

            # Delete from S3
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )

            logger.info(f"File deleted from S3: {s3_key}")
            return True

        except IndexError:
            logger.error(f"Invalid S3 URL format: {file_url}")
            return False
        except ClientError as e:
            logger.error(f"Failed to delete file from S3: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting from S3: {e}", exc_info=True)
            return False

    def file_exists(self, file_url: str) -> bool:
        """
        Check if a file exists in S3

        Args:
            file_url: Full S3 URL of the file

        Returns:
            True if file exists, False otherwise
        """
        if not self.enabled:
            return False

        try:
            # Extract S3 key from URL
            s3_key = file_url.split(f"{self.bucket_name}.s3.amazonaws.com/")[1]

            # Check if object exists
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True

        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            logger.error(f"Error checking file existence: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error checking S3 file: {e}", exc_info=True)
            return False

    def generate_presigned_url(self, file_url: str, expiration: int = 3600) -> Optional[str]:
        """
        Generate a presigned URL for temporary private file access

        Args:
            file_url: Full S3 URL of the file
            expiration: URL expiration time in seconds (default: 1 hour)

        Returns:
            Presigned URL or None if failed
        """
        if not self.enabled:
            return None

        try:
            # Extract S3 key from URL
            s3_key = file_url.split(f"{self.bucket_name}.s3.amazonaws.com/")[1]

            # Generate presigned URL
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expiration
            )

            return presigned_url

        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {e}", exc_info=True)
            return None

    def get_bucket_info(self) -> dict:
        """Get S3 bucket configuration info for diagnostics"""
        return {
            'enabled': self.enabled,
            'bucket_name': self.bucket_name if self.enabled else None,
            'region': os.getenv('AWS_REGION', 'us-east-1'),
            'has_credentials': bool(os.getenv('AWS_ACCESS_KEY_ID'))
        }


# Create singleton instance
s3_storage = S3Storage()


# Convenience functions for backward compatibility
def upload_to_s3(
    file_content: BinaryIO,
    filename: str,
    folder: str = "uploads",
    content_type: Optional[str] = None
) -> Optional[str]:
    """Upload a file to S3 (convenience function)"""
    return s3_storage.upload_file(file_content, filename, folder, content_type)


def delete_from_s3(file_url: str) -> bool:
    """Delete a file from S3 (convenience function)"""
    return s3_storage.delete_file(file_url)


def is_s3_enabled() -> bool:
    """Check if S3 storage is enabled"""
    return s3_storage.enabled


# Fallback to local filesystem if S3 is disabled
def save_upload_file_locally(file_content: bytes, filepath: str) -> str:
    """
    Fallback: Save file to local filesystem (NOT recommended for production)
    Only used when S3 is not configured
    """
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        # Write file
        with open(filepath, 'wb') as f:
            f.write(file_content)

        logger.warning(f"File saved locally (ephemeral): {filepath}")
        return filepath

    except Exception as e:
        logger.error(f"Failed to save file locally: {e}", exc_info=True)
        raise


def get_file_url(filepath: str, use_s3: bool = True) -> str:
    """
    Generate appropriate file URL based on storage type

    Args:
        filepath: File path or S3 URL
        use_s3: Whether to use S3 (ignored if S3 is disabled)

    Returns:
        Full URL to access the file
    """
    # If already a full URL (S3 or external), return as-is
    if filepath.startswith('http://') or filepath.startswith('https://'):
        return filepath

    # If S3 is enabled, this should already be an S3 URL
    if s3_storage.enabled:
        return filepath

    # Local filesystem URL (for development only)
    return f"/{filepath}"

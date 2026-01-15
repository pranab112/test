"""
AWS S3 Storage Integration
===========================
Handles file uploads to AWS S3 for persistent storage across deployments.
Replaces local filesystem uploads which are lost on Render's ephemeral filesystem.
"""

import os
import re
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import logging
from typing import Optional, BinaryIO, Tuple
from datetime import datetime
import mimetypes
from pathlib import Path
from urllib.parse import urlparse
import time

logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds


class S3Storage:
    """Handle AWS S3 file uploads and management"""

    def __init__(self):
        """Initialize S3 client with credentials from environment"""
        self.enabled = self._check_configuration()
        self._acl_supported = None  # Will be determined on first upload

        if self.enabled:
            self.region = os.getenv('AWS_REGION', 'us-east-1')
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=self.region
            )
            self.bucket_name = os.getenv('AWS_S3_BUCKET_NAME')
            logger.info(f"S3 storage initialized successfully (bucket: {self.bucket_name}, region: {self.region})")
        else:
            self.s3_client = None
            self.bucket_name = None
            self.region = None
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

    def _extract_s3_key(self, file_url: str) -> Optional[str]:
        """
        Extract S3 key from various S3 URL formats.

        Supports:
        - https://bucket-name.s3.amazonaws.com/key
        - https://bucket-name.s3.us-east-1.amazonaws.com/key
        - https://s3.amazonaws.com/bucket-name/key
        - https://s3.us-east-1.amazonaws.com/bucket-name/key
        - https://bucket-name.s3-us-east-1.amazonaws.com/key (legacy)
        """
        if not file_url:
            return None

        try:
            parsed = urlparse(file_url)
            host = parsed.netloc
            path = parsed.path.lstrip('/')

            # Pattern 1: bucket-name.s3.amazonaws.com or bucket-name.s3.region.amazonaws.com
            if host.startswith(f"{self.bucket_name}.s3"):
                return path

            # Pattern 2: s3.amazonaws.com/bucket-name or s3.region.amazonaws.com/bucket-name
            if host.startswith('s3.') or host.startswith('s3-'):
                # Remove bucket name from path
                if path.startswith(f"{self.bucket_name}/"):
                    return path[len(self.bucket_name) + 1:]

            # Pattern 3: Try regex for any S3 URL format
            # Match: bucket.s3[-.]region?.amazonaws.com/key
            pattern = rf'{re.escape(self.bucket_name)}\.s3[-.]?[\w-]*\.?amazonaws\.com/(.+)'
            match = re.search(pattern, file_url)
            if match:
                return match.group(1)

            # Pattern 4: s3[-.]region?.amazonaws.com/bucket/key
            pattern = rf's3[-.]?[\w-]*\.?amazonaws\.com/{re.escape(self.bucket_name)}/(.+)'
            match = re.search(pattern, file_url)
            if match:
                return match.group(1)

            logger.warning(f"Could not extract S3 key from URL: {file_url}")
            return None

        except Exception as e:
            logger.error(f"Error parsing S3 URL: {e}")
            return None

    def _generate_s3_url(self, s3_key: str) -> str:
        """Generate the public URL for an S3 object"""
        # Use regional endpoint for better reliability
        if self.region and self.region != 'us-east-1':
            return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
        return f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"

    def _upload_with_retry(
        self,
        file_content: BinaryIO,
        s3_key: str,
        content_type: str,
        use_acl: bool = True
    ) -> Tuple[bool, Optional[str]]:
        """
        Upload file with retry logic and ACL fallback.

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        extra_args = {
            'ContentType': content_type,
            'CacheControl': 'max-age=31536000'  # Cache for 1 year
        }

        # Add ACL if supported
        if use_acl and self._acl_supported is not False:
            extra_args['ACL'] = 'public-read'

        last_error = None

        for attempt in range(MAX_RETRIES):
            try:
                # Reset file pointer for retry
                file_content.seek(0)

                self.s3_client.upload_fileobj(
                    file_content,
                    self.bucket_name,
                    s3_key,
                    ExtraArgs=extra_args
                )

                # Mark ACL as supported if we got here with ACL
                if 'ACL' in extra_args:
                    self._acl_supported = True

                return True, None

            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', '')
                error_message = str(e)

                # Handle ACL not supported (new S3 buckets with Object Ownership)
                if error_code == 'AccessControlListNotSupported' and 'ACL' in extra_args:
                    logger.warning("S3 bucket does not support ACLs. Retrying without ACL...")
                    self._acl_supported = False
                    del extra_args['ACL']
                    # Don't count this as a retry attempt
                    continue

                # Handle access denied - might be permissions issue
                if error_code == 'AccessDenied':
                    logger.error(f"S3 access denied. Check IAM permissions: {error_message}")
                    return False, f"Access denied: {error_message}"

                last_error = error_message

                if attempt < MAX_RETRIES - 1:
                    logger.warning(f"S3 upload attempt {attempt + 1} failed: {error_message}. Retrying...")
                    time.sleep(RETRY_DELAY * (attempt + 1))  # Exponential backoff

            except Exception as e:
                last_error = str(e)
                if attempt < MAX_RETRIES - 1:
                    logger.warning(f"S3 upload attempt {attempt + 1} failed: {e}. Retrying...")
                    time.sleep(RETRY_DELAY * (attempt + 1))

        return False, last_error

    def upload_file(
        self,
        file_content: BinaryIO,
        filename: str,
        folder: str = "uploads",
        content_type: Optional[str] = None
    ) -> Optional[str]:
        """
        Upload a file to S3 bucket with retry logic.

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

            # Upload with retry logic
            success, error = self._upload_with_retry(file_content, s3_key, content_type)

            if success:
                url = self._generate_s3_url(s3_key)
                logger.info(f"File uploaded successfully to S3: {url}")
                return url
            else:
                logger.error(f"Failed to upload file to S3 after {MAX_RETRIES} attempts: {error}")
                return None

        except NoCredentialsError:
            logger.error("AWS credentials not found or invalid")
            return None
        except Exception as e:
            logger.error(f"Unexpected error uploading to S3: {e}", exc_info=True)
            return None

    def delete_file(self, file_url: str) -> bool:
        """
        Delete a file from S3 bucket.

        Args:
            file_url: Full S3 URL of the file

        Returns:
            True if deleted successfully, False otherwise
        """
        if not self.enabled:
            logger.error("Cannot delete from S3 - storage is disabled")
            return False

        if not file_url:
            logger.warning("Cannot delete: empty file URL provided")
            return False

        # Skip if not an S3 URL
        if not self.is_s3_url(file_url):
            logger.debug(f"Not an S3 URL, skipping S3 delete: {file_url}")
            return False

        try:
            s3_key = self._extract_s3_key(file_url)

            if not s3_key:
                logger.error(f"Could not extract S3 key from URL: {file_url}")
                return False

            # Delete from S3
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )

            logger.info(f"File deleted from S3: {s3_key}")
            return True

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == 'NoSuchKey':
                logger.warning(f"File not found in S3 (already deleted?): {file_url}")
                return True  # Consider it success if file doesn't exist
            logger.error(f"Failed to delete file from S3: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting from S3: {e}", exc_info=True)
            return False

    def file_exists(self, file_url: str) -> bool:
        """
        Check if a file exists in S3.

        Args:
            file_url: Full S3 URL of the file

        Returns:
            True if file exists, False otherwise
        """
        if not self.enabled:
            return False

        if not file_url or not self.is_s3_url(file_url):
            return False

        try:
            s3_key = self._extract_s3_key(file_url)

            if not s3_key:
                return False

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
        Generate a presigned URL for temporary private file access.

        Args:
            file_url: Full S3 URL of the file
            expiration: URL expiration time in seconds (default: 1 hour)

        Returns:
            Presigned URL or None if failed
        """
        if not self.enabled:
            return None

        if not file_url or not self.is_s3_url(file_url):
            return None

        try:
            s3_key = self._extract_s3_key(file_url)

            if not s3_key:
                return None

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

    def is_s3_url(self, url: str) -> bool:
        """Check if a URL is an S3 URL for this bucket"""
        if not url or not self.bucket_name:
            return False

        # Check various S3 URL patterns
        s3_patterns = [
            f"{self.bucket_name}.s3",
            f"s3.amazonaws.com/{self.bucket_name}",
            f"s3-",  # Legacy regional format
        ]

        return any(pattern in url for pattern in s3_patterns) and 'amazonaws.com' in url

    def get_bucket_info(self) -> dict:
        """Get S3 bucket configuration info for diagnostics"""
        info = {
            'enabled': self.enabled,
            'bucket_name': self.bucket_name if self.enabled else None,
            'region': self.region,
            'has_credentials': bool(os.getenv('AWS_ACCESS_KEY_ID')),
            'acl_supported': self._acl_supported
        }

        # Test bucket access if enabled
        if self.enabled:
            try:
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                info['bucket_accessible'] = True
            except ClientError as e:
                info['bucket_accessible'] = False
                info['bucket_error'] = str(e)
            except Exception as e:
                info['bucket_accessible'] = False
                info['bucket_error'] = str(e)

        return info

    def test_connection(self) -> Tuple[bool, str]:
        """
        Test S3 connection and permissions.

        Returns:
            Tuple of (success: bool, message: str)
        """
        if not self.enabled:
            return False, "S3 storage is not enabled"

        try:
            # Test bucket access
            self.s3_client.head_bucket(Bucket=self.bucket_name)

            # Test write permission with a small test file
            test_key = "_connection_test_delete_me.txt"
            test_content = b"connection test"

            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=test_key,
                    Body=test_content
                )
                # Clean up test file
                self.s3_client.delete_object(
                    Bucket=self.bucket_name,
                    Key=test_key
                )
                return True, "S3 connection successful with read/write access"
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', '')
                if error_code == 'AccessDenied':
                    return False, "S3 bucket accessible but write permission denied"
                raise

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == '404':
                return False, f"S3 bucket '{self.bucket_name}' not found"
            elif error_code == '403':
                return False, "Access denied to S3 bucket"
            return False, f"S3 error: {str(e)}"
        except NoCredentialsError:
            return False, "AWS credentials not found or invalid"
        except Exception as e:
            return False, f"Unexpected error: {str(e)}"


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


def is_s3_url(url: str) -> bool:
    """Check if a URL is an S3 URL"""
    return s3_storage.is_s3_url(url)


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
    Generate appropriate file URL based on storage type.

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

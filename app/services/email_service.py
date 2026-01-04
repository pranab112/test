"""Email service for sending emails via SMTP."""

import smtplib
import ssl
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)


def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP."""
    return ''.join(random.choices(string.digits, k=length))


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> bool:
    """
    Send an email using SMTP settings from config.

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML body content
        text_content: Plain text body content (fallback)

    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.smtp_configured:
        logger.error("SMTP not configured. Cannot send email.")
        return False

    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        message["To"] = to_email

        # Add plain text part
        if text_content:
            part1 = MIMEText(text_content, "plain")
            message.attach(part1)

        # Add HTML part
        part2 = MIMEText(html_content, "html")
        message.attach(part2)

        # Connect and send
        if settings.SMTP_ENCRYPTION.lower() == "ssl":
            # SSL connection (port 465 typically)
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context) as server:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, to_email, message.as_string())
        else:
            # TLS connection (port 587 typically)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, to_email, message.as_string())

        logger.info(f"Email sent successfully to {to_email}")
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error occurred: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


def send_otp_email(to_email: str, otp: str, username: str = "User") -> bool:
    """
    Send an OTP verification email.

    Args:
        to_email: Recipient email address
        otp: The OTP code to send
        username: User's name for personalization

    Returns:
        True if email sent successfully, False otherwise
    """
    subject = f"Your Verification Code - {settings.SMTP_FROM_NAME}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #1a1a2e; font-family: Arial, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #16213e; border-radius: 12px; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #d4af37 0%, #f4e5b2 50%, #d4af37 100%); padding: 30px; text-align: center;">
                                <h1 style="margin: 0; color: #1a1a2e; font-size: 28px; font-weight: bold;">
                                    {settings.SMTP_FROM_NAME}
                                </h1>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="margin: 0 0 20px; color: #d4af37; font-size: 24px;">
                                    Email Verification
                                </h2>
                                <p style="margin: 0 0 20px; color: #e0e0e0; font-size: 16px; line-height: 1.6;">
                                    Hello {username},
                                </p>
                                <p style="margin: 0 0 30px; color: #e0e0e0; font-size: 16px; line-height: 1.6;">
                                    Please use the following verification code to verify your email address:
                                </p>

                                <!-- OTP Code Box -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <div style="background-color: #0f3460; border: 2px solid #d4af37; border-radius: 8px; padding: 20px 40px; display: inline-block;">
                                                <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #d4af37; letter-spacing: 8px;">
                                                    {otp}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 0 0 10px; color: #9e9e9e; font-size: 14px; line-height: 1.6;">
                                    This code will expire in <strong style="color: #d4af37;">10 minutes</strong>.
                                </p>
                                <p style="margin: 0 0 30px; color: #9e9e9e; font-size: 14px; line-height: 1.6;">
                                    If you didn't request this verification, please ignore this email.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #0f3460; padding: 20px 30px; text-align: center;">
                                <p style="margin: 0 0 10px; color: #9e9e9e; font-size: 12px;">
                                    This is an automated message from {settings.SMTP_FROM_NAME}.
                                </p>
                                <p style="margin: 0; color: #9e9e9e; font-size: 12px;">
                                    Please do not reply to this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    text_content = f"""
    {settings.SMTP_FROM_NAME} - Email Verification

    Hello {username},

    Please use the following verification code to verify your email address:

    {otp}

    This code will expire in 10 minutes.

    If you didn't request this verification, please ignore this email.

    ---
    This is an automated message from {settings.SMTP_FROM_NAME}.
    Please do not reply to this email.
    """

    return send_email(to_email, subject, html_content, text_content)


def send_welcome_email(to_email: str, username: str) -> bool:
    """
    Send a welcome email to new users.

    Args:
        to_email: Recipient email address
        username: User's name for personalization

    Returns:
        True if email sent successfully, False otherwise
    """
    subject = f"Welcome to {settings.SMTP_FROM_NAME}!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #1a1a2e; font-family: Arial, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #16213e; border-radius: 12px; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #d4af37 0%, #f4e5b2 50%, #d4af37 100%); padding: 30px; text-align: center;">
                                <h1 style="margin: 0; color: #1a1a2e; font-size: 28px; font-weight: bold;">
                                    Welcome to {settings.SMTP_FROM_NAME}!
                                </h1>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="margin: 0 0 20px; color: #d4af37; font-size: 24px;">
                                    Hello {username}! 🎉
                                </h2>
                                <p style="margin: 0 0 20px; color: #e0e0e0; font-size: 16px; line-height: 1.6;">
                                    Thank you for joining {settings.SMTP_FROM_NAME}. We're excited to have you!
                                </p>
                                <p style="margin: 0 0 20px; color: #e0e0e0; font-size: 16px; line-height: 1.6;">
                                    Your account is currently pending approval. Once approved, you'll be able to access all features.
                                </p>
                                <p style="margin: 0 0 30px; color: #e0e0e0; font-size: 16px; line-height: 1.6;">
                                    In the meantime, make sure to verify your email address to unlock special bonuses!
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #0f3460; padding: 20px 30px; text-align: center;">
                                <p style="margin: 0 0 10px; color: #9e9e9e; font-size: 12px;">
                                    This is an automated message from {settings.SMTP_FROM_NAME}.
                                </p>
                                <p style="margin: 0; color: #9e9e9e; font-size: 12px;">
                                    Please do not reply to this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    text_content = f"""
    Welcome to {settings.SMTP_FROM_NAME}!

    Hello {username}!

    Thank you for joining {settings.SMTP_FROM_NAME}. We're excited to have you!

    Your account is currently pending approval. Once approved, you'll be able to access all features.

    In the meantime, make sure to verify your email address to unlock special bonuses!

    ---
    This is an automated message from {settings.SMTP_FROM_NAME}.
    Please do not reply to this email.
    """

    return send_email(to_email, subject, html_content, text_content)


def send_referral_bonus_email(to_email: str, username: str, referred_username: str, bonus_amount: int) -> bool:
    """
    Send notification email when user earns a referral bonus.

    Args:
        to_email: Recipient email address
        username: User's name for personalization
        referred_username: Username of the person who was referred
        bonus_amount: Amount of credits earned

    Returns:
        True if email sent successfully, False otherwise
    """
    subject = f"You've earned {bonus_amount} credits! - {settings.SMTP_FROM_NAME}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #1a1a2e; font-family: Arial, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #16213e; border-radius: 12px; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                    🎁 Referral Bonus!
                                </h1>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="margin: 0 0 20px; color: #d4af37; font-size: 24px;">
                                    Congratulations {username}!
                                </h2>
                                <p style="margin: 0 0 20px; color: #e0e0e0; font-size: 16px; line-height: 1.6;">
                                    Great news! Your referral <strong style="color: #d4af37;">{referred_username}</strong> has been approved.
                                </p>

                                <!-- Bonus Box -->
                                <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                                    <tr>
                                        <td align="center">
                                            <div style="background-color: #0f3460; border: 2px solid #9b59b6; border-radius: 8px; padding: 25px 40px; display: inline-block;">
                                                <span style="font-size: 18px; color: #9e9e9e;">You've earned</span>
                                                <br>
                                                <span style="font-size: 42px; font-weight: bold; color: #d4af37;">
                                                    +{bonus_amount}
                                                </span>
                                                <br>
                                                <span style="font-size: 18px; color: #9b59b6;">credits</span>
                                            </div>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin: 0 0 20px; color: #e0e0e0; font-size: 16px; line-height: 1.6;">
                                    Keep sharing your referral code to earn more credits!
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #0f3460; padding: 20px 30px; text-align: center;">
                                <p style="margin: 0 0 10px; color: #9e9e9e; font-size: 12px;">
                                    This is an automated message from {settings.SMTP_FROM_NAME}.
                                </p>
                                <p style="margin: 0; color: #9e9e9e; font-size: 12px;">
                                    Please do not reply to this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    text_content = f"""
    Referral Bonus - {settings.SMTP_FROM_NAME}

    Congratulations {username}!

    Great news! Your referral {referred_username} has been approved.

    You've earned +{bonus_amount} credits!

    Keep sharing your referral code to earn more credits!

    ---
    This is an automated message from {settings.SMTP_FROM_NAME}.
    Please do not reply to this email.
    """

    return send_email(to_email, subject, html_content, text_content)

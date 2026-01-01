"""
Contact form API endpoint with Gmail SMTP support
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["contact"])


class ContactFormRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


class ContactFormResponse(BaseModel):
    success: bool
    message: str


def send_contact_email(name: str, email: str, subject: str, message: str):
    """Send contact form email via Gmail SMTP"""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from_email = os.getenv("SMTP_FROM_EMAIL")
    smtp_from_name = os.getenv("SMTP_FROM_NAME", "Casino Royal")
    contact_email = os.getenv("CONTACT_EMAIL", smtp_username)

    if not all([smtp_username, smtp_password, smtp_from_email]):
        logger.error("SMTP configuration incomplete. Check environment variables.")
        raise Exception("Email configuration error")

    # Create the email message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Contact Form: {subject}"
    msg["From"] = f"{smtp_from_name} <{smtp_from_email}>"
    msg["To"] = contact_email
    msg["Reply-To"] = email

    # Plain text version
    text_content = f"""
New Contact Form Submission
===========================

Name: {name}
Email: {email}
Subject: {subject}

Message:
{message}

---
This message was sent via the Casino Royal contact form.
"""

    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 8px;
        }}
        .header {{
            background-color: #1a1a2e;
            color: #d4af37;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }}
        .content {{
            background-color: #ffffff;
            padding: 20px;
            border-radius: 0 0 8px 8px;
        }}
        .field {{
            margin-bottom: 15px;
        }}
        .label {{
            font-weight: bold;
            color: #666;
        }}
        .message-box {{
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            margin-top: 10px;
            white-space: pre-wrap;
        }}
        .footer {{
            text-align: center;
            margin-top: 20px;
            color: #888;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Contact Form Submission</h1>
        </div>
        <div class="content">
            <div class="field">
                <span class="label">Name:</span> {name}
            </div>
            <div class="field">
                <span class="label">Email:</span> <a href="mailto:{email}">{email}</a>
            </div>
            <div class="field">
                <span class="label">Subject:</span> {subject}
            </div>
            <div class="field">
                <span class="label">Message:</span>
                <div class="message-box">{message}</div>
            </div>
        </div>
        <div class="footer">
            This message was sent via the Casino Royal contact form.
        </div>
    </div>
</body>
</html>
"""

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    # Send the email
    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.sendmail(smtp_from_email, contact_email, msg.as_string())
        logger.info(f"Contact form email sent successfully from {email}")
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed: {e}")
        raise Exception("Email authentication failed. Please check SMTP credentials.")
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error: {e}")
        raise Exception("Failed to send email. Please try again later.")
    except Exception as e:
        logger.error(f"Email sending error: {e}")
        raise


@router.post("", response_model=ContactFormResponse)
async def submit_contact_form(
    form_data: ContactFormRequest,
    background_tasks: BackgroundTasks
):
    """
    Submit a contact form message.
    The email is sent in the background to provide immediate response to the user.
    """
    try:
        # Send email in background to not block the response
        background_tasks.add_task(
            send_contact_email,
            form_data.name,
            form_data.email,
            form_data.subject,
            form_data.message
        )

        return ContactFormResponse(
            success=True,
            message="Your message has been sent successfully. We will get back to you soon."
        )
    except Exception as e:
        logger.error(f"Contact form submission error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send your message. Please try again later."
        )

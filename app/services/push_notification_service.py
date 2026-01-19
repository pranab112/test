"""
Expo Push Notification Service
Handles sending push notifications to mobile devices via Expo's push notification API.
"""
import httpx
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app import models
from app.models.push_token import DevicePlatform

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class PushNotificationService:
    """Service for sending push notifications via Expo"""

    @staticmethod
    async def send_notification(
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        category: str = "default",
        sound: str = "default",
        badge: Optional[int] = None,
        channel_id: Optional[str] = None,
    ) -> bool:
        """
        Send a push notification to a single device.

        Args:
            token: Expo push token (ExponentPushToken[...])
            title: Notification title
            body: Notification body/message
            data: Additional data payload
            category: Notification category for routing
            sound: Sound to play (default, null, or custom)
            badge: iOS badge count
            channel_id: Android notification channel ID

        Returns:
            True if sent successfully, False otherwise
        """
        if not token or not token.startswith("ExponentPushToken"):
            logger.warning(f"Invalid push token format: {token[:20] if token else 'None'}...")
            return False

        message = {
            "to": token,
            "title": title,
            "body": body,
            "sound": sound,
            "data": {
                **(data or {}),
                "category": category,
            },
        }

        if badge is not None:
            message["badge"] = badge

        if channel_id:
            message["channelId"] = channel_id

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=message,
                    headers={
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    # Check for errors in the response
                    if result.get("data", {}).get("status") == "error":
                        error_message = result.get("data", {}).get("message", "Unknown error")
                        logger.error(f"Push notification error: {error_message}")
                        return False
                    logger.info(f"Push notification sent successfully to {token[:30]}...")
                    return True
                else:
                    logger.error(f"Push notification failed with status {response.status_code}")
                    return False

        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
            return False

    @staticmethod
    async def send_notifications_bulk(
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        category: str = "default",
        sound: str = "default",
        channel_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send push notifications to multiple devices.
        Expo recommends sending in batches of 100.

        Returns:
            Dict with success_count and failed_count
        """
        if not tokens:
            return {"success_count": 0, "failed_count": 0}

        # Filter valid tokens
        valid_tokens = [t for t in tokens if t and t.startswith("ExponentPushToken")]

        if not valid_tokens:
            return {"success_count": 0, "failed_count": len(tokens)}

        # Build messages
        messages = []
        for token in valid_tokens:
            message = {
                "to": token,
                "title": title,
                "body": body,
                "sound": sound,
                "data": {
                    **(data or {}),
                    "category": category,
                },
            }
            if channel_id:
                message["channelId"] = channel_id
            messages.append(message)

        # Send in batches of 100
        batch_size = 100
        success_count = 0
        failed_count = 0

        try:
            async with httpx.AsyncClient() as client:
                for i in range(0, len(messages), batch_size):
                    batch = messages[i:i + batch_size]

                    response = await client.post(
                        EXPO_PUSH_URL,
                        json=batch,
                        headers={
                            "Accept": "application/json",
                            "Accept-Encoding": "gzip, deflate",
                            "Content-Type": "application/json",
                        },
                        timeout=30.0,
                    )

                    if response.status_code == 200:
                        result = response.json()
                        # Count successes and failures
                        for ticket in result.get("data", []):
                            if ticket.get("status") == "ok":
                                success_count += 1
                            else:
                                failed_count += 1
                                logger.warning(f"Push notification failed: {ticket.get('message', 'Unknown error')}")
                    else:
                        failed_count += len(batch)
                        logger.error(f"Batch push notification failed with status {response.status_code}")

        except Exception as e:
            logger.error(f"Error sending bulk push notifications: {e}")
            failed_count += len(messages) - success_count

        logger.info(f"Bulk push: {success_count} sent, {failed_count} failed")
        return {"success_count": success_count, "failed_count": failed_count}


# Singleton instance
push_service = PushNotificationService()


# Helper functions for common notification types
async def send_promotion_notification(
    db: Session,
    user_ids: List[int],
    promotion_title: str,
    promotion_value: float,
    client_name: str,
    promotion_id: int,
) -> Dict[str, Any]:
    """
    Send push notifications to users about a new promotion.
    """
    # Get all active push tokens for the specified users
    tokens = db.query(models.PushToken.token).filter(
        models.PushToken.user_id.in_(user_ids),
        models.PushToken.is_active == True
    ).all()

    token_list = [t[0] for t in tokens]

    if not token_list:
        logger.info(f"No push tokens found for promotion notification (users: {len(user_ids)})")
        return {"success_count": 0, "failed_count": 0, "no_tokens": True}

    return await push_service.send_notifications_bulk(
        tokens=token_list,
        title=f"New Promotion from {client_name}!",
        body=f"{promotion_title} - Get {promotion_value} credits!",
        data={
            "promotion_id": promotion_id,
            "client_name": client_name,
            "value": promotion_value,
            "action": "view_promotion",
        },
        category="promotion",
        channel_id="promotions",
    )


async def send_message_notification(
    db: Session,
    receiver_id: int,
    sender_name: str,
    message_preview: str,
    sender_id: int,
) -> bool:
    """
    Send push notification for a new message.
    """
    tokens = db.query(models.PushToken.token).filter(
        models.PushToken.user_id == receiver_id,
        models.PushToken.is_active == True
    ).all()

    if not tokens:
        return False

    # Send to all user's devices
    for (token,) in tokens:
        await push_service.send_notification(
            token=token,
            title=f"Message from {sender_name}",
            body=message_preview[:100] + ("..." if len(message_preview) > 100 else ""),
            data={
                "sender_id": sender_id,
                "sender_name": sender_name,
                "action": "open_chat",
            },
            category="message",
            channel_id="messages",
        )

    return True


async def send_credit_notification(
    db: Session,
    user_id: int,
    amount: float,
    reason: str,
    sender_name: Optional[str] = None,
) -> bool:
    """
    Send push notification for credit transfer.
    """
    tokens = db.query(models.PushToken.token).filter(
        models.PushToken.user_id == user_id,
        models.PushToken.is_active == True
    ).all()

    if not tokens:
        return False

    title = "Credits Received!" if amount > 0 else "Credits Deducted"
    body = f"You received {abs(amount)} credits"
    if sender_name:
        body += f" from {sender_name}"
    if reason:
        body += f" ({reason})"

    for (token,) in tokens:
        await push_service.send_notification(
            token=token,
            title=title,
            body=body,
            data={
                "amount": amount,
                "reason": reason,
                "action": "view_wallet",
            },
            category="credit_transfer",
            channel_id="credits",
        )

    return True


async def send_claim_notification(
    db: Session,
    player_id: int,
    promotion_title: str,
    status: str,  # "approved" or "rejected"
    value: float,
    client_name: str,
) -> bool:
    """
    Send push notification when promotion claim is approved/rejected.
    """
    tokens = db.query(models.PushToken.token).filter(
        models.PushToken.user_id == player_id,
        models.PushToken.is_active == True
    ).all()

    if not tokens:
        return False

    if status == "approved":
        title = "Claim Approved!"
        body = f"Your claim for '{promotion_title}' was approved! {value} credits added."
    else:
        title = "Claim Rejected"
        body = f"Your claim for '{promotion_title}' was rejected."

    for (token,) in tokens:
        await push_service.send_notification(
            token=token,
            title=title,
            body=body,
            data={
                "promotion_title": promotion_title,
                "status": status,
                "value": value,
                "client_name": client_name,
                "action": "view_claims",
            },
            category="claim",
            channel_id="promotions",
        )

    return True

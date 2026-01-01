"""
WebSocket Connection Manager for Real-time Messaging

This module provides a robust WebSocket implementation for:
- Direct messaging between users (clients, players)
- Typing indicators
- Online/offline status tracking
- Message delivery and read receipts
- Room-based group messaging
- Heartbeat/ping-pong for connection health
"""

from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Set
import json
import asyncio
from datetime import datetime, timezone
from enum import Enum
from dataclasses import dataclass, asdict
from app.database import get_db, SessionLocal
from app import models
from jose import JWTError, jwt
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class WSMessageType(str, Enum):
    """WebSocket message types"""
    # Connection
    PING = "ping"
    PONG = "pong"
    CONNECTED = "connected"
    ERROR = "error"

    # Messages
    MESSAGE_SEND = "message:send"
    MESSAGE_NEW = "message:new"
    MESSAGE_DELIVERED = "message:delivered"
    MESSAGE_READ = "message:read"
    MESSAGE_DELETED = "message:deleted"

    # Typing
    TYPING_START = "typing:start"
    TYPING_STOP = "typing:stop"

    # Online Status
    USER_ONLINE = "user:online"
    USER_OFFLINE = "user:offline"
    USER_STATUS_REQUEST = "user:status"
    USER_STATUS_RESPONSE = "user:status:response"

    # Rooms
    ROOM_JOIN = "room:join"
    ROOM_LEAVE = "room:leave"
    ROOM_JOINED = "room:joined"
    ROOM_LEFT = "room:left"

    # Notifications
    NOTIFICATION = "notification"
    FRIEND_REQUEST = "friend_request"
    FRIEND_ACCEPTED = "friend_accepted"


@dataclass
class WSMessage:
    """WebSocket message structure"""
    type: str
    data: dict
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, json_str: str) -> 'WSMessage':
        data = json.loads(json_str)
        return cls(
            type=data.get('type', 'unknown'),
            data=data.get('data', {}),
            timestamp=data.get('timestamp')
        )


class ConnectionManager:
    """
    Manages WebSocket connections for real-time messaging.

    Features:
    - Multiple connections per user (multiple tabs/devices)
    - Room-based messaging for group chats
    - Direct messaging between users
    - Online status tracking
    - Typing indicators
    - Message persistence and delivery tracking
    """

    def __init__(self):
        # user_id -> list of WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # room_id -> set of user_ids
        self.rooms: Dict[str, Set[int]] = {}
        # user_id -> set of room_ids
        self.user_rooms: Dict[int, Set[str]] = {}
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: int, db: Session) -> bool:
        """
        Accept a new WebSocket connection and register the user.

        Args:
            websocket: The WebSocket connection
            user_id: The authenticated user's ID
            db: Database session

        Returns:
            bool: True if connection was successful
        """
        try:
            await websocket.accept()

            async with self._lock:
                # Add connection to user's connection list
                if user_id not in self.active_connections:
                    self.active_connections[user_id] = []
                self.active_connections[user_id].append(websocket)

                # Initialize user's room set
                if user_id not in self.user_rooms:
                    self.user_rooms[user_id] = set()

            # Update user online status in database
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                was_offline = not user.is_online
                user.is_online = True
                user.last_activity = datetime.now(timezone.utc)
                db.commit()

                # Only notify friends if user was previously offline
                if was_offline:
                    await self._notify_friends_online(user, db)

            # Send connection confirmation
            await self.send_to_user(user_id, WSMessage(
                type=WSMessageType.CONNECTED,
                data={
                    "user_id": user_id,
                    "message": "Connected successfully"
                }
            ))

            logger.info(f"User {user_id} connected. Total connections: {len(self.active_connections.get(user_id, []))}")
            return True

        except Exception as e:
            logger.error(f"Error connecting user {user_id}: {e}")
            return False

    async def disconnect(self, websocket: WebSocket, user_id: int, db: Session):
        """
        Handle WebSocket disconnection.

        Args:
            websocket: The WebSocket connection being closed
            user_id: The user's ID
            db: Database session
        """
        async with self._lock:
            if user_id in self.active_connections:
                # Remove this specific connection
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)

                # If no more connections for this user
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

                    # Remove from all rooms
                    if user_id in self.user_rooms:
                        for room_id in list(self.user_rooms[user_id]):
                            if room_id in self.rooms:
                                self.rooms[room_id].discard(user_id)
                                if not self.rooms[room_id]:
                                    del self.rooms[room_id]
                        del self.user_rooms[user_id]

                    # Update user offline status
                    user = db.query(models.User).filter(models.User.id == user_id).first()
                    if user:
                        user.is_online = False
                        user.last_seen = datetime.now(timezone.utc)
                        db.commit()

                        # Notify friends user is offline
                        await self._notify_friends_offline(user, db)

        logger.info(f"User {user_id} disconnected")

    async def _notify_friends_online(self, user: models.User, db: Session):
        """Notify all friends that user is online"""
        for friend in user.friends:
            await self.send_to_user(friend.id, WSMessage(
                type=WSMessageType.USER_ONLINE,
                data={
                    "user_id": user.id,
                    "username": user.username,
                    "user_type": user.user_type.value,
                    "profile_picture": user.profile_picture
                }
            ))

    async def _notify_friends_offline(self, user: models.User, db: Session):
        """Notify all friends that user is offline"""
        for friend in user.friends:
            await self.send_to_user(friend.id, WSMessage(
                type=WSMessageType.USER_OFFLINE,
                data={
                    "user_id": user.id,
                    "username": user.username,
                    "last_seen": datetime.now(timezone.utc).isoformat()
                }
            ))

    async def send_to_user(self, user_id: int, message: WSMessage) -> bool:
        """
        Send a message to a specific user (all their connections).

        Args:
            user_id: Target user's ID
            message: WSMessage to send

        Returns:
            bool: True if message was sent to at least one connection
        """
        if user_id not in self.active_connections:
            return False

        sent = False
        dead_connections = []

        for connection in self.active_connections[user_id]:
            try:
                await connection.send_text(message.to_json())
                sent = True
            except Exception as e:
                logger.warning(f"Failed to send to user {user_id}: {e}")
                dead_connections.append(connection)

        # Clean up dead connections
        for conn in dead_connections:
            if conn in self.active_connections.get(user_id, []):
                self.active_connections[user_id].remove(conn)

        return sent

    async def send_to_room(self, room_id: str, message: WSMessage, exclude_user: int = None):
        """
        Send a message to all users in a room.

        Args:
            room_id: The room identifier
            message: WSMessage to send
            exclude_user: Optional user ID to exclude from broadcast
        """
        if room_id not in self.rooms:
            return

        for user_id in self.rooms[room_id]:
            if exclude_user and user_id == exclude_user:
                continue
            await self.send_to_user(user_id, message)

    async def broadcast_to_all(self, message: WSMessage, user_type: str = None):
        """
        Broadcast a message to all connected users.

        Args:
            message: WSMessage to send
            user_type: Optional filter by user type ('client', 'player', 'admin')
        """
        # Get a fresh database session for this operation
        db = SessionLocal()
        try:
            for user_id in list(self.active_connections.keys()):
                if user_type:
                    user = db.query(models.User).filter(models.User.id == user_id).first()
                    if not user or user.user_type.value != user_type:
                        continue
                await self.send_to_user(user_id, message)
        finally:
            db.close()

    async def join_room(self, user_id: int, room_id: str) -> bool:
        """
        Add a user to a room.

        Args:
            user_id: User's ID
            room_id: Room identifier

        Returns:
            bool: True if join was successful
        """
        async with self._lock:
            if room_id not in self.rooms:
                self.rooms[room_id] = set()
            self.rooms[room_id].add(user_id)

            if user_id not in self.user_rooms:
                self.user_rooms[user_id] = set()
            self.user_rooms[user_id].add(room_id)

        # Notify room members
        await self.send_to_room(room_id, WSMessage(
            type=WSMessageType.ROOM_JOINED,
            data={
                "room_id": room_id,
                "user_id": user_id
            }
        ), exclude_user=user_id)

        # Confirm to user
        await self.send_to_user(user_id, WSMessage(
            type=WSMessageType.ROOM_JOINED,
            data={
                "room_id": room_id,
                "user_id": user_id,
                "members": list(self.rooms.get(room_id, set()))
            }
        ))

        logger.info(f"User {user_id} joined room {room_id}")
        return True

    async def leave_room(self, user_id: int, room_id: str):
        """
        Remove a user from a room.

        Args:
            user_id: User's ID
            room_id: Room identifier
        """
        async with self._lock:
            if room_id in self.rooms:
                self.rooms[room_id].discard(user_id)
                if not self.rooms[room_id]:
                    del self.rooms[room_id]

            if user_id in self.user_rooms:
                self.user_rooms[user_id].discard(room_id)

        # Notify remaining room members
        await self.send_to_room(room_id, WSMessage(
            type=WSMessageType.ROOM_LEFT,
            data={
                "room_id": room_id,
                "user_id": user_id
            }
        ))

        logger.info(f"User {user_id} left room {room_id}")

    def is_user_online(self, user_id: int) -> bool:
        """Check if a user is currently online"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_online_users(self) -> List[int]:
        """Get list of all online user IDs"""
        return list(self.active_connections.keys())

    def get_room_members(self, room_id: str) -> List[int]:
        """Get list of user IDs in a room"""
        return list(self.rooms.get(room_id, set()))

    async def update_user_activity(self, user_id: int, db: Session):
        """Update user's last activity timestamp"""
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            user.last_activity = datetime.now(timezone.utc)
            db.commit()


# Global connection manager instance
manager = ConnectionManager()


async def get_current_user_ws(token: str, db: Session) -> Optional[models.User]:
    """
    Authenticate user from WebSocket token.

    Args:
        token: JWT token
        db: Database session

    Returns:
        User model if authenticated, None otherwise
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            return None
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        return None

    user = db.query(models.User).filter(models.User.id == user_id).first()
    return user


async def handle_message(user: models.User, message_data: dict, db: Session):
    """
    Handle incoming message and persist to database.

    Args:
        user: The sender
        message_data: Message content and metadata
        db: Database session

    Returns:
        The created message model
    """
    receiver_id = message_data.get("receiver_id")
    content = message_data.get("content")
    message_type = message_data.get("message_type", "text")
    file_url = message_data.get("file_url")
    file_name = message_data.get("file_name")
    duration = message_data.get("duration")

    # Create message in database
    db_message = models.Message(
        sender_id=user.id,
        receiver_id=receiver_id,
        message_type=models.MessageType(message_type),
        content=content,
        file_url=file_url,
        file_name=file_name,
        duration=duration,
        is_read=False
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)

    # Get receiver for notification
    receiver = db.query(models.User).filter(models.User.id == receiver_id).first()

    # Prepare message for WebSocket
    ws_message_data = {
        "id": db_message.id,
        "sender_id": user.id,
        "sender_name": user.username,
        "sender_avatar": user.profile_picture,
        "sender_type": user.user_type.value,
        "receiver_id": receiver_id,
        "receiver_name": receiver.username if receiver else None,
        "message_type": message_type,
        "content": content,
        "file_url": file_url,
        "file_name": file_name,
        "duration": duration,
        "is_read": False,
        "created_at": db_message.created_at.isoformat(),
        "room_id": f"dm-{min(user.id, receiver_id)}-{max(user.id, receiver_id)}"
    }

    # Send to receiver
    await manager.send_to_user(receiver_id, WSMessage(
        type=WSMessageType.MESSAGE_NEW,
        data=ws_message_data
    ))

    # Send confirmation to sender
    await manager.send_to_user(user.id, WSMessage(
        type=WSMessageType.MESSAGE_DELIVERED,
        data={
            "message_id": db_message.id,
            "status": "delivered" if manager.is_user_online(receiver_id) else "sent"
        }
    ))

    return db_message


async def handle_typing(user: models.User, data: dict):
    """Handle typing indicator"""
    receiver_id = data.get("receiver_id")
    is_typing = data.get("is_typing", True)

    await manager.send_to_user(receiver_id, WSMessage(
        type=WSMessageType.TYPING_START if is_typing else WSMessageType.TYPING_STOP,
        data={
            "user_id": user.id,
            "username": user.username,
            "is_typing": is_typing,
            "room_id": f"dm-{min(user.id, receiver_id)}-{max(user.id, receiver_id)}"
        }
    ))


async def handle_read_receipt(user: models.User, data: dict, db: Session):
    """Handle message read receipt"""
    message_ids = data.get("message_ids", [])
    sender_id = data.get("sender_id")

    # Update messages as read
    db.query(models.Message).filter(
        models.Message.id.in_(message_ids),
        models.Message.receiver_id == user.id
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()

    # Notify sender
    if sender_id:
        await manager.send_to_user(sender_id, WSMessage(
            type=WSMessageType.MESSAGE_READ,
            data={
                "message_ids": message_ids,
                "reader_id": user.id,
                "reader_name": user.username
            }
        ))


async def handle_status_request(user: models.User, data: dict, db: Session):
    """Handle online status request for multiple users"""
    user_ids = data.get("user_ids", [])

    statuses = []
    for uid in user_ids:
        is_online = manager.is_user_online(uid)
        target_user = db.query(models.User).filter(models.User.id == uid).first()
        if target_user:
            statuses.append({
                "user_id": uid,
                "is_online": is_online,
                "last_seen": target_user.last_seen.isoformat() if target_user.last_seen else None
            })

    await manager.send_to_user(user.id, WSMessage(
        type=WSMessageType.USER_STATUS_RESPONSE,
        data={"statuses": statuses}
    ))


async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Main WebSocket endpoint handler.

    Handles:
    - Authentication via JWT token
    - Message routing
    - Typing indicators
    - Read receipts
    - Online status
    - Room management
    - Heartbeat/ping-pong
    """
    # Authenticate user
    user = await get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    # Connect user
    connected = await manager.connect(websocket, user.id, db)
    if not connected:
        return

    try:
        while True:
            # Receive message from client
            raw_data = await websocket.receive_text()

            try:
                message = WSMessage.from_json(raw_data)
            except json.JSONDecodeError:
                # Try parsing as simple message
                try:
                    data = json.loads(raw_data)
                    message = WSMessage(
                        type=data.get("type", "unknown"),
                        data=data.get("data", data)
                    )
                except:
                    await manager.send_to_user(user.id, WSMessage(
                        type=WSMessageType.ERROR,
                        data={"error": "Invalid message format"}
                    ))
                    continue

            # Handle different message types
            msg_type = message.type
            data = message.data

            if msg_type == WSMessageType.PING or msg_type == "ping":
                # Heartbeat
                await manager.update_user_activity(user.id, db)
                await websocket.send_text(WSMessage(
                    type=WSMessageType.PONG,
                    data={}
                ).to_json())

            elif msg_type == WSMessageType.MESSAGE_SEND or msg_type == "message:send" or msg_type == "message":
                # New message
                await handle_message(user, data, db)

            elif msg_type in [WSMessageType.TYPING_START, WSMessageType.TYPING_STOP, "typing:start", "typing:stop", "typing"]:
                # Typing indicator
                is_typing = msg_type in [WSMessageType.TYPING_START, "typing:start", "typing"] and data.get("is_typing", True)
                data["is_typing"] = is_typing
                await handle_typing(user, data)

            elif msg_type == WSMessageType.MESSAGE_READ or msg_type == "message:read" or msg_type == "read":
                # Read receipt
                await handle_read_receipt(user, data, db)

            elif msg_type == WSMessageType.USER_STATUS_REQUEST or msg_type == "user:status":
                # Online status request
                await handle_status_request(user, data, db)

            elif msg_type == WSMessageType.ROOM_JOIN or msg_type == "room:join":
                # Join room
                room_id = data.get("room_id")
                if room_id:
                    await manager.join_room(user.id, room_id)

            elif msg_type == WSMessageType.ROOM_LEAVE or msg_type == "room:leave":
                # Leave room
                room_id = data.get("room_id")
                if room_id:
                    await manager.leave_room(user.id, room_id)

            else:
                logger.warning(f"Unknown message type from user {user.id}: {msg_type}")

    except WebSocketDisconnect:
        await manager.disconnect(websocket, user.id, db)

    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        await manager.disconnect(websocket, user.id, db)


# Helper function to send notifications from other parts of the app
async def send_notification(user_id: int, notification_type: str, data: dict):
    """
    Send a notification to a user via WebSocket.

    Args:
        user_id: Target user's ID
        notification_type: Type of notification (e.g., 'friend_request', 'promotion')
        data: Notification data
    """
    await manager.send_to_user(user_id, WSMessage(
        type=WSMessageType.NOTIFICATION,
        data={
            "notification_type": notification_type,
            **data
        }
    ))


async def send_friend_request_notification(to_user_id: int, from_user: models.User):
    """Send friend request notification"""
    await manager.send_to_user(to_user_id, WSMessage(
        type=WSMessageType.FRIEND_REQUEST,
        data={
            "from_user_id": from_user.id,
            "from_username": from_user.username,
            "from_user_type": from_user.user_type.value,
            "from_profile_picture": from_user.profile_picture
        }
    ))


async def send_friend_accepted_notification(to_user_id: int, friend: models.User):
    """Send friend accepted notification"""
    await manager.send_to_user(to_user_id, WSMessage(
        type=WSMessageType.FRIEND_ACCEPTED,
        data={
            "friend_id": friend.id,
            "friend_username": friend.username,
            "friend_user_type": friend.user_type.value,
            "friend_profile_picture": friend.profile_picture
        }
    ))

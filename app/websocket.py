from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, List
import json
from datetime import datetime, timezone
from app.database import get_db
from app import auth, models
from jose import JWTError, jwt
from app.config import settings

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int, db: Session):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

        # Update user online status in database
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            user.is_online = True
            user.last_activity = datetime.now(timezone.utc)
            db.commit()

    async def disconnect(self, websocket: WebSocket, user_id: int, db: Session):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

                # Update user offline status in database
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if user:
                    user.is_online = False
                    user.last_seen = datetime.now(timezone.utc)
                    db.commit()

    async def update_user_activity(self, user_id: int, db: Session):
        """Update user's last activity timestamp"""
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            user.last_activity = datetime.now(timezone.utc)
            db.commit()

    async def send_personal_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except:
                    # Connection might be closed
                    pass

    async def broadcast_to_user(self, data: dict, user_id: int):
        message = json.dumps(data)
        await self.send_personal_message(message, user_id)

    def is_user_online(self, user_id: int) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_online_users(self) -> List[int]:
        return list(self.active_connections.keys())

manager = ConnectionManager()

async def get_current_user_ws(token: str, db: Session):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            return None
    except JWTError:
        return None

    user = db.query(models.User).filter(models.User.id == user_id).first()
    return user

async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    # Authenticate user
    user = await get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(websocket, user.id, db)

    # Notify friends that user is online
    for friend in user.friends:
        await manager.broadcast_to_user({
            "type": "user_online",
            "user_id": user.id,
            "username": user.username,
            "user_type": user.user_type.value
        }, friend.id)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)

            # Handle different message types
            if message_data.get("type") == "ping":
                # Heartbeat - update user activity
                await manager.update_user_activity(user.id, db)
                await websocket.send_text(json.dumps({"type": "pong"}))

            elif message_data.get("type") == "message":
                # New message notification
                receiver_id = message_data.get("receiver_id")

                # Send notification to receiver if online
                await manager.broadcast_to_user({
                    "type": "new_message",
                    "sender_id": user.id,
                    "sender_name": user.username,
                    "message_type": message_data.get("message_type"),
                    "content": message_data.get("content"),
                    "timestamp": message_data.get("timestamp")
                }, receiver_id)

            elif message_data.get("type") == "typing":
                # Typing indicator
                receiver_id = message_data.get("receiver_id")
                await manager.broadcast_to_user({
                    "type": "typing",
                    "user_id": user.id,
                    "username": user.username,
                    "is_typing": message_data.get("is_typing", True)
                }, receiver_id)

            elif message_data.get("type") == "read":
                # Message read notification
                sender_id = message_data.get("sender_id")
                await manager.broadcast_to_user({
                    "type": "message_read",
                    "reader_id": user.id,
                    "message_id": message_data.get("message_id")
                }, sender_id)

    except WebSocketDisconnect:
        await manager.disconnect(websocket, user.id, db)
        # Notify friends that user is offline
        for friend in user.friends:
            await manager.broadcast_to_user({
                "type": "user_offline",
                "user_id": user.id,
                "username": user.username
            }, friend.id)

    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.disconnect(websocket, user.id, db)
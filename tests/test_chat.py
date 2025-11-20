"""
Test suite for chat router endpoints
"""
import pytest
from fastapi import status
from io import BytesIO
from app.models import Message, MessageType


class TestSendTextMessage:
    """Test sending text messages"""

    def test_send_text_message_success(self, client, auth_headers_player, test_player, create_test_user, make_friends, db):
        """Test successfully sending a text message"""
        friend = create_test_user(username="chatfriend")
        make_friends(test_player, friend)

        response = client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={
                "receiver_id": friend.id,
                "content": "Hello friend!"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["sender_id"] == test_player.id
        assert data["receiver_id"] == friend.id
        assert data["message_type"] == "text"
        assert data["content"] == "Hello friend!"
        assert data["is_read"] == False

        # Verify in database
        message = db.query(Message).filter(
            Message.sender_id == test_player.id,
            Message.receiver_id == friend.id
        ).first()
        assert message is not None
        assert message.message_type == MessageType.TEXT

    def test_send_text_message_to_non_friend(self, client, auth_headers_player, create_test_user):
        """Test cannot send message to non-friend"""
        non_friend = create_test_user(username="nonfriend")

        response = client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={
                "receiver_id": non_friend.id,
                "content": "Hi there"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "only send messages to friends" in response.json()["detail"]

    def test_send_text_message_to_nonexistent_user(self, client, auth_headers_player):
        """Test sending message to non-existent user fails"""
        response = client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={
                "receiver_id": 99999,
                "content": "Hello?"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_send_text_message_requires_auth(self, client, create_test_user):
        """Test authentication is required"""
        friend = create_test_user(username="friend")

        response = client.post(
            "/chat/send/text",
            data={
                "receiver_id": friend.id,
                "content": "Unauthorized"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_send_text_message_empty_content(self, client, auth_headers_player, test_player, create_test_user, make_friends):
        """Test sending message with empty content"""
        friend = create_test_user(username="friend2")
        make_friends(test_player, friend)

        response = client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={
                "receiver_id": friend.id,
                "content": ""
            }
        )

        # Empty content is technically allowed
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]


class TestSendImageMessage:
    """Test sending image messages"""

    def test_send_image_message_success_jpeg(self, client, auth_headers_player, test_player, create_test_user, make_friends, db):
        """Test successfully sending a JPEG image"""
        friend = create_test_user(username="imagefriend")
        make_friends(test_player, friend)

        # Create fake image file
        fake_image = BytesIO(b"fake jpeg image content")
        fake_image.name = "test.jpg"

        response = client.post(
            "/chat/send/image",
            headers=auth_headers_player,
            data={"receiver_id": friend.id},
            files={"file": ("test.jpg", fake_image, "image/jpeg")}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message_type"] == "image"
        assert data["file_url"] is not None
        assert data["file_name"] == "test.jpg"

    def test_send_image_message_success_png(self, client, auth_headers_player, test_player, create_test_user, make_friends):
        """Test successfully sending a PNG image"""
        friend = create_test_user(username="pngfriend")
        make_friends(test_player, friend)

        fake_image = BytesIO(b"fake png image content")

        response = client.post(
            "/chat/send/image",
            headers=auth_headers_player,
            data={"receiver_id": friend.id},
            files={"file": ("test.png", fake_image, "image/png")}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message_type"] == "image"

    def test_send_image_invalid_format(self, client, auth_headers_player, test_player, create_test_user, make_friends):
        """Test sending invalid image format fails"""
        friend = create_test_user(username="invalidfriend")
        make_friends(test_player, friend)

        fake_file = BytesIO(b"fake pdf content")

        response = client.post(
            "/chat/send/image",
            headers=auth_headers_player,
            data={"receiver_id": friend.id},
            files={"file": ("test.pdf", fake_file, "application/pdf")}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid image format" in response.json()["detail"]

    def test_send_image_to_non_friend(self, client, auth_headers_player, create_test_user):
        """Test cannot send image to non-friend"""
        non_friend = create_test_user(username="nonfriend2")

        fake_image = BytesIO(b"fake image")

        response = client.post(
            "/chat/send/image",
            headers=auth_headers_player,
            data={"receiver_id": non_friend.id},
            files={"file": ("test.jpg", fake_image, "image/jpeg")}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_send_image_requires_auth(self, client, create_test_user):
        """Test authentication is required"""
        friend = create_test_user(username="imagefriend2")
        fake_image = BytesIO(b"fake image")

        response = client.post(
            "/chat/send/image",
            data={"receiver_id": friend.id},
            files={"file": ("test.jpg", fake_image, "image/jpeg")}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestSendVoiceMessage:
    """Test sending voice messages"""

    def test_send_voice_message_success(self, client, auth_headers_player, test_player, create_test_user, make_friends, db):
        """Test successfully sending a voice message"""
        friend = create_test_user(username="voicefriend")
        make_friends(test_player, friend)

        fake_audio = BytesIO(b"fake webm audio content")

        response = client.post(
            "/chat/send/voice",
            headers=auth_headers_player,
            data={"receiver_id": friend.id, "duration": 15},
            files={"file": ("voice.webm", fake_audio, "audio/webm")}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["message_type"] == "voice"
        assert data["duration"] == 15
        assert data["file_url"] is not None

    def test_send_voice_message_various_formats(self, client, auth_headers_player, test_player, create_test_user, make_friends):
        """Test sending voice in different audio formats"""
        friend = create_test_user(username="audiofriend")
        make_friends(test_player, friend)

        formats = [
            ("audio/webm", "voice.webm"),
            ("audio/mp4", "voice.mp4"),
            ("audio/mpeg", "voice.mp3"),
            ("audio/ogg", "voice.ogg"),
            ("audio/wav", "voice.wav")
        ]

        for content_type, filename in formats:
            fake_audio = BytesIO(b"fake audio content")

            response = client.post(
                "/chat/send/voice",
                headers=auth_headers_player,
                data={"receiver_id": friend.id, "duration": 10},
                files={"file": (filename, fake_audio, content_type)}
            )

            assert response.status_code == status.HTTP_200_OK, f"Failed for {content_type}"

    def test_send_voice_invalid_format(self, client, auth_headers_player, test_player, create_test_user, make_friends):
        """Test sending invalid audio format fails"""
        friend = create_test_user(username="invalidvoice")
        make_friends(test_player, friend)

        fake_file = BytesIO(b"fake video content")

        response = client.post(
            "/chat/send/voice",
            headers=auth_headers_player,
            data={"receiver_id": friend.id, "duration": 5},
            files={"file": ("video.mp4", fake_file, "video/mp4")}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid audio format" in response.json()["detail"]

    def test_send_voice_to_non_friend(self, client, auth_headers_player, create_test_user):
        """Test cannot send voice to non-friend"""
        non_friend = create_test_user(username="nonfriend3")

        fake_audio = BytesIO(b"fake audio")

        response = client.post(
            "/chat/send/voice",
            headers=auth_headers_player,
            data={"receiver_id": non_friend.id, "duration": 5},
            files={"file": ("voice.webm", fake_audio, "audio/webm")}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestGetConversations:
    """Test getting conversation list"""

    def test_get_conversations(self, client, auth_headers_player, test_player, create_test_user, make_friends, db):
        """Test getting list of conversations"""
        friend1 = create_test_user(username="conv1")
        friend2 = create_test_user(username="conv2")

        make_friends(test_player, friend1)
        make_friends(test_player, friend2)

        # Send messages
        client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={"receiver_id": friend1.id, "content": "Hi friend1"}
        )
        client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={"receiver_id": friend2.id, "content": "Hi friend2"}
        )

        response = client.get("/chat/conversations", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 2
        # Verify structure
        assert all("friend" in conv for conv in data)
        assert all("last_message" in conv for conv in data)
        assert all("unread_count" in conv for conv in data)

    def test_get_conversations_sorted_by_latest(self, client, auth_headers_player, test_player, create_test_user, make_friends, db):
        """Test conversations are sorted by latest message"""
        friend1 = create_test_user(username="sortfriend1")
        friend2 = create_test_user(username="sortfriend2")

        make_friends(test_player, friend1)
        make_friends(test_player, friend2)

        # Send to friend1 first
        client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={"receiver_id": friend1.id, "content": "First message"}
        )

        # Then send to friend2 (should be at top)
        client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={"receiver_id": friend2.id, "content": "Latest message"}
        )

        response = client.get("/chat/conversations", headers=auth_headers_player)

        data = response.json()
        # Most recent conversation should be first
        if len(data) >= 2:
            assert data[0]["friend"]["id"] == friend2.id

    def test_get_conversations_unread_count(self, client, auth_headers_player, test_player, create_test_user, make_friends, test_password, db):
        """Test unread count in conversations"""
        friend = create_test_user(username="unreadfriend")
        make_friends(test_player, friend)

        # Login as friend and send messages
        friend_response = client.post("/auth/login", data={
            "username": friend.username,
            "password": test_password
        })
        friend_headers = {"Authorization": f"Bearer {friend_response.json()['access_token']}"}

        # Send 2 unread messages
        client.post(
            "/chat/send/text",
            headers=friend_headers,
            data={"receiver_id": test_player.id, "content": "Unread 1"}
        )
        client.post(
            "/chat/send/text",
            headers=friend_headers,
            data={"receiver_id": test_player.id, "content": "Unread 2"}
        )

        response = client.get("/chat/conversations", headers=auth_headers_player)

        data = response.json()
        friend_conv = next((c for c in data if c["friend"]["id"] == friend.id), None)
        assert friend_conv is not None
        assert friend_conv["unread_count"] == 2

    def test_get_conversations_empty(self, client, auth_headers_player):
        """Test getting conversations when none exist"""
        response = client.get("/chat/conversations", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_get_conversations_requires_auth(self, client):
        """Test authentication is required"""
        response = client.get("/chat/conversations")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestGetMessages:
    """Test getting messages with a friend"""

    def test_get_messages_success(self, client, auth_headers_player, test_player, create_test_user, make_friends, db):
        """Test getting messages with a friend"""
        friend = create_test_user(username="msgfriend")
        make_friends(test_player, friend)

        # Send some messages
        for i in range(3):
            client.post(
                "/chat/send/text",
                headers=auth_headers_player,
                data={"receiver_id": friend.id, "content": f"Message {i}"}
            )

        response = client.get(f"/chat/messages/{friend.id}", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "messages" in data
        assert "unread_count" in data
        assert len(data["messages"]) >= 3

    def test_get_messages_chronological_order(self, client, auth_headers_player, test_player, create_test_user, make_friends, db):
        """Test messages are returned in chronological order"""
        friend = create_test_user(username="chronofriend")
        make_friends(test_player, friend)

        # Send messages in order
        messages_content = ["First", "Second", "Third"]
        for content in messages_content:
            client.post(
                "/chat/send/text",
                headers=auth_headers_player,
                data={"receiver_id": friend.id, "content": content}
            )

        response = client.get(f"/chat/messages/{friend.id}", headers=auth_headers_player)

        data = response.json()
        messages = data["messages"]
        # Should be in chronological order (oldest first)
        assert messages[0]["content"] == "First"
        assert messages[-1]["content"] == "Third"

    def test_get_messages_marks_as_read(self, client, auth_headers_player, test_player, create_test_user, make_friends, test_password, db):
        """Test getting messages marks them as read"""
        friend = create_test_user(username="readfriend")
        make_friends(test_player, friend)

        # Friend sends unread message
        friend_response = client.post("/auth/login", data={
            "username": friend.username,
            "password": test_password
        })
        friend_headers = {"Authorization": f"Bearer {friend_response.json()['access_token']}"}

        msg_response = client.post(
            "/chat/send/text",
            headers=friend_headers,
            data={"receiver_id": test_player.id, "content": "Unread"}
        )
        message_id = msg_response.json()["id"]

        # Get messages (should mark as read)
        client.get(f"/chat/messages/{friend.id}", headers=auth_headers_player)

        # Verify marked as read
        message = db.query(Message).filter(Message.id == message_id).first()
        assert message.is_read == True

    def test_get_messages_pagination(self, client, auth_headers_player, test_player, create_test_user, make_friends):
        """Test message pagination"""
        friend = create_test_user(username="paginfriend")
        make_friends(test_player, friend)

        # Send 10 messages
        for i in range(10):
            client.post(
                "/chat/send/text",
                headers=auth_headers_player,
                data={"receiver_id": friend.id, "content": f"Message {i}"}
            )

        # Get first 5
        response = client.get(f"/chat/messages/{friend.id}?skip=0&limit=5", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["messages"]) == 5

    def test_get_messages_to_non_friend(self, client, auth_headers_player, create_test_user):
        """Test cannot get messages with non-friend"""
        non_friend = create_test_user(username="nonfriend4")

        response = client.get(f"/chat/messages/{non_friend.id}", headers=auth_headers_player)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_messages_requires_auth(self, client, create_test_user):
        """Test authentication is required"""
        friend = create_test_user(username="authmsg")

        response = client.get(f"/chat/messages/{friend.id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestMarkMessageRead:
    """Test marking individual message as read"""

    def test_mark_message_read(self, client, auth_headers_player, test_player, create_test_user, make_friends, test_password, db):
        """Test marking a message as read"""
        friend = create_test_user(username="markfriend")
        make_friends(test_player, friend)

        # Friend sends message
        friend_response = client.post("/auth/login", data={
            "username": friend.username,
            "password": test_password
        })
        friend_headers = {"Authorization": f"Bearer {friend_response.json()['access_token']}"}

        msg_response = client.post(
            "/chat/send/text",
            headers=friend_headers,
            data={"receiver_id": test_player.id, "content": "Mark me"}
        )
        message_id = msg_response.json()["id"]

        # Mark as read
        response = client.put(f"/chat/messages/{message_id}/read", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK

        # Verify in database
        message = db.query(Message).filter(Message.id == message_id).first()
        assert message.is_read == True

    def test_mark_message_read_not_receiver(self, client, auth_headers_player, test_player, create_test_user, make_friends, db):
        """Test cannot mark message as read if not receiver"""
        friend = create_test_user(username="notreceiver")
        make_friends(test_player, friend)

        # test_player sends message to friend
        msg_response = client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={"receiver_id": friend.id, "content": "Sent"}
        )
        message_id = msg_response.json()["id"]

        # test_player tries to mark their own sent message as read
        response = client.put(f"/chat/messages/{message_id}/read", headers=auth_headers_player)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mark_message_read_not_found(self, client, auth_headers_player):
        """Test marking non-existent message fails"""
        response = client.put("/chat/messages/99999/read", headers=auth_headers_player)

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestDeleteMessage:
    """Test deleting messages"""

    def test_delete_message_success(self, client, auth_headers_player, test_player, create_test_user, make_friends, db):
        """Test successfully deleting a message"""
        friend = create_test_user(username="delfriend")
        make_friends(test_player, friend)

        # Send message
        msg_response = client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={"receiver_id": friend.id, "content": "Delete me"}
        )
        message_id = msg_response.json()["id"]

        # Delete message
        response = client.delete(f"/chat/messages/{message_id}", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK

        # Verify deleted from database
        message = db.query(Message).filter(Message.id == message_id).first()
        assert message is None

    def test_delete_message_not_sender(self, client, auth_headers_player, test_player, create_test_user, make_friends, test_password):
        """Test cannot delete message if not sender"""
        friend = create_test_user(username="notsender")
        make_friends(test_player, friend)

        # Friend sends message
        friend_response = client.post("/auth/login", data={
            "username": friend.username,
            "password": test_password
        })
        friend_headers = {"Authorization": f"Bearer {friend_response.json()['access_token']}"}

        msg_response = client.post(
            "/chat/send/text",
            headers=friend_headers,
            data={"receiver_id": test_player.id, "content": "Can't delete"}
        )
        message_id = msg_response.json()["id"]

        # test_player tries to delete friend's message
        response = client.delete(f"/chat/messages/{message_id}", headers=auth_headers_player)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_message_not_found(self, client, auth_headers_player):
        """Test deleting non-existent message fails"""
        response = client.delete("/chat/messages/99999", headers=auth_headers_player)

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestMessageStats:
    """Test message statistics"""

    def test_get_message_stats(self, client, auth_headers_player, test_player, create_test_user, make_friends, test_password):
        """Test getting message statistics"""
        friend = create_test_user(username="statfriend")
        make_friends(test_player, friend)

        # Send messages
        client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={"receiver_id": friend.id, "content": "Sent 1"}
        )
        client.post(
            "/chat/send/text",
            headers=auth_headers_player,
            data={"receiver_id": friend.id, "content": "Sent 2"}
        )

        # Friend sends message
        friend_response = client.post("/auth/login", data={
            "username": friend.username,
            "password": test_password
        })
        friend_headers = {"Authorization": f"Bearer {friend_response.json()['access_token']}"}

        client.post(
            "/chat/send/text",
            headers=friend_headers,
            data={"receiver_id": test_player.id, "content": "Received 1"}
        )

        response = client.get("/chat/stats", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "messages_sent" in data
        assert "messages_received" in data
        assert "total_messages" in data
        assert "unread_messages" in data
        assert "unique_conversations" in data
        assert data["messages_sent"] >= 2
        assert data["messages_received"] >= 1
        assert data["unread_messages"] >= 1

    def test_get_message_stats_empty(self, client, auth_headers_player):
        """Test stats when no messages exist"""
        response = client.get("/chat/stats", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["messages_sent"] == 0
        assert data["messages_received"] == 0
        assert data["total_messages"] == 0

    def test_get_message_stats_requires_auth(self, client):
        """Test authentication is required"""
        response = client.get("/chat/stats")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

"""
Test suite for friends router endpoints
"""
import pytest
from fastapi import status
from app.models import FriendRequest, FriendRequestStatus


class TestSendFriendRequest:
    """Test sending friend requests"""

    def test_send_friend_request_success(self, client, auth_headers_player, test_player, create_test_user, db):
        """Test successful friend request send"""
        receiver = create_test_user(username="receiver")

        response = client.post(
            "/friends/request",
            headers=auth_headers_player,
            json={"receiver_user_id": receiver.user_id}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["sender_id"] == test_player.id
        assert data["receiver_id"] == receiver.id
        assert data["status"] == "pending"

        # Verify in database
        request_obj = db.query(FriendRequest).filter(
            FriendRequest.sender_id == test_player.id,
            FriendRequest.receiver_id == receiver.id
        ).first()
        assert request_obj is not None
        assert request_obj.status == FriendRequestStatus.PENDING

    def test_send_friend_request_user_not_found(self, client, auth_headers_player):
        """Test sending request to non-existent user fails"""
        response = client.post(
            "/friends/request",
            headers=auth_headers_player,
            json={"receiver_user_id": "INVALID1"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "User not found" in response.json()["detail"]

    def test_send_friend_request_to_self(self, client, auth_headers_player, test_player):
        """Test cannot send friend request to yourself"""
        response = client.post(
            "/friends/request",
            headers=auth_headers_player,
            json={"receiver_user_id": test_player.user_id}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot send friend request to yourself" in response.json()["detail"]

    def test_send_friend_request_already_friends(self, client, auth_headers_player, test_player, create_test_user, make_friends):
        """Test cannot send request to existing friend"""
        friend = create_test_user(username="existing_friend")
        make_friends(test_player, friend)

        response = client.post(
            "/friends/request",
            headers=auth_headers_player,
            json={"receiver_user_id": friend.user_id}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Already friends" in response.json()["detail"]

    def test_send_duplicate_friend_request(self, client, auth_headers_player, create_test_user, db):
        """Test cannot send duplicate friend request"""
        receiver = create_test_user(username="receiver2")

        # Send first request
        response1 = client.post(
            "/friends/request",
            headers=auth_headers_player,
            json={"receiver_user_id": receiver.user_id}
        )
        assert response1.status_code == status.HTTP_200_OK

        # Try to send again
        response2 = client.post(
            "/friends/request",
            headers=auth_headers_player,
            json={"receiver_user_id": receiver.user_id}
        )

        assert response2.status_code == status.HTTP_400_BAD_REQUEST
        assert "Friend request already exists" in response2.json()["detail"]

    def test_send_friend_request_blocks_reverse_request(self, client, test_player, create_test_user, test_password, db):
        """Test cannot send request if reverse request exists"""
        receiver = create_test_user(username="receiver3")

        # Receiver sends request to test_player
        receiver_response = client.post("/auth/login", data={
            "username": receiver.username,
            "password": test_password
        })
        receiver_token = receiver_response.json()["access_token"]
        receiver_headers = {"Authorization": f"Bearer {receiver_token}"}

        client.post(
            "/friends/request",
            headers=receiver_headers,
            json={"receiver_user_id": test_player.user_id}
        )

        # Now test_player tries to send reverse request
        response = client.post(
            "/friends/request",
            headers={"Authorization": f"Bearer {client.post('/auth/login', data={'username': test_player.username, 'password': test_password}).json()['access_token']}"},
            json={"receiver_user_id": receiver.user_id}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Friend request already exists" in response.json()["detail"]

    def test_send_friend_request_requires_auth(self, client, create_test_user):
        """Test authentication is required"""
        receiver = create_test_user(username="receiver4")

        response = client.post(
            "/friends/request",
            json={"receiver_user_id": receiver.user_id}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestGetSentFriendRequests:
    """Test getting sent friend requests"""

    def test_get_sent_requests(self, client, auth_headers_player, test_player, create_test_user, db):
        """Test getting list of sent friend requests"""
        # Create receivers and send requests
        receiver1 = create_test_user(username="receiver5")
        receiver2 = create_test_user(username="receiver6")

        client.post(
            "/friends/request",
            headers=auth_headers_player,
            json={"receiver_user_id": receiver1.user_id}
        )
        client.post(
            "/friends/request",
            headers=auth_headers_player,
            json={"receiver_user_id": receiver2.user_id}
        )

        response = client.get("/friends/requests/sent", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 2
        sender_ids = [req["sender_id"] for req in data]
        assert all(sid == test_player.id for sid in sender_ids)

    def test_get_sent_requests_empty(self, client, auth_headers_player):
        """Test getting sent requests when none exist"""
        response = client.get("/friends/requests/sent", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_get_sent_requests_includes_all_statuses(self, client, auth_headers_player, test_player, create_test_user, db):
        """Test sent requests include all statuses (pending, accepted, rejected)"""
        receiver = create_test_user(username="receiver7")

        # Send request
        req_response = client.post(
            "/friends/request",
            headers=auth_headers_player,
            json={"receiver_user_id": receiver.user_id}
        )
        request_id = req_response.json()["id"]

        # Receiver rejects it
        friend_request = db.query(FriendRequest).filter(FriendRequest.id == request_id).first()
        friend_request.status = FriendRequestStatus.REJECTED
        db.commit()

        # Should still appear in sent requests
        response = client.get("/friends/requests/sent", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        request_ids = [req["id"] for req in data]
        assert request_id in request_ids

    def test_get_sent_requests_requires_auth(self, client):
        """Test authentication is required"""
        response = client.get("/friends/requests/sent")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestGetReceivedFriendRequests:
    """Test getting received friend requests"""

    def test_get_received_requests(self, client, auth_headers_player, test_player, create_test_user, test_password, db):
        """Test getting list of received friend requests"""
        # Create senders and send requests to test_player
        sender1 = create_test_user(username="sender1")
        sender2 = create_test_user(username="sender2")

        # Sender1 sends request
        sender1_response = client.post("/auth/login", data={
            "username": sender1.username,
            "password": test_password
        })
        sender1_headers = {"Authorization": f"Bearer {sender1_response.json()['access_token']}"}

        client.post(
            "/friends/request",
            headers=sender1_headers,
            json={"receiver_user_id": test_player.user_id}
        )

        # Sender2 sends request
        sender2_response = client.post("/auth/login", data={
            "username": sender2.username,
            "password": test_password
        })
        sender2_headers = {"Authorization": f"Bearer {sender2_response.json()['access_token']}"}

        client.post(
            "/friends/request",
            headers=sender2_headers,
            json={"receiver_user_id": test_player.user_id}
        )

        # Get received requests
        response = client.get("/friends/requests/received", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 2
        receiver_ids = [req["receiver_id"] for req in data]
        assert all(rid == test_player.id for rid in receiver_ids)
        statuses = [req["status"] for req in data]
        assert all(s == "pending" for s in statuses)

    def test_get_received_requests_only_pending(self, client, auth_headers_player, test_player, create_test_user, test_password, db):
        """Test received requests only shows pending status"""
        sender = create_test_user(username="sender3")

        # Sender sends request
        sender_response = client.post("/auth/login", data={
            "username": sender.username,
            "password": test_password
        })
        sender_headers = {"Authorization": f"Bearer {sender_response.json()['access_token']}"}

        req_response = client.post(
            "/friends/request",
            headers=sender_headers,
            json={"receiver_user_id": test_player.user_id}
        )
        request_id = req_response.json()["id"]

        # Accept the request
        client.put(
            f"/friends/requests/{request_id}",
            headers=auth_headers_player,
            json={"status": "accepted"}
        )

        # Should NOT appear in received requests anymore
        response = client.get("/friends/requests/received", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        request_ids = [req["id"] for req in data]
        assert request_id not in request_ids

    def test_get_received_requests_empty(self, client, auth_headers_player):
        """Test getting received requests when none exist"""
        response = client.get("/friends/requests/received", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

    def test_get_received_requests_requires_auth(self, client):
        """Test authentication is required"""
        response = client.get("/friends/requests/received")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestUpdateFriendRequest:
    """Test accepting/rejecting friend requests"""

    def test_accept_friend_request(self, client, auth_headers_player, test_player, create_test_user, test_password, db):
        """Test accepting a friend request"""
        sender = create_test_user(username="sender4")

        # Sender sends request
        sender_response = client.post("/auth/login", data={
            "username": sender.username,
            "password": test_password
        })
        sender_headers = {"Authorization": f"Bearer {sender_response.json()['access_token']}"}

        req_response = client.post(
            "/friends/request",
            headers=sender_headers,
            json={"receiver_user_id": test_player.user_id}
        )
        request_id = req_response.json()["id"]

        # Accept the request
        response = client.put(
            f"/friends/requests/{request_id}",
            headers=auth_headers_player,
            json={"status": "accepted"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "accepted"

        # Verify they are now friends
        db.refresh(test_player)
        db.refresh(sender)
        assert sender in test_player.friends
        assert test_player in sender.friends

    def test_reject_friend_request(self, client, auth_headers_player, test_player, create_test_user, test_password, db):
        """Test rejecting a friend request"""
        sender = create_test_user(username="sender5")

        # Sender sends request
        sender_response = client.post("/auth/login", data={
            "username": sender.username,
            "password": test_password
        })
        sender_headers = {"Authorization": f"Bearer {sender_response.json()['access_token']}"}

        req_response = client.post(
            "/friends/request",
            headers=sender_headers,
            json={"receiver_user_id": test_player.user_id}
        )
        request_id = req_response.json()["id"]

        # Reject the request
        response = client.put(
            f"/friends/requests/{request_id}",
            headers=auth_headers_player,
            json={"status": "rejected"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "rejected"

        # Verify they are NOT friends
        db.refresh(test_player)
        db.refresh(sender)
        assert sender not in test_player.friends
        assert test_player not in sender.friends

    def test_update_request_not_found(self, client, auth_headers_player):
        """Test updating non-existent request fails"""
        response = client.put(
            "/friends/requests/99999",
            headers=auth_headers_player,
            json={"status": "accepted"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Friend request not found" in response.json()["detail"]

    def test_update_request_not_receiver(self, client, auth_headers_player, create_test_user, test_password, db):
        """Test cannot update request if not the receiver"""
        sender = create_test_user(username="sender6")
        receiver = create_test_user(username="receiver8")

        # Sender sends request to receiver (not test_player)
        sender_response = client.post("/auth/login", data={
            "username": sender.username,
            "password": test_password
        })
        sender_headers = {"Authorization": f"Bearer {sender_response.json()['access_token']}"}

        req_response = client.post(
            "/friends/request",
            headers=sender_headers,
            json={"receiver_user_id": receiver.user_id}
        )
        request_id = req_response.json()["id"]

        # test_player tries to update it (but is not the receiver)
        response = client.put(
            f"/friends/requests/{request_id}",
            headers=auth_headers_player,
            json={"status": "accepted"}
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_already_processed_request(self, client, auth_headers_player, test_player, create_test_user, test_password, db):
        """Test cannot update already processed request"""
        sender = create_test_user(username="sender7")

        # Sender sends request
        sender_response = client.post("/auth/login", data={
            "username": sender.username,
            "password": test_password
        })
        sender_headers = {"Authorization": f"Bearer {sender_response.json()['access_token']}"}

        req_response = client.post(
            "/friends/request",
            headers=sender_headers,
            json={"receiver_user_id": test_player.user_id}
        )
        request_id = req_response.json()["id"]

        # Accept the request
        client.put(
            f"/friends/requests/{request_id}",
            headers=auth_headers_player,
            json={"status": "accepted"}
        )

        # Try to update again
        response = client.put(
            f"/friends/requests/{request_id}",
            headers=auth_headers_player,
            json={"status": "rejected"}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already processed" in response.json()["detail"]

    def test_update_request_requires_auth(self, client):
        """Test authentication is required"""
        response = client.put(
            "/friends/requests/1",
            json={"status": "accepted"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestGetFriendsList:
    """Test getting friends list"""

    def test_get_friends_list(self, client, auth_headers_player, test_player, create_test_user, make_friends):
        """Test getting list of friends"""
        friend1 = create_test_user(username="friend1")
        friend2 = create_test_user(username="friend2")

        make_friends(test_player, friend1)
        make_friends(test_player, friend2)

        response = client.get("/friends/list", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "friends" in data
        assert len(data["friends"]) >= 2
        usernames = [f["username"] for f in data["friends"]]
        assert "friend1" in usernames
        assert "friend2" in usernames

    def test_get_friends_list_empty(self, client, auth_headers_player):
        """Test getting friends list when empty"""
        response = client.get("/friends/list", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "friends" in data
        assert isinstance(data["friends"], list)

    def test_get_friends_list_requires_auth(self, client):
        """Test authentication is required"""
        response = client.get("/friends/list")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestRemoveFriend:
    """Test removing friends"""

    def test_remove_friend_success(self, client, auth_headers_player, test_player, create_test_user, make_friends, db):
        """Test successfully removing a friend"""
        friend = create_test_user(username="friend3")
        make_friends(test_player, friend)

        response = client.delete(f"/friends/{friend.id}", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        assert "Friend removed successfully" in response.json()["message"]

        # Verify friendship removed
        db.refresh(test_player)
        db.refresh(friend)
        assert friend not in test_player.friends
        assert test_player not in friend.friends

    def test_remove_friend_not_found(self, client, auth_headers_player):
        """Test removing non-existent user fails"""
        response = client.delete("/friends/99999", headers=auth_headers_player)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "User not found" in response.json()["detail"]

    def test_remove_friend_not_in_list(self, client, auth_headers_player, create_test_user):
        """Test removing user who is not a friend fails"""
        non_friend = create_test_user(username="nonfriend")

        response = client.delete(f"/friends/{non_friend.id}", headers=auth_headers_player)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not in your friends list" in response.json()["detail"]

    def test_remove_friend_bidirectional(self, client, auth_headers_player, test_player, create_test_user, make_friends, db):
        """Test that remove friend removes from both sides"""
        friend = create_test_user(username="friend4")
        make_friends(test_player, friend)

        # Verify friendship exists
        db.refresh(test_player)
        db.refresh(friend)
        assert friend in test_player.friends
        assert test_player in friend.friends

        # Remove friend
        client.delete(f"/friends/{friend.id}", headers=auth_headers_player)

        # Verify removed from both sides
        db.refresh(test_player)
        db.refresh(friend)
        assert friend not in test_player.friends
        assert test_player not in friend.friends

    def test_remove_friend_requires_auth(self, client, create_test_user):
        """Test authentication is required"""
        friend = create_test_user(username="friend5")

        response = client.delete(f"/friends/{friend.id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestFriendshipWorkflow:
    """Test complete friendship workflow"""

    def test_complete_friendship_flow(self, client, test_player, create_test_user, test_password, db):
        """Test complete flow: request -> accept -> list -> remove"""
        receiver = create_test_user(username="flowtest")

        # Login as test_player
        player_response = client.post("/auth/login", data={
            "username": test_player.username,
            "password": test_password
        })
        player_headers = {"Authorization": f"Bearer {player_response.json()['access_token']}"}

        # Login as receiver
        receiver_response = client.post("/auth/login", data={
            "username": receiver.username,
            "password": test_password
        })
        receiver_headers = {"Authorization": f"Bearer {receiver_response.json()['access_token']}"}

        # 1. Send friend request
        req_response = client.post(
            "/friends/request",
            headers=player_headers,
            json={"receiver_user_id": receiver.user_id}
        )
        assert req_response.status_code == status.HTTP_200_OK
        request_id = req_response.json()["id"]

        # 2. Check received requests
        received_response = client.get("/friends/requests/received", headers=receiver_headers)
        assert any(req["id"] == request_id for req in received_response.json())

        # 3. Accept request
        accept_response = client.put(
            f"/friends/requests/{request_id}",
            headers=receiver_headers,
            json={"status": "accepted"}
        )
        assert accept_response.status_code == status.HTTP_200_OK

        # 4. Verify in friends list
        list_response = client.get("/friends/list", headers=player_headers)
        friends = list_response.json()["friends"]
        assert any(f["id"] == receiver.id for f in friends)

        # 5. Remove friend
        remove_response = client.delete(f"/friends/{receiver.id}", headers=player_headers)
        assert remove_response.status_code == status.HTTP_200_OK

        # 6. Verify removed from list
        final_list = client.get("/friends/list", headers=player_headers)
        friends = final_list.json()["friends"]
        assert not any(f["id"] == receiver.id for f in friends)

import uuid

import pytest


@pytest.mark.asyncio
async def test_register_and_login_success(client):
    username = f"auth_{uuid.uuid4().hex[:8]}"
    password = "strong-password"

    register_response = await client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": password},
    )
    assert register_response.status_code == 200

    login_response = await client.post(
        "/api/auth/token",
        data={"username": username, "password": password},
    )
    assert login_response.status_code == 200
    payload = login_response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]


@pytest.mark.asyncio
async def test_duplicate_register_rejected(client):
    payload = {
        "username": f"dup_{uuid.uuid4().hex[:8]}",
        "email": f"dup_{uuid.uuid4().hex[:8]}@example.com",
        "password": "strong-password",
    }
    first = await client.post("/api/auth/register", json=payload)
    second = await client.post("/api/auth/register", json=payload)

    assert first.status_code == 200
    assert second.status_code == 400


@pytest.mark.asyncio
async def test_login_with_wrong_password_fails(client):
    username = f"wrong_{uuid.uuid4().hex[:8]}"
    await client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "correct"},
    )

    login_response = await client.post(
        "/api/auth/token",
        data={"username": username, "password": "incorrect"},
    )
    assert login_response.status_code == 401

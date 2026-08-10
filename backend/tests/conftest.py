import os
import uuid
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

# Set auth env before importing app modules that read them at import time.
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ALGORITHM", "HS512")

from app.main import app  # noqa: E402
from app.db import session as session_module  # noqa: E402
from app.api.auth import dependency as auth_dependency  # noqa: E402
from app.tasks import worker as worker_module  # noqa: E402


@pytest_asyncio.fixture(scope="session")
async def test_engine(tmp_path_factory: pytest.TempPathFactory):
    db_file = tmp_path_factory.mktemp("db") / "test.db"
    db_url = f"sqlite+aiosqlite:///{db_file}"

    engine = create_async_engine(db_url, future=True)

    session_module.engine = engine
    session_module.DATABASE_URL = db_url
    auth_dependency.SECRET_KEY = os.environ["SECRET_KEY"]
    auth_dependency.ALGORITHM = os.environ["ALGORITHM"]
    worker_module.DATABASE_URL = db_url

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def reset_db(test_engine):
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def client(test_engine):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient):
    username = f"user_{uuid.uuid4().hex[:8]}"
    password = "test-password"
    email = f"{username}@example.com"

    register_response = await client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    assert register_response.status_code == 200

    token_response = await client.post(
        "/api/auth/token",
        data={"username": username, "password": password},
    )
    assert token_response.status_code == 200

    token = token_response.json()["access_token"]
    return {"Authorization": "Bearer " + token}


@pytest_asyncio.fixture
async def second_user_headers(client: AsyncClient):
    username = f"user_{uuid.uuid4().hex[:8]}"
    password = "test-password"
    email = f"{username}@example.com"

    await client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    token_response = await client.post(
        "/api/auth/token",
        data={"username": username, "password": password},
    )
    token = token_response.json()["access_token"]
    return {"Authorization": "Bearer " + token}


@pytest_asyncio.fixture
async def seeded_experiment(client: AsyncClient, auth_headers):
    create_experiment = await client.post(
        "/api/experiments/",
        params={"name": "test experiment", "description": "desc"},
        headers=auth_headers,
    )
    assert create_experiment.status_code == 200

    experiments = await client.get("/api/experiments/", headers=auth_headers)
    experiment = experiments.json()["experiments"][0]

    metric_response = await client.post(
        f"/api/experiments/{experiment['id']}/metrics",
        params={
            "metric_name": "conversion",
            "metric_type": "binary",
            "metric_direction": "up",
            "is_primary": True,
            "is_guardrail": False,
        },
        headers=auth_headers,
    )
    assert metric_response.status_code == 200
    metric = metric_response.json()["metric"]

    variant_a = await client.post(
        f"/api/experiments/{experiment['id']}/variants",
        params={"variant_name": "control", "is_control": True, "allocation_percentage": 50},
        headers=auth_headers,
    )
    assert variant_a.status_code == 200

    variant_b = await client.post(
        f"/api/experiments/{experiment['id']}/variants",
        params={"variant_name": "treatment", "is_control": False, "allocation_percentage": 50},
        headers=auth_headers,
    )
    assert variant_b.status_code == 200

    return {
        "experiment": experiment,
        "metric": metric,
        "variant_a": variant_a.json()["variant"],
        "variant_b": variant_b.json()["variant"],
    }


@pytest.fixture
def backend_root() -> Path:
    return Path(__file__).resolve().parents[1]

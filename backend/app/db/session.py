from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from collections.abc import AsyncGenerator
from dotenv import load_dotenv
import os
from fastapi import FastAPI
from contextlib import asynccontextmanager

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine) as session:
        yield session

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Cleanly close all connections in the pool on shutdown
    await engine.dispose()

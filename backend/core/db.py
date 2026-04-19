"""Singleton MongoDB client for the whole backend."""
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None

def get_db() -> AsyncIOMotorDatabase:
    global _client, _db
    if _db is None:
        mongo_url = os.environ["MONGO_URL"]
        name = os.environ["DB_NAME"]
        _client = AsyncIOMotorClient(mongo_url)
        _db = _client[name]
    return _db

def close_db() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None

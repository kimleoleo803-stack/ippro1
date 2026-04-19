from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime, timezone

from routes.device import router as device_router, set_db as set_device_db
from routes.auth import router as auth_router, set_db as set_auth_db
from routes.admin_users import router as admin_router
from routes.subscription import router as subscription_router
from routes.public import router as public_router
from core.auth import hash_password, verify_password

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Inject DB into sub-routers
set_device_db(db)
set_auth_db(db)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include routers
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(subscription_router)
app.include_router(public_router)
app.include_router(device_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def seed_admin_and_indexes():
    """Idempotent admin seed + index creation."""
    await db.users.create_index("username", unique=True)
    await db.users.create_index("id", unique=True)
    await db.settings.create_index("id", unique=True)

    admin_username = os.environ.get("ADMIN_USERNAME", "admin").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

    existing = await db.users.find_one({"username": admin_username})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "username": admin_username,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expiry_at": None,
        })
        logger.info(f"Seeded admin user '{admin_username}'")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"username": admin_username},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )
        logger.info(f"Updated admin password for '{admin_username}'")


@app.on_event("startup")
async def on_startup():
    await seed_admin_and_indexes()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

"""
Async MongoDB service using Motor.
Provides weather cache and analysis result storage with TTL-based expiry.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional

import motor.motor_asyncio

from app.config import settings

logger = logging.getLogger(__name__)


class DatabaseService:
    def __init__(self):
        self.client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
        self.db = None

    async def connect(self):
        self.client = motor.motor_asyncio.AsyncIOMotorClient(
            settings.mongodb_url, serverSelectionTimeoutMS=5000
        )
        self.db = self.client[settings.mongodb_db_name]
        await self._create_indexes()
        logger.info(f"Connected to MongoDB: {settings.mongodb_db_name}")

    async def disconnect(self):
        if self.client:
            self.client.close()

    async def _create_indexes(self):
        try:
            await self.db.weather_cache.create_index("expires_at", expireAfterSeconds=0)
            await self.db.weather_cache.create_index("cache_key", unique=True)
            await self.db.analysis_cache.create_index("expires_at", expireAfterSeconds=0)
            await self.db.analysis_cache.create_index("cache_key", unique=True)
        except Exception as e:
            logger.warning(f"Index creation: {e}")

    # ── Weather Cache ────────────────────────────────────────────────────────

    async def get_weather_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        try:
            return await self.db.weather_cache.find_one({"cache_key": cache_key})
        except Exception as e:
            logger.error(f"Weather cache read: {e}")
            return None

    async def set_weather_cache(self, cache_key: str, data: Dict[str, Any], ttl_seconds: int):
        try:
            doc = {
                "cache_key": cache_key,
                "cached_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds),
                **data,
            }
            await self.db.weather_cache.replace_one({"cache_key": cache_key}, doc, upsert=True)
        except Exception as e:
            logger.error(f"Weather cache write: {e}")

    # ── Analysis Cache ───────────────────────────────────────────────────────

    async def get_analysis_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        try:
            doc = await self.db.analysis_cache.find_one({"cache_key": cache_key})
            if doc:
                doc.pop("_id", None)
                return doc.get("result")
            return None
        except Exception as e:
            logger.error(f"Analysis cache read: {e}")
            return None

    async def set_analysis_cache(
        self, cache_key: str, analysis_id: str, data: Dict[str, Any], ttl_seconds: int
    ):
        try:
            doc = {
                "cache_key": cache_key,
                "analysis_id": analysis_id,
                "result": data,
                "cached_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds),
            }
            await self.db.analysis_cache.replace_one({"cache_key": cache_key}, doc, upsert=True)
        except Exception as e:
            logger.error(f"Analysis cache write: {e}")

    async def get_analysis_by_id(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        try:
            doc = await self.db.analysis_cache.find_one({"analysis_id": analysis_id})
            if doc:
                doc.pop("_id", None)
                return doc.get("result")
            return None
        except Exception as e:
            logger.error(f"Analysis lookup: {e}")
            return None

    async def ping(self) -> bool:
        try:
            await self.client.admin.command("ping")
            return True
        except Exception:
            return False


db_service = DatabaseService()

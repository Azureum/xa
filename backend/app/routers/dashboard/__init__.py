from fastapi import APIRouter

from app.routers.dashboard import (
    analytics,
    auth,
    conversations,
    knowledge,
    locations,
    overview,
    personality,
)

router = APIRouter(prefix="/api/dashboard")
router.include_router(auth.router)
router.include_router(locations.router)
router.include_router(knowledge.router)
router.include_router(personality.router)
router.include_router(overview.router)
router.include_router(analytics.router)
router.include_router(conversations.router)

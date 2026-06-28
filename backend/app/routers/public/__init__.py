from fastapi import APIRouter

from app.routers.public import chat, landing

router = APIRouter(prefix="/api/public")
router.include_router(landing.router)
router.include_router(chat.router)

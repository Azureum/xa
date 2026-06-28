from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.deps import get_business_db, get_current_business
from app.models.business import Business
from app.schemas.analytics import AnalyticsResponse
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/stats", response_model=AnalyticsResponse)
def get_analytics_stats(
    days: int = Query(30, ge=1, le=90),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> AnalyticsResponse:
    return analytics_service.get_analytics_stats(db, business.id, days)

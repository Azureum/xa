from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_business_db, get_current_business
from app.models.business import Business
from app.schemas.overview import OverviewStatsResponse
from app.services import overview_service

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("/stats", response_model=OverviewStatsResponse)
def get_overview_stats(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> OverviewStatsResponse:
    return overview_service.get_overview_stats(db, business.id)

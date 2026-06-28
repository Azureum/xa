from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import (
    SupabaseUser,
    get_bootstrap_db,
    get_business_db,
    get_current_business,
    get_current_user,
)
from app.models.business import Business, BusinessUser
from app.schemas.auth import BusinessResponse, MeResponse, SetupBusinessRequest, UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _me_response(business_user: BusinessUser, business: Business) -> MeResponse:
    return MeResponse(
        user=UserResponse(
            id=business_user.user_id,
            email=business_user.email,
            role=business_user.role,
            business_id=business_user.business_id,
        ),
        business=BusinessResponse.model_validate(business),
    )


@router.post("/setup-business", response_model=MeResponse)
def setup_business(
    payload: SetupBusinessRequest,
    user: SupabaseUser = Depends(get_current_user),
    db: Session = Depends(get_bootstrap_db),
) -> MeResponse:
    business, business_user = auth_service.setup_business(
        db, user_id=user.id, email=user.email, business_name=payload.business_name
    )
    return _me_response(business_user, business)


@router.get("/me", response_model=MeResponse)
def me(
    user: SupabaseUser = Depends(get_current_user),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_business_db),
) -> MeResponse:
    business_user = db.scalar(select(BusinessUser).where(BusinessUser.user_id == user.id))
    return _me_response(business_user, business)

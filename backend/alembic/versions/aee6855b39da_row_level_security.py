"""row level security

Revision ID: aee6855b39da
Revises: 8e09a0bc15e9
Create Date: 2026-06-21 20:23:20.860499

"""
from typing import Sequence, Union

from alembic import op

from app.db_security import build_disable_rls_sql, build_enable_rls_sql

revision: str = 'aee6855b39da'
down_revision: Union[str, None] = '8e09a0bc15e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(build_enable_rls_sql())


def downgrade() -> None:
    op.execute(build_disable_rls_sql())

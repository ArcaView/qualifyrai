"""Change overall_score from INTEGER to NUMERIC for decimal precision.

Revision ID: 002_change_score_to_decimal
Revises: 001_initial_schema
Create Date: 2025-11-07 17:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_change_score_to_decimal'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Change overall_score to NUMERIC(5,2) to support decimal scores like 98.5"""
    # PostgreSQL requires explicit casting
    op.execute("""
        ALTER TABLE scoring_results 
        ALTER COLUMN overall_score TYPE NUMERIC(5,2) 
        USING overall_score::NUMERIC(5,2)
    """)


def downgrade() -> None:
    """Revert overall_score back to INTEGER"""
    op.execute("""
        ALTER TABLE scoring_results 
        ALTER COLUMN overall_score TYPE INTEGER 
        USING overall_score::INTEGER
    """)
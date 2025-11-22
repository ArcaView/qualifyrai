"""add_job_profiles_table

Revision ID: 21cdb27f1231
Revises: 003_add_job_profiles
Create Date: 2025-11-10 16:28:42.500246

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '21cdb27f1231'
down_revision: Union[str, None] = '003_add_job_profiles'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create job_profiles table."""
    from sqlalchemy.dialects import postgresql
    
    op.create_table(
        'job_profiles',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('requirements', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('job_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_job_profiles_title', 'job_profiles', ['title'])
    op.create_index('idx_job_profiles_created', 'job_profiles', ['created_at'])


def downgrade() -> None:
    """Drop job_profiles table."""
    op.drop_index('idx_job_profiles_created', table_name='job_profiles')
    op.drop_index('idx_job_profiles_title', table_name='job_profiles')
    op.drop_table('job_profiles')
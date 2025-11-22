"""Add job_profiles table

Revision ID: 003_add_job_profiles
Revises: 002_change_score_to_decimal
Create Date: 2025-11-09 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003_add_job_profiles'
down_revision: Union[str, None] = '002_change_score_to_decimal'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create job_profiles table."""
    op.create_table(
        'job_profiles',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False),
        sa.Column('api_key_id', sa.String(36), nullable=False),
        
        # Job details
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('location', sa.String(200), nullable=True),
        sa.Column('remote_ok', sa.Integer(), nullable=False, server_default='0'),
        
        # Requirements (JSON)
        sa.Column('required_skills', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('preferred_skills', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('required_certifications', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        
        # Experience & Education
        sa.Column('min_years_experience', sa.Numeric(4, 1), nullable=True),
        sa.Column('preferred_years_experience', sa.Numeric(4, 1), nullable=True),
        sa.Column('min_education', sa.String(50), nullable=True),
        sa.Column('preferred_education', sa.String(50), nullable=True),
        
        # Metadata
        sa.Column('metadata', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        
        # Constraints
        sa.ForeignKeyConstraint(['api_key_id'], ['api_keys.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_job_profiles_request_id', 'job_profiles', ['request_id'])
    op.create_index('idx_job_profiles_title', 'job_profiles', ['title'])
    op.create_index('idx_job_profiles_api_key_created', 'job_profiles', ['api_key_id', 'created_at'])


def downgrade() -> None:
    """Drop job_profiles table."""
    op.drop_table('job_profiles')
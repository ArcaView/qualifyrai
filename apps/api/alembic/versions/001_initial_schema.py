"""Initial schema with api_keys, parsed_cvs, and scoring_results.

Revision ID: 001_initial_schema
Revises: 
Create Date: 2025-01-01 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create api_keys table
    op.create_table(
        'api_keys',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('key_hash', sa.String(64), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Integer(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key_hash')
    )
    op.create_index('idx_api_keys_hash_active', 'api_keys', ['key_hash', 'is_active'])

    # Create parsed_cvs table
    op.create_table(
        'parsed_cvs',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False),
        sa.Column('api_key_id', sa.String(36), nullable=False),
        sa.Column('filename', sa.String(500), nullable=False),
        sa.Column('file_type', sa.String(10), nullable=False),
        sa.Column('parsed_data', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['api_key_id'], ['api_keys.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_parsed_cvs_request_id', 'parsed_cvs', ['request_id'])
    op.create_index('idx_parsed_cvs_created_at', 'parsed_cvs', ['created_at'])
    op.create_index('idx_parsed_cvs_api_key_created', 'parsed_cvs', ['api_key_id', 'created_at'])

    # Create scoring_results table
    op.create_table(
        'scoring_results',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False),
        sa.Column('parsed_cv_id', sa.String(36), nullable=False),
        sa.Column('job_description_hash', sa.String(64), nullable=False),
        sa.Column('overall_score', sa.Integer(), nullable=False),
        sa.Column('component_scores', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('rationale', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['parsed_cv_id'], ['parsed_cvs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_scoring_results_request_id', 'scoring_results', ['request_id'])
    op.create_index('idx_scoring_results_score_created', 'scoring_results', ['overall_score', 'created_at'])
    op.create_index('idx_scoring_results_cv_job_hash', 'scoring_results', ['parsed_cv_id', 'job_description_hash'])


def downgrade() -> None:
    op.drop_table('scoring_results')
    op.drop_table('parsed_cvs')
    op.drop_table('api_keys')
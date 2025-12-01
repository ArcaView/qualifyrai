"""Database models for ParseScore API."""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, Index, JSON, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid

Base = declarative_base()


def generate_uuid():
    """Generate UUID string."""
    return str(uuid.uuid4())


class ApiKey(Base):
    """API Key model for authentication."""
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key_hash = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    is_active = Column(Integer, default=1, nullable=False)  # 1=active, 0=revoked
    
    # Relationship
    parsed_cvs = relationship("ParsedCV", back_populates="api_key")

    __table_args__ = (
        Index('idx_key_hash_active', 'key_hash', 'is_active'),
    )


class ParsedCV(Base):
    """Parsed CV storage."""
    __tablename__ = "ps_parsed_cvs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_id = Column(String(36), nullable=False, index=True)
    api_key_id = Column(String(36), ForeignKey('api_keys.id'), nullable=True)  # Nullable for internal API
    filename = Column(String(500), nullable=False)
    file_type = Column(String(10), nullable=False)  # pdf, docx, txt
    parsed_data = Column(JSON, nullable=False)  # Full ParsedCV schema as JSON
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    api_key = relationship("ApiKey", back_populates="parsed_cvs")
    scoring_results = relationship("ScoringResult", back_populates="parsed_cv")

    __table_args__ = (
        Index('idx_request_id', 'request_id'),
        Index('idx_created_at', 'created_at'),
        Index('idx_api_key_created', 'api_key_id', 'created_at'),
    )


class ScoringResult(Base):
    """CV scoring results."""
    __tablename__ = "scoring_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_id = Column(String(36), nullable=False, index=True)
    parsed_cv_id = Column(String(36), ForeignKey('ps_parsed_cvs.id'), nullable=False)
    job_description_hash = Column(String(64), nullable=False)  # Hash of job desc for dedup
    overall_score = Column(Numeric(5, 2), nullable=False)  # Changed from Integer to Numeric(5,2)
    component_scores = Column(JSON, nullable=False)  # Dict of category scores
    rationale = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    parsed_cv = relationship("ParsedCV", back_populates="scoring_results")

    __table_args__ = (
        Index('idx_request_id', 'request_id'),
        Index('idx_score_created', 'overall_score', 'created_at'),
        Index('idx_cv_job_hash', 'parsed_cv_id', 'job_description_hash'),
    )

class JobProfile(Base):
    """Job profile model for storing job requirements."""
    __tablename__ = "job_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    requirements = Column(JSON, nullable=False)  # Store structured requirements
    job_metadata = Column(JSON, nullable=True)  # ⚠️ Renamed from 'metadata' - SQLAlchemy reserves this name
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<JobProfile(id={self.id}, title={self.title})>"
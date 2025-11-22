"""Repository for JobProfile CRUD operations."""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from uuid import UUID
from app.models.database import JobProfile


class JobProfileRepository:
    """Repository for JobProfile CRUD operations."""
    
    @staticmethod
    def create(db: Session, title: str, description: str, requirements: dict, job_metadata: dict = None) -> JobProfile:
        """Create a new job profile."""
        job_profile = JobProfile(
            title=title,
            description=description,
            requirements=requirements,
            job_metadata=job_metadata or {}
        )
        db.add(job_profile)
        db.commit()
        db.refresh(job_profile)
        return job_profile
    
    @staticmethod
    def get_by_id(db: Session, job_id: str) -> Optional[JobProfile]:
        """Get job profile by ID."""
        return db.query(JobProfile).filter(JobProfile.id == job_id).first()
    
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[JobProfile]:
        """Get all job profiles with pagination."""
        return db.query(JobProfile).offset(skip).limit(limit).all()
    
    @staticmethod
    def update(db: Session, job_id: str, **kwargs) -> Optional[JobProfile]:
        """Update a job profile."""
        job_profile = JobProfileRepository.get_by_id(db, job_id)
        if not job_profile:
            return None
        
        for key, value in kwargs.items():
            if hasattr(job_profile, key):
                setattr(job_profile, key, value)
        
        db.commit()
        db.refresh(job_profile)
        return job_profile
    
    @staticmethod
    def delete(db: Session, job_id: str) -> bool:
        """Delete a job profile."""
        job_profile = JobProfileRepository.get_by_id(db, job_id)
        if not job_profile:
            return False
        
        db.delete(job_profile)
        db.commit()
        return True
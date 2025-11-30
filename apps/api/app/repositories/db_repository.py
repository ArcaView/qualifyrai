"""Repository layer for database CRUD operations."""
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.models.database import ApiKey, ParsedCV, ScoringResult, JobProfile
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
import hashlib
import logging

logger = logging.getLogger(__name__)


class ApiKeyRepository:
    """Repository for API key operations."""
    
    @staticmethod
    def create(db: Session, key_hash: str, name: str) -> ApiKey:
        """Create a new API key."""
        api_key = ApiKey(key_hash=key_hash, name=name)
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        return api_key
    
    @staticmethod
    def get_by_hash(db: Session, key_hash: str) -> Optional[ApiKey]:
        """Get API key by hash (only active keys)."""
        return db.query(ApiKey).filter(
            ApiKey.key_hash == key_hash,
            ApiKey.is_active == 1
        ).first()
    
    @staticmethod
    def update_last_used(db: Session, api_key_id: str):
        """Update last used timestamp."""
        db.query(ApiKey).filter(ApiKey.id == api_key_id).update({
            "last_used_at": datetime.utcnow()
        })
        db.commit()
    
    @staticmethod
    def list_all(db: Session, active_only: bool = True) -> List[ApiKey]:
        """List all API keys."""
        query = db.query(ApiKey)
        if active_only:
            query = query.filter(ApiKey.is_active == 1)
        return query.order_by(ApiKey.created_at.desc()).all()
    
    @staticmethod
    def revoke(db: Session, key_id: str) -> bool:
        """Revoke an API key."""
        result = db.query(ApiKey).filter(ApiKey.id == key_id).update({
            "is_active": 0
        })
        db.commit()
        return result > 0


class ParsedCVRepository:
    """Repository for parsed CV operations."""

    @staticmethod
    def create(
        db: Session,
        request_id: str,
        api_key_id: str,
        filename: str,
        file_type: str,
        parsed_data: dict
    ) -> ParsedCV:
        """
        Store a parsed CV with enhanced error handling.

        Args:
            db: Database session
            request_id: Request ID for tracking
            api_key_id: API key ID
            filename: Original filename
            file_type: File extension
            parsed_data: Parsed CV data dictionary

        Returns:
            ParsedCV record

        Raises:
            IntegrityError: If there's a constraint violation
            SQLAlchemyError: For other database errors
        """
        try:
            cv = ParsedCV(
                request_id=request_id,
                api_key_id=api_key_id,
                filename=filename,
                file_type=file_type,
                parsed_data=parsed_data
            )
            db.add(cv)

            # Note: Commit is now handled by the persistence service
            # for better transaction control

            logger.debug(
                f"ParsedCV record prepared for commit: "
                f"request_id={request_id}, filename={filename}"
            )

            return cv

        except IntegrityError as e:
            logger.error(
                f"Integrity error creating ParsedCV: "
                f"request_id={request_id}, error={e}"
            )
            raise
        except SQLAlchemyError as e:
            logger.error(
                f"Database error creating ParsedCV: "
                f"request_id={request_id}, error={e}"
            )
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error creating ParsedCV: "
                f"request_id={request_id}, error={e}"
            )
            raise
    
    @staticmethod
    def get_by_id(db: Session, cv_id: str) -> Optional[ParsedCV]:
        """Get parsed CV by ID."""
        return db.query(ParsedCV).filter(ParsedCV.id == cv_id).first()
    
    @staticmethod
    def get_by_request_id(db: Session, request_id: str) -> Optional[ParsedCV]:
        """Get parsed CV by request ID."""
        return db.query(ParsedCV).filter(ParsedCV.request_id == request_id).first()
    
    @staticmethod
    def list_recent(db: Session, api_key_id: Optional[str] = None, limit: int = 50) -> List[ParsedCV]:
        """List recent parsed CVs."""
        query = db.query(ParsedCV)
        if api_key_id:
            query = query.filter(ParsedCV.api_key_id == api_key_id)
        return query.order_by(ParsedCV.created_at.desc()).limit(limit).all()


class ScoringResultRepository:
    """Repository for scoring result operations."""
    
    @staticmethod
    def create(
        db: Session,
        request_id: str,
        parsed_cv_id: str,
        job_description: str,
        overall_score: float,  # Changed from int to float
        component_scores: dict,
        rationale: Optional[str] = None
    ) -> ScoringResult:
        """Store a scoring result."""
        # Hash job description for deduplication
        job_hash = hashlib.sha256(job_description.encode()).hexdigest()
        
        result = ScoringResult(
            request_id=request_id,
            parsed_cv_id=parsed_cv_id,
            job_description_hash=job_hash,
            overall_score=overall_score,  # Now accepts float
            component_scores=component_scores,
            rationale=rationale
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        return result
    
    @staticmethod
    def get_by_id(db: Session, result_id: str) -> Optional[ScoringResult]:
        """Get scoring result by ID."""
        return db.query(ScoringResult).filter(ScoringResult.id == result_id).first()
    
    @staticmethod
    def get_by_cv_and_job(
        db: Session,
        parsed_cv_id: str,
        job_description: str
    ) -> Optional[ScoringResult]:
        """Get existing scoring result for same CV + job combo (cache lookup)."""
        job_hash = hashlib.sha256(job_description.encode()).hexdigest()
        result = db.query(ScoringResult).filter(
            ScoringResult.parsed_cv_id == parsed_cv_id,
            ScoringResult.job_description_hash == job_hash
        ).first()
        
        # Convert Decimal to float if needed
        if result and isinstance(result.overall_score, Decimal):
            result.overall_score = float(result.overall_score)
        
        return result
    
    @staticmethod
    def list_by_cv(db: Session, parsed_cv_id: str) -> List[ScoringResult]:
        """List all scoring results for a CV."""
        results = db.query(ScoringResult).filter(
            ScoringResult.parsed_cv_id == parsed_cv_id
        ).order_by(ScoringResult.created_at.desc()).all()
        
        # Convert Decimal to float for all results
        for result in results:
            if isinstance(result.overall_score, Decimal):
                result.overall_score = float(result.overall_score)
        
        return results
    
class JobProfileRepository:
    """Repository for job profile operations."""
    
    @staticmethod
    def create(
        db: Session,
        title: str,
        description: str,
        requirements: dict,
        job_metadata: dict = None
    ) -> JobProfile:
        """Create a new job profile.
        
        Args:
            db: Database session
            title: Job title
            description: Job description
            requirements: Dict with required_skills, preferred_skills, min_experience, etc.
            job_metadata: Optional additional metadata
            
        Example requirements dict:
            {
                "required_skills": ["python", "fastapi"],
                "preferred_skills": ["docker", "kubernetes"],
                "min_years_experience": 5.0,
                "min_education": "bachelors",
                "required_certifications": ["AWS"]
            }
        """
        job = JobProfile(
            title=title,
            description=description,
            requirements=requirements,
            job_metadata=job_metadata or {}
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job
    
    @staticmethod
    def get_by_id(db: Session, job_id: str) -> Optional[JobProfile]:
        """Get job profile by ID."""
        return db.query(JobProfile).filter(JobProfile.id == job_id).first()
    
    @staticmethod
    def list_all(
        db: Session,
        skip: int = 0,
        limit: int = 50
    ) -> List[JobProfile]:
        """List all job profiles with pagination."""
        return db.query(JobProfile)\
            .order_by(JobProfile.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
    
    @staticmethod
    def search_by_title(
        db: Session,
        title: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[JobProfile]:
        """Search job profiles by title."""
        return db.query(JobProfile)\
            .filter(JobProfile.title.ilike(f"%{title}%"))\
            .order_by(JobProfile.created_at.desc())\
            .offset(skip)\
            .limit(limit)\
            .all()
    
    @staticmethod
    def update(
        db: Session,
        job_id: str,
        title: str = None,
        description: str = None,
        requirements: dict = None,
        job_metadata: dict = None
    ) -> Optional[JobProfile]:
        """Update a job profile."""
        job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
        if not job:
            return None
        
        # Update only provided fields
        if title is not None:
            job.title = title
        if description is not None:
            job.description = description
        if requirements is not None:
            job.requirements = requirements
        if job_metadata is not None:
            job.job_metadata = job_metadata
        
        job.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(job)
        return job
    
    @staticmethod
    def delete(db: Session, job_id: str) -> bool:
        """Delete a job profile."""
        job = db.query(JobProfile).filter(JobProfile.id == job_id).first()
        if not job:
            return False
        db.delete(job)
        db.commit()
        return True
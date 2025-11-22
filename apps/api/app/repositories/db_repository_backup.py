"""Repository layer for database CRUD operations."""
from sqlalchemy.orm import Session
from app.models.database import ApiKey, ParsedCV, ScoringResult
from datetime import datetime
from typing import Optional, List
import hashlib


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
        """Store a parsed CV."""
        cv = ParsedCV(
            request_id=request_id,
            api_key_id=api_key_id,
            filename=filename,
            file_type=file_type,
            parsed_data=parsed_data
        )
        db.add(cv)
        db.commit()
        db.refresh(cv)
        return cv
    
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
        overall_score: int,
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
            overall_score=overall_score,
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
        return db.query(ScoringResult).filter(
            ScoringResult.parsed_cv_id == parsed_cv_id,
            ScoringResult.job_description_hash == job_hash
        ).first()
    
    @staticmethod
    def list_by_cv(db: Session, parsed_cv_id: str) -> List[ScoringResult]:
        """List all scoring results for a CV."""
        return db.query(ScoringResult).filter(
            ScoringResult.parsed_cv_id == parsed_cv_id
        ).order_by(ScoringResult.created_at.desc()).all()

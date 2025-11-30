"""Job profile endpoints - Create, retrieve, and manage job postings."""
import time
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Request, Depends
from sqlalchemy.orm import Session

from app.models import JobProfile, ErrorDetail
from app.database import get_db
from app.repositories.db_repository import JobProfileRepository

router = APIRouter(prefix="/v1", tags=["Jobs"])


@router.post("/jobs")
async def create_job(
    request: Request,
    job: JobProfile,
    db: Session = Depends(get_db)
):
    """Create or normalize a job profile.

    Args:
        job: Job profile with requirements

    Returns:
        Created job profile with ID

    Raises:
        422: Invalid job data
    """
    start_time = time.time()
    request_id = request.state.request_id

    try:
        # Internal single-user API - no API key needed
        api_key_id = None

        # Save job to database
        job_record = JobProfileRepository.create(
            db=db,
            request_id=request_id,
            api_key_id=api_key_id,
            job_data=job.model_dump()
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "request_id": request_id,
            "job_id": job_record.id,
            "job": JobProfile(
                title=job_record.title,
                description=job_record.description,
                required_skills=job_record.required_skills,
                preferred_skills=job_record.preferred_skills,
                min_years_experience=float(job_record.min_years_experience) if job_record.min_years_experience else None,
                preferred_years_experience=float(job_record.preferred_years_experience) if job_record.preferred_years_experience else None,
                min_education=job_record.min_education,
                preferred_education=job_record.preferred_education,
                required_certifications=job_record.required_certifications,
                location=job_record.location,
                remote_ok=bool(job_record.remote_ok),
                metadata=job_record.metadata
            ),
            "created_at": job_record.created_at.isoformat(),
            "processing_time_ms": round(processing_time, 2)
        }
        
    except Exception as e:
        print(f"Create job error [{request_id}]: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="job_creation_failed",
                message="Failed to create job profile",
                hint="Check job data and try again"
            ).model_dump()
        )


@router.get("/jobs/{job_id}")
async def get_job(
    job_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Retrieve a job profile by ID.
    
    Args:
        job_id: Job profile ID
        
    Returns:
        Job profile data
        
    Raises:
        404: Job not found
    """
    request_id = request.state.request_id
    
    # Retrieve from database
    job_record = JobProfileRepository.get_by_id(db, job_id)
    
    if not job_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="job_not_found",
                message=f"No job found with ID: {job_id}",
                hint="Check the job ID or create a new job profile"
            ).model_dump()
        )
    
    return {
        "request_id": request_id,
        "job_id": job_record.id,
        "job": JobProfile(
            title=job_record.title,
            description=job_record.description,
            required_skills=job_record.required_skills,
            preferred_skills=job_record.preferred_skills,
            min_years_experience=float(job_record.min_years_experience) if job_record.min_years_experience else None,
            preferred_years_experience=float(job_record.preferred_years_experience) if job_record.preferred_years_experience else None,
            min_education=job_record.min_education,
            preferred_education=job_record.preferred_education,
            required_certifications=job_record.required_certifications,
            location=job_record.location,
            remote_ok=bool(job_record.remote_ok),
            metadata=job_record.metadata
        ),
        "created_at": job_record.created_at.isoformat(),
        "updated_at": job_record.updated_at.isoformat()
    }


@router.get("/jobs")
async def list_jobs(
    request: Request,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List recent job profiles.

    Args:
        limit: Maximum number of jobs to return (default 50)

    Returns:
        List of job profile metadata
    """
    request_id = request.state.request_id

    # Retrieve recent jobs (internal API - no user filtering)
    job_records = JobProfileRepository.list_recent(
        db=db,
        api_key_id=None,
        limit=min(limit, 100)  # Cap at 100
    )
    
    return {
        "request_id": request_id,
        "total": len(job_records),
        "jobs": [
            {
                "job_id": job.id,
                "title": job.title,
                "location": job.location,
                "remote_ok": bool(job.remote_ok),
                "required_skills_count": len(job.required_skills),
                "created_at": job.created_at.isoformat(),
                "updated_at": job.updated_at.isoformat()
            }
            for job in job_records
        ]
    }


@router.put("/jobs/{job_id}")
async def update_job(
    job_id: str,
    job: JobProfile,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update a job profile.
    
    Args:
        job_id: Job profile ID
        job: Updated job data
        
    Returns:
        Updated job profile
        
    Raises:
        404: Job not found
    """
    request_id = request.state.request_id
    
    # Check if job exists
    existing_job = JobProfileRepository.get_by_id(db, job_id)
    if not existing_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="job_not_found",
                message=f"No job found with ID: {job_id}"
            ).model_dump()
        )
    
    # Update job
    updated_job = JobProfileRepository.update(
        db=db,
        job_id=job_id,
        job_data=job.model_dump()
    )
    
    return {
        "request_id": request_id,
        "job_id": updated_job.id,
        "job": JobProfile(
            title=updated_job.title,
            description=updated_job.description,
            required_skills=updated_job.required_skills,
            preferred_skills=updated_job.preferred_skills,
            min_years_experience=float(updated_job.min_years_experience) if updated_job.min_years_experience else None,
            preferred_years_experience=float(updated_job.preferred_years_experience) if updated_job.preferred_years_experience else None,
            min_education=updated_job.min_education,
            preferred_education=updated_job.preferred_education,
            required_certifications=updated_job.required_certifications,
            location=updated_job.location,
            remote_ok=bool(updated_job.remote_ok),
            metadata=updated_job.metadata
        ),
        "updated_at": updated_job.updated_at.isoformat()
    }


@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete a job profile.
    
    Args:
        job_id: Job profile ID
        
    Returns:
        Confirmation message
        
    Raises:
        404: Job not found
    """
    request_id = request.state.request_id
    
    # Delete job
    deleted = JobProfileRepository.delete(db, job_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="job_not_found",
                message=f"No job found with ID: {job_id}"
            ).model_dump()
        )
    
    return {
        "request_id": request_id,
        "job_id": job_id,
        "message": "Job profile deleted successfully"
    }
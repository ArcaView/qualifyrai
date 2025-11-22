"""Score endpoint - Candidate scoring routes with caching and persistence."""
import time
import hashlib
from fastapi import APIRouter, HTTPException, status, Request, Depends
from sqlalchemy.orm import Session

from app.models import ScoreRequest, ScoreResponse, ScoringMode, ErrorDetail
from app.scoring.engine import ScoringEngine
from app.config import settings
from app.middleware.auth import verify_api_key
from app.database import get_db
from app.repositories.db_repository import ScoringResultRepository, ParsedCVRepository

router = APIRouter(prefix="/v1", tags=["Scoring"])

# Initialize scoring engine
scorer = ScoringEngine()


@router.post("/score", response_model=ScoreResponse)
async def score_candidate(
    request: Request,
    score_request: ScoreRequest,
    api_key_data: dict = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """Score a candidate against a job profile.
    
    Args:
        score_request: Candidate data, job requirements, and scoring mode
        
    Returns:
        ScoreResponse with overall score, breakdown, and risk flags
        
    Raises:
        422: Invalid input data
        500: Scoring failed
    """
    start_time = time.time()
    request_id = request.state.request_id
    
    # Validate mode
    if score_request.mode == ScoringMode.LLM and not settings.LLM_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="llm_not_enabled",
                message="LLM scoring mode is not enabled",
                hint="Use mode='baseline' or enable LLM in configuration"
            ).model_dump()
        )
    
    try:
        # Check if this CV + job combo was already scored (cache lookup)
        cv_id_from_metadata = score_request.candidate.parsing_metadata.get('cv_id')
        job_description_text = f"{score_request.job.title}|{score_request.job.description}"
        
        cached_result = None
        if cv_id_from_metadata:
            cached_result = ScoringResultRepository.get_by_cv_and_job(
                db=db,
                parsed_cv_id=cv_id_from_metadata,
                job_description=job_description_text
            )
        
        if cached_result:
            # Return cached result
            print(f"Cache hit! Returning cached scoring result for CV {cv_id_from_metadata}")
            
            # Reconstruct result from database
            from app.models import ScoringResult, ScoreBreakdown, RiskFlag
            
            # Separate flags from component scores (flags aren't part of ScoreBreakdown)
            component_data = {k: v for k, v in cached_result.component_scores.items() if k != 'flags'}
            flags_data = cached_result.component_scores.get('flags', [])
            
            result = ScoringResult(
                overall_score=cached_result.overall_score,  # This is truncated by DB
                breakdown=ScoreBreakdown(**component_data),
                rationale=cached_result.rationale,
                flags=[RiskFlag(**flag) for flag in flags_data],
                mode=ScoringMode.BASELINE,
                llm_adjustment=None,
                model_version=scorer.MODEL_VERSION,
                rules_version=scorer.RULES_VERSION,
                request_id=request_id
            )
            
            processing_time = (time.time() - start_time) * 1000
            
            return ScoreResponse(
                request_id=request_id,
                result=result,
                processing_time_ms=round(processing_time, 2)
            )
        
        # No cache hit - compute score
        result = scorer.score(
            candidate=score_request.candidate,
            job=score_request.job,
            custom_weights=score_request.custom_weights,
            request_id=request_id
        )
        
        # TODO: If mode=LLM, call LLM wrapper for rationale and adjustment
        if score_request.mode == ScoringMode.LLM:
            # result = llm_scorer.enhance(result, candidate, job)
            pass
        
        # Persist to database if we have a CV ID
        if cv_id_from_metadata:
            # Store the scoring result
            db_result = ScoringResultRepository.create(
                db=db,
                request_id=request_id,
                parsed_cv_id=cv_id_from_metadata,
                job_description=job_description_text,
                overall_score=int(result.overall_score),
                component_scores={
                    **result.breakdown.model_dump(),
                    'flags': [flag.model_dump() for flag in result.flags]
                },
                rationale=result.rationale
            )
            
            print(f"Saved scoring result {db_result.id} to database")
        
        processing_time = (time.time() - start_time) * 1000
        
        return ScoreResponse(
            request_id=request_id,
            result=result,
            processing_time_ms=round(processing_time, 2)
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="validation_error",
                message=str(e),
                hint="Check that candidate and job data are valid"
            ).model_dump()
        )
    except Exception as e:
        print(f"Scoring error [{request_id}]: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="scoring_failed",
                message="Failed to score candidate",
                hint="Please try again or contact support"
            ).model_dump()
        )


@router.get("/scores/{score_id}", tags=["Scoring"])
async def get_scoring_result(
    score_id: str,
    request: Request,
    api_key_data: dict = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """Retrieve a scoring result by ID.
    
    Args:
        score_id: Scoring result ID from database
        
    Returns:
        ScoringResult data
        
    Raises:
        404: Score not found
    """
    request_id = request.state.request_id
    
    # Retrieve from database
    score_record = ScoringResultRepository.get_by_id(db, score_id)
    
    if not score_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="score_not_found",
                message=f"No scoring result found with ID: {score_id}",
                hint="Check the score ID or ensure the scoring was persisted"
            ).model_dump()
        )
    
    # Reconstruct result from database
    from app.models import ScoringResult, ScoreBreakdown, RiskFlag
    
    result = ScoringResult(
        overall_score=score_record.overall_score,
        breakdown=ScoreBreakdown(**{k: v for k, v in score_record.component_scores.items() if k != 'flags'}),
        rationale=score_record.rationale,
        flags=[RiskFlag(**flag) for flag in score_record.component_scores.get('flags', [])],
        mode=ScoringMode.BASELINE,
        llm_adjustment=None,
        model_version=scorer.MODEL_VERSION,
        rules_version=scorer.RULES_VERSION,
        request_id=request_id
    )
    
    return {
        "request_id": request_id,
        "score_id": score_record.id,
        "cv_id": score_record.parsed_cv_id,
        "scored_at": score_record.created_at.isoformat(),
        "result": result
    }


@router.get("/cvs/{cv_id}/scores", tags=["Scoring"])
async def list_cv_scores(
    cv_id: str,
    request: Request,
    api_key_data: dict = Depends(verify_api_key),
    db: Session = Depends(get_db)
):
    """List all scoring results for a specific CV.
    
    Args:
        cv_id: Parsed CV ID
        
    Returns:
        List of scoring results for this CV
    """
    request_id = request.state.request_id
    
    # Check CV exists
    cv_record = ParsedCVRepository.get_by_id(db, cv_id)
    if not cv_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="cv_not_found",
                message=f"No CV found with ID: {cv_id}"
            ).model_dump()
        )
    
    # Get all scoring results
    score_records = ScoringResultRepository.list_by_cv(db, cv_id)
    
    return {
        "request_id": request_id,
        "cv_id": cv_id,
        "total": len(score_records),
        "scores": [
            {
                "score_id": score.id,
                "overall_score": score.overall_score,
                "scored_at": score.created_at.isoformat(),
                "request_id": score.request_id
            }
            for score in score_records
        ]
    }
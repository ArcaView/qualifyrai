"""Score endpoint - Candidate scoring routes with LLM enhancement, caching and persistence."""
import time
import hashlib
from decimal import Decimal
from fastapi import APIRouter, HTTPException, status, Request, Depends
from sqlalchemy.orm import Session

from app.models import ScoreRequest, ScoreResponse, ScoringMode, ErrorDetail
from app.scoring.engine import ScoringEngine
from app.scoring.llm_scorer import get_llm_scorer
from app.config import settings
from app.database import get_db
from app.repositories.db_repository import ScoringResultRepository, ParsedCVRepository

router = APIRouter(prefix="/v1", tags=["Scoring"])

# Initialize scoring engine
scorer = ScoringEngine()


@router.post("/score", response_model=ScoreResponse)
async def score_candidate(
    request: Request,
    score_request: ScoreRequest,
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
        
        # Only use cache if mode matches or if we only have baseline in cache
        # (We'll still compute LLM if requested, even if baseline is cached)
        if cached_result and score_request.mode == ScoringMode.BASELINE:
            # Return cached baseline result
            print(f"Cache hit! Returning cached scoring result for CV {cv_id_from_metadata}")
            
            # Reconstruct result from database
            from app.models import ScoringResult, ScoreBreakdown, RiskFlag
            
            # Separate flags from component scores (flags aren't part of ScoreBreakdown)
            component_data = {k: v for k, v in cached_result.component_scores.items() if k != 'flags'}
            flags_data = cached_result.component_scores.get('flags', [])
            
            # Convert Decimal to float if needed
            overall_score = float(cached_result.overall_score) if isinstance(cached_result.overall_score, Decimal) else cached_result.overall_score
            
            result = ScoringResult(
                overall_score=overall_score,
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
        
        # No cache hit - compute baseline score
        result = scorer.score(
            candidate=score_request.candidate,
            job=score_request.job,
            custom_weights=score_request.custom_weights,
            request_id=request_id
        )
        
        # If LLM mode requested, enhance with rationale and adjustment
        if score_request.mode == ScoringMode.LLM:
            try:
                llm_scorer = get_llm_scorer()
                result = await llm_scorer.enhance_score(
                    baseline_result=result,
                    candidate=score_request.candidate,
                    job=score_request.job
                )
                print(f"LLM enhancement completed: adjustment={result.llm_adjustment}")
            except Exception as e:
                # If LLM fails, log and continue with baseline
                print(f"LLM enhancement failed, using baseline: {e}")
                result.rationale = f"[LLM enhancement failed: {str(e)[:100]}]"
                result.llm_adjustment = 0.0  # Explicitly set to 0
        
        # Persist to database if we have a CV ID
        if cv_id_from_metadata:
            # Store the scoring result
            db_result = ScoringResultRepository.create(
                db=db,
                request_id=request_id,
                parsed_cv_id=cv_id_from_metadata,
                job_description=job_description_text,
                overall_score=result.overall_score,  # Now properly stores float
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
    db: Session = Depends(get_db)
):
    """Retrieve a scoring result by ID."""
    request_id = request.state.request_id
    
    score_record = ScoringResultRepository.get_by_id(db, score_id)
    
    if not score_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="score_not_found",
                message=f"No scoring result found with ID: {score_id}"
            ).model_dump()
        )
    
    from app.models import ScoringResult, ScoreBreakdown, RiskFlag
    
    overall_score = float(score_record.overall_score) if isinstance(score_record.overall_score, Decimal) else score_record.overall_score
    
    result = ScoringResult(
        overall_score=overall_score,
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
    db: Session = Depends(get_db)
):
    """List all scoring results for a specific CV."""
    request_id = request.state.request_id
    
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
    
    score_records = ScoringResultRepository.list_by_cv(db, cv_id)
    
    return {
        "request_id": request_id,
        "cv_id": cv_id,
        "total": len(score_records),
        "scores": [
            {
                "score_id": score.id,
                "overall_score": float(score.overall_score) if isinstance(score.overall_score, Decimal) else score.overall_score,
                "scored_at": score.created_at.isoformat(),
                "request_id": score.request_id
            }
            for score in score_records
        ]
    }

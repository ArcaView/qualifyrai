"""Interview pack generation endpoint."""
import time
from fastapi import APIRouter, HTTPException, status, Request
from app.models.interview_pack import InterviewPackRequest, InterviewPackResponse
from app.models.interview_summary import InterviewSummaryRequest, InterviewSummaryResponse
from app.models import ErrorDetail
from app.interview_pack_generator import get_interview_pack_generator
from app.interview_summary_generator import get_interview_summary_generator
from app.config import settings

router = APIRouter(prefix="/v1", tags=["Interview"])


@router.post("/interview-pack", response_model=InterviewPackResponse)
async def generate_interview_pack(
    request: Request,
    pack_request: InterviewPackRequest
):
    """Generate a tailored interview pack based on job description and candidate CV.
    
    Args:
        pack_request: Interview pack generation request with job details and candidate data
        
    Returns:
        InterviewPackResponse with generated pack
        
    Raises:
        422: Invalid input data or LLM not enabled
        500: Generation failed
    """
    start_time = time.time()
    request_id = request.state.request_id
    
    # Validate LLM is enabled
    if not settings.LLM_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="llm_not_enabled",
                message="LLM is not enabled",
                hint="Enable LLM in configuration (LLM_ENABLED=true) to generate interview packs"
            ).model_dump()
        )
    
    try:
        # Get generator
        generator = get_interview_pack_generator()
        
        # Generate pack
        pack = await generator.generate(pack_request)
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        return InterviewPackResponse(
            request_id=request_id,
            pack=pack,
            processing_time_ms=processing_time_ms
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="validation_error",
                message=str(e),
                hint="Check LLM configuration and API key"
            ).model_dump()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="generation_failed",
                message=f"Failed to generate interview pack: {str(e)}",
                hint="Check logs for details"
            ).model_dump()
        )


@router.post("/interview-summary", response_model=InterviewSummaryResponse)
async def generate_interview_summary(
    request: Request,
    summary_request: InterviewSummaryRequest
):
    """Generate an interview summary from interview notes and scores.
    
    Args:
        summary_request: Interview summary generation request with questions, notes, and scores
        
    Returns:
        InterviewSummaryResponse with generated summary
        
    Raises:
        422: Invalid input data or LLM not enabled
        500: Generation failed
    """
    start_time = time.time()
    request_id = request.state.request_id
    
    # Validate LLM is enabled
    if not settings.LLM_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="llm_not_enabled",
                message="LLM is not enabled",
                hint="Enable LLM in configuration (LLM_ENABLED=true) to generate interview summaries"
            ).model_dump()
        )
    
    try:
        # Get generator
        generator = get_interview_summary_generator()
        
        # Generate summary
        summary_data = await generator.generate(summary_request)
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        return InterviewSummaryResponse(
            summary=summary_data["summary"],
            overall_score=summary_data.get("overall_score"),
            strengths=summary_data.get("strengths", []),
            concerns=summary_data.get("concerns", [])
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="validation_error",
                message=str(e),
                hint="Check LLM configuration and API key"
            ).model_dump()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="generation_failed",
                message=f"Failed to generate interview summary: {str(e)}",
                hint="Check logs for details"
            ).model_dump()
        )


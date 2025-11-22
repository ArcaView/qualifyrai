"""Parse endpoint - CV parsing routes."""
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Request, Depends
from fastapi.responses import JSONResponse

from app.models import ParseResponse, ParseRequest, ErrorDetail
from app.parser.core import CVParser
from app.config import settings
from app.middleware.auth import verify_api_key

router = APIRouter(prefix="/v1", tags=["Parsing"])

# Initialize parser
parser = CVParser()


@router.post("/parse", response_model=ParseResponse)
async def parse_cv(
    request: Request,
    file: UploadFile = File(...),
    normalize: bool = True,
    return_raw_text: bool = False,
    persist: bool = False,
    api_key_data: dict = Depends(verify_api_key)
):
    """Parse a CV/resume file to structured JSON.
    
    Args:
        file: CV file (PDF, DOCX, DOC, or TXT)
        normalize: Normalize skills to canonical taxonomy
        return_raw_text: Include raw extracted text in response
        persist: Store parsed data (default: false for privacy)
        
    Returns:
        ParseResponse with structured candidate data
        
    Raises:
        413: File too large
        422: Parse failed
        429: Rate limited
    """
    start_time = time.time()
    request_id = request.state.request_id
    
    # Validate file size
    file_bytes = await file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)
    
    if file_size_mb > settings.MAX_FILE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="file_too_large",
                message=f"File size ({file_size_mb:.2f} MB) exceeds limit",
                hint=f"Maximum file size is {settings.MAX_FILE_MB} MB"
            ).model_dump()
        )
    
    # Validate file type
    allowed_extensions = ['pdf', 'docx', 'doc', 'txt']
    file_ext = file.filename.split('.')[-1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="unsupported_file_type",
                message=f"File type '.{file_ext}' is not supported",
                hint=f"Supported types: {', '.join(allowed_extensions)}"
            ).model_dump()
        )
    
    # Parse the CV
    try:
        candidate = parser.parse_file(file_bytes, file.filename)
        
        # Optionally remove raw text for privacy
        if not return_raw_text and not settings.RETURN_RAW_TEXT:
            candidate.raw_text = None
        
        # TODO: If persist=True, save to database
        if persist or settings.PERSIST_DEFAULT:
            pass  # Save to DB
        
        processing_time = (time.time() - start_time) * 1000
        
        return ParseResponse(
            request_id=request_id,
            candidate=candidate,
            processing_time_ms=round(processing_time, 2)
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="parse_failed",
                message=str(e),
                hint="Ensure the file contains readable text and is not corrupted"
            ).model_dump()
        )
    except Exception as e:
        # Log full error for debugging
        print(f"Parse error [{request_id}]: {e}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="internal_error",
                message="Failed to parse CV",
                hint="Please try again or contact support"
            ).model_dump()
        )
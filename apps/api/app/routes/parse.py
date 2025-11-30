"""Parse endpoint - CV parsing routes with database persistence."""
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Request, Depends
from sqlalchemy.orm import Session

from app.models import ParseResponse, ParseRequest, ErrorDetail, ParsedCandidate
from app.parser.core import CVParser
from app.config import settings
from app.database import get_db
from app.repositories.db_repository import ParsedCVRepository

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
    db: Session = Depends(get_db)
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
        candidate = await parser.parse_file(file_bytes, file.filename)
        
        # Persist to database if requested or configured
        should_persist = persist or settings.PERSIST_DEFAULT

        if should_persist:
            # Internal single-user API - no API key needed
            api_key_id = None

            # Save parsed CV to database
            parsed_cv_record = ParsedCVRepository.create(
                db=db,
                request_id=request_id,
                api_key_id=api_key_id,
                filename=file.filename,
                file_type=file_ext,
                parsed_data=candidate.model_dump(mode='json')
            )

            # Store the DB ID in the candidate metadata for reference
            candidate.parsing_metadata['cv_id'] = parsed_cv_record.id

        # Optionally remove raw text for privacy
        if not return_raw_text and not settings.RETURN_RAW_TEXT:
            candidate.raw_text = None
        
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


@router.get("/cvs/{cv_id}", tags=["Parsing"])
async def get_parsed_cv(
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Retrieve a previously parsed CV by ID or request_id.

    Args:
        cv_id: Parsed CV ID (database UUID) OR request_id from parse response

    Returns:
        ParsedCandidate data

    Raises:
        404: CV not found
    """
    request_id = request.state.request_id

    # Try to retrieve by database ID first
    cv_record = ParsedCVRepository.get_by_id(db, cv_id)

    # If not found, try by request_id
    if not cv_record:
        cv_record = ParsedCVRepository.get_by_request_id(db, cv_id)

    if not cv_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="cv_not_found",
                message=f"No CV found with ID or request_id: {cv_id}",
                hint="Check the CV ID/request_id or ensure it was parsed with persist=true"
            ).model_dump()
        )
    
    # Convert stored JSON back to ParsedCandidate
    candidate = ParsedCandidate(**cv_record.parsed_data)
    
    return {
        "request_id": request_id,
        "cv_id": cv_record.id,
        "filename": cv_record.filename,
        "parsed_at": cv_record.created_at.isoformat(),
        "candidate": candidate
    }


@router.get("/cvs", tags=["Parsing"])
async def list_parsed_cvs(
    request: Request,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List recent parsed CVs.

    Args:
        limit: Maximum number of CVs to return (default 50)

    Returns:
        List of parsed CV metadata
    """
    request_id = request.state.request_id

    # Retrieve recent CVs (internal API - no user filtering)
    cv_records = ParsedCVRepository.list_recent(
        db=db,
        api_key_id=None,
        limit=min(limit, 100)  # Cap at 100
    )
    
    return {
        "request_id": request_id,
        "total": len(cv_records),
        "cvs": [
            {
                "cv_id": cv.id,
                "filename": cv.filename,
                "file_type": cv.file_type,
                "parsed_at": cv.created_at.isoformat(),
                "request_id": cv.request_id
            }
            for cv in cv_records
        ]
    }
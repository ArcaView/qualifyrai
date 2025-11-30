"""Batch parsing and scoring endpoints."""
import time
import asyncio
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Request, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.models import (
    JobProfile, CandidateReview, BatchScoreResponse, ParsedCandidate,
    ErrorDetail, ScoreBreakdown, RiskFlag
)
from app.parser.core import CVParser
from app.scoring.engine import ScoringEngine
from app.scoring.llm_scorer import get_llm_scorer
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/v1", tags=["Batch Operations"])

# Initialize components
cv_parser = CVParser()
scorer = ScoringEngine()

# Constants
MAX_BATCH_SIZE = 50
MAX_FILE_SIZE_MB = 5


class ParsedCVResult(BaseModel):
    """Result for a single parsed CV in batch operation."""
    filename: str
    candidate: Optional[ParsedCandidate] = None
    parsing_errors: Optional[str] = None


class BatchParseResponse(BaseModel):
    """Response for batch CV parsing (no scoring)."""
    request_id: str
    total_cvs: int
    successful_parses: int
    failed_parses: int
    results: List[ParsedCVResult]
    processing_time_ms: float


@router.post("/batch-parse", response_model=BatchParseResponse)
async def batch_parse_cvs(
    request: Request,
    files: List[UploadFile] = File(..., description="CV files (PDF/DOCX/DOC/TXT, max 50)"),
    db: Session = Depends(get_db)
):
    """Parse multiple CVs without scoring.

    This endpoint allows you to upload and parse up to 50 CVs, extracting:
    - Contact information (name, email, phone, location, URLs)
    - Work experience
    - Education
    - Skills
    - Certifications
    - Languages

    No job description or scoring is performed - just pure CV parsing.

    Args:
        files: List of CV files (max 50, each max 5MB)

    Returns:
        BatchParseResponse with parsed data for each CV

    Raises:
        400: Invalid input (too many files, file too large)
        500: Processing failed
    """
    start_time = time.time()
    request_id = request.state.request_id

    # Validate batch size
    if len(files) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="no_files",
                message="No CV files provided",
                hint="Upload at least one CV file"
            ).model_dump()
        )

    if len(files) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="too_many_files",
                message=f"Too many files. Maximum is {MAX_BATCH_SIZE}",
                hint=f"Reduce number of files to {MAX_BATCH_SIZE} or fewer"
            ).model_dump()
        )

    print(f"\n{'='*70}")
    print(f"📦 BATCH PARSE: {len(files)} CVs")
    print(f"{'='*70}\n")

    # Process CVs in parallel
    print(f"⚡ Parsing {len(files)} CVs in parallel...")
    tasks = [
        _parse_single_cv(
            file=file,
            request_id=request_id,
            index=i+1,
            total=len(files)
        )
        for i, file in enumerate(files)
    ]

    results = await asyncio.gather(*tasks)

    # Count successes and failures
    successful = sum(1 for r in results if r.candidate is not None)
    failed = sum(1 for r in results if r.parsing_errors is not None)

    processing_time = (time.time() - start_time) * 1000

    print(f"\n{'='*70}")
    print(f"✅ BATCH PARSE COMPLETE: {successful} successful, {failed} failed")
    print(f"⏱️  Total time: {processing_time:.0f}ms ({processing_time/len(files):.0f}ms avg per CV)")
    print(f"{'='*70}\n")

    return BatchParseResponse(
        request_id=request_id,
        total_cvs=len(files),
        successful_parses=successful,
        failed_parses=failed,
        results=results,
        processing_time_ms=round(processing_time, 2)
    )


async def _parse_single_cv(
    file: UploadFile,
    request_id: str,
    index: int,
    total: int
) -> ParsedCVResult:
    """Parse a single CV file.

    Args:
        file: Uploaded CV file
        request_id: Request ID for tracking
        index: Current CV index (1-based)
        total: Total number of CVs

    Returns:
        ParsedCVResult with candidate data or error
    """
    filename = file.filename
    print(f"[{index}/{total}] Processing: {filename}")

    try:
        # Validate file size
        content = await file.read()
        file_size_mb = len(content) / (1024 * 1024)

        if file_size_mb > MAX_FILE_SIZE_MB:
            return ParsedCVResult(
                filename=filename,
                candidate=None,
                parsing_errors=f"File too large: {file_size_mb:.1f}MB > {MAX_FILE_SIZE_MB}MB"
            )

        # Detect file type
        file_extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if file_extension not in ["pdf", "docx", "doc", "txt"]:
            return ParsedCVResult(
                filename=filename,
                candidate=None,
                parsing_errors=f"Unsupported file type: .{file_extension}"
            )

        # Parse CV
        try:
            print(f"  [{index}/{total}] 📄 Parsing CV...")
            candidate = await cv_parser.parse_file(
                file_bytes=content,
                filename=filename
            )
            candidate_name = candidate.contact.full_name or "Unknown"
            print(f"  [{index}/{total}] ✅ Parsed: {candidate_name}")

            return ParsedCVResult(
                filename=filename,
                candidate=candidate,
                parsing_errors=None
            )

        except Exception as parse_error:
            print(f"  [{index}/{total}] ❌ Parse failed: {str(parse_error)[:100]}")
            return ParsedCVResult(
                filename=filename,
                candidate=None,
                parsing_errors=str(parse_error)[:500]
            )

    except Exception as e:
        # Catch-all for unexpected errors
        print(f"  [{index}/{total}] ❌ Unexpected error: {str(e)[:100]}")
        return ParsedCVResult(
            filename=filename,
            candidate=None,
            parsing_errors=str(e)[:500]
        )


@router.post("/batch-score", response_model=BatchScoreResponse)
async def batch_score_cvs(
    request: Request,
    files: List[UploadFile] = File(..., description="CV files (PDF/DOCX/DOC/TXT, max 50)"),
    job_title: str = Form(..., description="Job title"),
    job_description: str = Form(..., description="Job description"),
    required_skills: str = Form(default="", description="Comma-separated required skills"),
    preferred_skills: str = Form(default="", description="Comma-separated preferred skills"),
    min_years_experience: float = Form(default=0, description="Minimum years of experience"),
    min_education: str = Form(default=None, description="Minimum education level"),
    db: Session = Depends(get_db)
):
    """Score multiple CVs against a single job description with detailed LLM reviews.

    This endpoint allows recruiters to upload up to 50 CVs and receive detailed
    suitability assessments for each candidate, including:
    - Suitability score (0-100)
    - Strengths and weaknesses
    - Detailed review
    - Recommendation level
    - Risk flags

    Results are sorted by suitability score (best candidates first).

    Args:
        files: List of CV files (max 50, each max 5MB)
        job_title: Job title
        job_description: Detailed job description
        required_skills: Comma-separated list of required skills
        preferred_skills: Comma-separated list of preferred skills
        min_years_experience: Minimum years of experience required
        min_education: Minimum education level (e.g., "bachelors", "masters")

    Returns:
        BatchScoreResponse with detailed reviews for each CV, sorted by score

    Raises:
        400: Invalid input (too many files, file too large)
        422: Validation error
        500: Processing failed
    """
    start_time = time.time()
    request_id = request.state.request_id

    # Validate batch size
    if len(files) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="no_files",
                message="No CV files provided",
                hint="Upload at least one CV file"
            ).model_dump()
        )

    if len(files) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="too_many_files",
                message=f"Too many files. Maximum is {MAX_BATCH_SIZE}",
                hint=f"Reduce number of files to {MAX_BATCH_SIZE} or fewer"
            ).model_dump()
        )

    # Check if LLM is enabled (required for batch scoring)
    if not settings.LLM_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="llm_required",
                message="Batch scoring requires LLM to be enabled",
                hint="Set LLM_ENABLED=true and configure LLM_API_KEY"
            ).model_dump()
        )

    # Build job profile
    try:
        job = JobProfile(
            title=job_title,
            description=job_description,
            required_skills=[s.strip() for s in required_skills.split(",") if s.strip()],
            preferred_skills=[s.strip() for s in preferred_skills.split(",") if s.strip()],
            min_years_experience=min_years_experience if min_years_experience > 0 else None,
            min_education=min_education if min_education else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="invalid_job_profile",
                message=f"Invalid job profile: {str(e)}",
                hint="Check job profile parameters"
            ).model_dump()
        )

    print(f"\n{'='*70}")
    print(f"📦 BATCH SCORING: {len(files)} CVs against '{job_title}'")
    print(f"{'='*70}\n")

    # Get LLM scorer
    try:
        llm_scorer = get_llm_scorer()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorDetail(
                request_id=request_id,
                error_code="llm_init_failed",
                message="Failed to initialize LLM scorer",
                hint=str(e)
            ).model_dump()
        )

    # Process CVs in parallel with asyncio.gather
    print(f"⚡ Processing {len(files)} CVs in parallel...")
    tasks = [
        _process_single_cv(
            file=file,
            job=job,
            llm_scorer=llm_scorer,
            request_id=request_id,
            index=i+1,
            total=len(files)
        )
        for i, file in enumerate(files)
    ]

    reviews = await asyncio.gather(*tasks)

    # Count successes and failures
    successful = sum(1 for r in reviews if not r.parsing_errors)
    failed = sum(1 for r in reviews if r.parsing_errors)

    # Sort by suitability score (descending)
    reviews.sort(key=lambda r: r.suitability_score, reverse=True)

    processing_time = (time.time() - start_time) * 1000

    print(f"\n{'='*70}")
    print(f"✅ BATCH COMPLETE: {successful} successful, {failed} failed")
    print(f"⏱️  Total time: {processing_time:.0f}ms ({processing_time/len(files):.0f}ms avg per CV)")
    print(f"{'='*70}\n")

    # Print top 3 candidates
    if successful > 0:
        print("🏆 TOP CANDIDATES:")
        for i, review in enumerate(reviews[:3], 1):
            if not review.parsing_errors:
                print(f"  {i}. {review.candidate_name or review.filename}: {review.suitability_score}/100 ({review.recommendation})")
        print()

    return BatchScoreResponse(
        request_id=request_id,
        job_title=job_title,
        total_cvs=len(files),
        successful_reviews=successful,
        failed_reviews=failed,
        reviews=reviews,
        processing_time_ms=round(processing_time, 2)
    )


async def _process_single_cv(
    file: UploadFile,
    job: JobProfile,
    llm_scorer,
    request_id: str,
    index: int,
    total: int
) -> CandidateReview:
    """Process a single CV: parse, score, and generate detailed review.

    Args:
        file: Uploaded CV file
        job: Job profile to score against
        llm_scorer: LLM scorer instance
        request_id: Request ID for tracking
        index: Current CV index (1-based)
        total: Total number of CVs

    Returns:
        CandidateReview with detailed assessment
    """
    filename = file.filename
    print(f"[{index}/{total}] Processing: {filename}")

    try:
        # Validate file size
        content = await file.read()
        file_size_mb = len(content) / (1024 * 1024)

        if file_size_mb > MAX_FILE_SIZE_MB:
            return CandidateReview(
                filename=filename,
                suitability_score=0.0,
                recommendation="weak_match",
                strengths=[],
                weaknesses=["File size exceeds maximum allowed size"],
                detailed_review=f"Unable to process: file size ({file_size_mb:.1f}MB) exceeds maximum ({MAX_FILE_SIZE_MB}MB)",
                baseline_scores=_empty_scores(),
                flags=[],
                parsing_errors=f"File too large: {file_size_mb:.1f}MB > {MAX_FILE_SIZE_MB}MB"
            )

        # Detect file type
        file_extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if file_extension not in ["pdf", "docx", "doc", "txt"]:
            return CandidateReview(
                filename=filename,
                suitability_score=0.0,
                recommendation="weak_match",
                strengths=[],
                weaknesses=["Unsupported file format"],
                detailed_review=f"Unable to process: unsupported file format '.{file_extension}'",
                baseline_scores=_empty_scores(),
                flags=[],
                parsing_errors=f"Unsupported file type: .{file_extension}"
            )

        # Parse CV
        try:
            print(f"  [{index}/{total}] 📄 Parsing CV...")
            candidate = await cv_parser.parse_file(
                file_bytes=content,
                filename=filename
            )
            candidate_name = candidate.contact.full_name or "Unknown"
            print(f"  [{index}/{total}] ✅ Parsed: {candidate_name}")
        except Exception as parse_error:
            print(f"  [{index}/{total}] ❌ Parse failed: {str(parse_error)[:100]}")
            return CandidateReview(
                filename=filename,
                suitability_score=0.0,
                recommendation="weak_match",
                strengths=[],
                weaknesses=["CV parsing failed"],
                detailed_review=f"Unable to parse CV: {str(parse_error)[:200]}",
                baseline_scores=_empty_scores(),
                flags=[],
                parsing_errors=str(parse_error)[:500]
            )

        # Score candidate (baseline)
        print(f"  [{index}/{total}] 🎯 Scoring candidate...")
        baseline_result = scorer.score(
            candidate=candidate,
            job=job,
            custom_weights=None,
            request_id=request_id
        )
        print(f"  [{index}/{total}] 📊 Baseline score: {baseline_result.overall_score}/100")

        # Generate detailed review with LLM
        try:
            print(f"  [{index}/{total}] 🤖 Generating LLM review...")
            review_data = await llm_scorer.generate_detailed_review(
                baseline_result=baseline_result,
                candidate=candidate,
                job=job
            )
            print(f"  [{index}/{total}] ✅ Review complete: {review_data['suitability_score']}/100")

            return CandidateReview(
                filename=filename,
                candidate_name=candidate_name,
                suitability_score=review_data["suitability_score"],
                recommendation=review_data["recommendation"],
                strengths=review_data["strengths"],
                weaknesses=review_data["weaknesses"],
                detailed_review=review_data["detailed_review"],
                baseline_scores=baseline_result.breakdown,
                flags=review_data["flags"],
                parsing_errors=None
            )

        except Exception as llm_error:
            # Fallback to baseline-only review
            print(f"  [{index}/{total}] ⚠️  LLM review failed: {str(llm_error)[:100]}")
            print(f"  [{index}/{total}] 🔄 Using baseline-only review")

            # Generate basic review from baseline
            strengths = _extract_strengths_from_baseline(baseline_result, candidate, job)
            weaknesses = [f.description for f in baseline_result.flags[:3]]

            if baseline_result.overall_score >= 80:
                recommendation = "strong_match"
            elif baseline_result.overall_score >= 65:
                recommendation = "good_match"
            elif baseline_result.overall_score >= 50:
                recommendation = "moderate_match"
            else:
                recommendation = "weak_match"

            return CandidateReview(
                filename=filename,
                candidate_name=candidate_name,
                suitability_score=baseline_result.overall_score,
                recommendation=recommendation,
                strengths=strengths,
                weaknesses=weaknesses if weaknesses else ["See detailed scores for analysis"],
                detailed_review=f"Baseline algorithmic score: {baseline_result.overall_score}/100. [LLM review unavailable: {str(llm_error)[:100]}]",
                baseline_scores=baseline_result.breakdown,
                flags=baseline_result.flags,
                parsing_errors=None
            )

    except Exception as e:
        # Catch-all for unexpected errors
        print(f"Unexpected error processing {filename}: {e}")
        return CandidateReview(
            filename=filename,
            suitability_score=0.0,
            recommendation="weak_match",
            strengths=[],
            weaknesses=["Processing failed"],
            detailed_review=f"Unexpected error: {str(e)[:200]}",
            baseline_scores=_empty_scores(),
            flags=[],
            parsing_errors=str(e)[:500]
        )


def _empty_scores() -> ScoreBreakdown:
    """Create empty score breakdown for failed parsing."""
    return ScoreBreakdown(
        skills_score=0.0,
        experience_score=0.0,
        education_score=0.0,
        certifications_score=0.0,
        stability_score=0.0
    )


def _extract_strengths_from_baseline(baseline_result, candidate, job) -> List[str]:
    """Extract key strengths from baseline scoring data."""
    strengths = []

    # Check skill match
    if baseline_result.breakdown.skills_score >= 70:
        matched_skills = len([s for s in candidate.skills if s.name.lower() in [r.lower() for r in job.required_skills]])
        if matched_skills > 0:
            strengths.append(f"Strong technical skills match ({matched_skills} required skills)")

    # Check experience
    if baseline_result.breakdown.experience_score >= 70:
        total_years = sum((w.duration_months or 0) / 12.0 for w in candidate.work_experience)
        strengths.append(f"Solid experience ({total_years:.1f} years total)")

    # Check education
    if baseline_result.breakdown.education_score >= 70:
        if candidate.education:
            strengths.append(f"Education meets requirements")

    # Check stability
    if baseline_result.breakdown.stability_score >= 70:
        strengths.append("Good job stability and tenure")

    # Check certifications
    if candidate.certifications:
        strengths.append(f"Professional certifications ({len(candidate.certifications)})")

    # Fallback
    if not strengths:
        strengths.append("See baseline score breakdown for details")

    return strengths[:5]

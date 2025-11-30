"""Core Pydantic models for ParseScore API."""
from datetime import date
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


# ============================================================================
# ENUMS
# ============================================================================

class ProficiencyLevel(str, Enum):
    """Language proficiency levels."""
    NATIVE = "native"
    FLUENT = "fluent"
    PROFESSIONAL = "professional"
    INTERMEDIATE = "intermediate"
    BASIC = "basic"


class ScoringMode(str, Enum):
    """Scoring modes."""
    BASELINE = "baseline"
    LLM = "llm"


class EducationLevel(str, Enum):
    """Education degree levels."""
    DOCTORATE = "doctorate"
    MASTERS = "masters"
    BACHELORS = "bachelors"
    ASSOCIATES = "associates"
    CERTIFICATE = "certificate"
    HIGH_SCHOOL = "high_school"
    OTHER = "other"


# ============================================================================
# CANDIDATE MODELS (PARSING OUTPUT)
# ============================================================================

class ContactInfo(BaseModel):
    """Extracted contact information."""
    full_name: Optional[str] = None
    emails: List[str] = Field(default_factory=list)  # Changed from EmailStr for flexibility
    phones: List[str] = Field(default_factory=list)
    location: Optional[str] = None  # "City, Country"
    linkedin: Optional[str] = None  # Changed from HttpUrl for flexibility
    github: Optional[str] = None  # Changed from HttpUrl for flexibility
    portfolio: Optional[str] = None  # Changed from HttpUrl for flexibility


class WorkExperience(BaseModel):
    """Single work experience entry."""
    employer: str
    title: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None  # None = current
    duration_months: Optional[int] = None
    location: Optional[str] = None
    bullets: List[str] = Field(default_factory=list)
    inferred_seniority: Optional[str] = None  # "junior", "mid", "senior", "lead"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class Education(BaseModel):
    """Education entry."""
    institution: str
    degree: Optional[EducationLevel] = None
    field: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    gpa: Optional[float] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class Skill(BaseModel):
    """Normalized skill with canonical ID."""
    name: str
    canonical_id: Optional[str] = None  # e.g., "py" for Python
    group: Optional[str] = None  # e.g., "language", "cloud"
    years_experience: Optional[float] = None
    proficiency: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class Certification(BaseModel):
    """Professional certification."""
    name: str
    issuer: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    credential_id: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class Language(BaseModel):
    """Language proficiency."""
    name: str
    proficiency: ProficiencyLevel
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ParsedCandidate(BaseModel):
    """Complete parsed candidate profile."""
    contact: ContactInfo
    work_experience: List[WorkExperience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    skills: List[Skill] = Field(default_factory=list)
    certifications: List[Certification] = Field(default_factory=list)
    languages: List[Language] = Field(default_factory=list)
    raw_text: Optional[str] = None
    file_hash: Optional[str] = None
    parsing_metadata: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# JOB MODELS
# ============================================================================

class JobProfile(BaseModel):
    """Job requirements profile."""
    title: str
    description: str
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    min_years_experience: Optional[float] = None
    preferred_years_experience: Optional[float] = None
    min_education: Optional[EducationLevel] = None
    preferred_education: Optional[EducationLevel] = None
    required_certifications: List[str] = Field(default_factory=list)
    location: Optional[str] = None
    remote_ok: bool = False
    job_metadata: Dict[str, Any] = Field(default_factory=dict)  # ⚠️ Changed from 'metadata'


# ============================================================================
# SCORING MODELS
# ============================================================================

class ScoreBreakdown(BaseModel):
    """Detailed score breakdown."""
    skills_score: float = Field(ge=0.0, le=100.0)
    experience_score: float = Field(ge=0.0, le=100.0)
    education_score: float = Field(ge=0.0, le=100.0)
    certifications_score: float = Field(ge=0.0, le=100.0)
    stability_score: float = Field(ge=0.0, le=100.0)
    
    # Detailed contributions
    skills_contribution: float = 0.0
    experience_contribution: float = 0.0
    education_contribution: float = 0.0
    certifications_contribution: float = 0.0
    stability_contribution: float = 0.0


class RiskFlag(BaseModel):
    """Risk or concern flag."""
    type: str  # "gap", "tenure", "missing_required", etc.
    severity: str  # "low", "medium", "high"
    description: str


class ScoringResult(BaseModel):
    """Complete scoring result."""
    model_config = {"protected_namespaces": ()}
    
    overall_score: float = Field(ge=0.0, le=100.0)
    breakdown: ScoreBreakdown
    rationale: Optional[str] = None
    flags: List[RiskFlag] = Field(default_factory=list)
    mode: ScoringMode
    llm_adjustment: Optional[float] = None  # -10 to +10
    model_version: str
    rules_version: str
    request_id: str


# ============================================================================
# API REQUEST/RESPONSE MODELS
# ============================================================================

class ParseRequest(BaseModel):
    """Request to parse a CV."""
    normalize: bool = True
    return_raw_text: bool = False
    persist: bool = False


class ParseResponse(BaseModel):
    """Response from parse endpoint."""
    request_id: str
    candidate: ParsedCandidate
    processing_time_ms: float


class ScoreRequest(BaseModel):
    """Request to score a candidate."""
    candidate: ParsedCandidate
    job: JobProfile
    mode: ScoringMode = ScoringMode.BASELINE
    custom_weights: Optional[Dict[str, float]] = None


class ScoreResponse(BaseModel):
    """Response from score endpoint."""
    request_id: str
    result: ScoringResult
    processing_time_ms: float


# ============================================================================
# ERROR MODELS
# ============================================================================

class ErrorDetail(BaseModel):
    """Standard error response."""
    request_id: str
    error_code: str
    message: str
    hint: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# ============================================================================
# HEALTH & USAGE
# ============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    uptime_seconds: Optional[float] = None
    version: str = "0.1.0"


# ============================================================================
# BATCH SCORING MODELS
# ============================================================================

class CandidateReview(BaseModel):
    """Detailed candidate review for batch scoring."""
    filename: str
    candidate_name: Optional[str] = None
    suitability_score: float = Field(ge=0.0, le=100.0)
    recommendation: str  # "strong_match", "good_match", "moderate_match", "weak_match"
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    detailed_review: str
    baseline_scores: ScoreBreakdown
    flags: List[RiskFlag] = Field(default_factory=list)
    parsing_errors: Optional[str] = None


class BatchScoreResponse(BaseModel):
    """Response from batch scoring endpoint."""
    request_id: str
    job_title: str
    total_cvs: int
    successful_reviews: int
    failed_reviews: int
    reviews: List[CandidateReview]
    processing_time_ms: float
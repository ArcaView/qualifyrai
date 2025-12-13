"""Interview pack models."""
from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class InterviewQuestion(BaseModel):
    """A single interview question."""
    jd_requirement: str = Field(..., description="The job description requirement this question targets")
    candidate_evidence: Optional[str] = Field(None, description="Snippet from CV that relates, or null if missing")
    main_question: str = Field(..., description="Main interview question")
    follow_up_questions: List[str] = Field(default_factory=list, description="Follow-up questions")
    good_looks_like: str = Field(..., description="What a good answer looks like")
    red_flags: List[str] = Field(default_factory=list, description="Red flags to watch for")
    timebox: int = Field(..., ge=5, le=30, description="Minutes allocated for this question")
    rubric: Dict[str, str] = Field(..., description="Score 1-5 with descriptions")


class InterviewPackRequest(BaseModel):
    """Request to generate an interview pack."""
    job_description: str = Field(..., description="Job description text")
    job_title: str = Field(..., description="Job title")
    candidate: dict = Field(..., description="Candidate data (ParsedCandidate format)")
    duration: int = Field(..., ge=30, le=90, description="Interview duration in minutes (30, 60, or 90)")
    interview_type: Optional[str] = Field(None, description="Type of interview (technical, behavioral, phone_screen, final, other)")


class InterviewPackResponse(BaseModel):
    """Response containing generated interview pack."""
    request_id: str
    pack: dict = Field(..., description="Interview pack data")
    processing_time_ms: float


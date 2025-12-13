"""Models for interview summary generation."""
from pydantic import BaseModel, Field
from typing import Dict, List


class InterviewSummaryRequest(BaseModel):
    """Request to generate an interview summary."""
    candidate_name: str = Field(..., description="Candidate's name")
    job_title: str = Field(..., description="Job title")
    interview_type: str = Field(..., description="Type of interview")
    questions: List[Dict] = Field(..., description="List of interview questions with notes and scores")


class InterviewSummaryResponse(BaseModel):
    """Response with generated interview summary."""
    summary: str = Field(..., description="Generated interview summary")
    overall_score: float = Field(None, description="Overall score if all questions have scores")
    strengths: List[str] = Field(default_factory=list, description="Key strengths identified")
    concerns: List[str] = Field(default_factory=list, description="Areas of concern")


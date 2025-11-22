"""Baseline scoring engine for candidate-job matching."""
from datetime import date, datetime
from typing import List, Dict, Optional, Tuple
from rapidfuzz import fuzz

from app.models import (
    ParsedCandidate, JobProfile, ScoringResult, ScoreBreakdown,
    RiskFlag, ScoringMode, EducationLevel
)


class ScoringEngine:
    """Deterministic baseline scoring engine."""
    
    # Component weights (must sum to 100)
    WEIGHTS = {
        'skills': 55.0,
        'experience': 25.0,
        'education': 10.0,
        'certifications': 5.0,
        'stability': 5.0
    }
    
    # Version tracking for audit
    RULES_VERSION = "1.0.0"
    MODEL_VERSION = "baseline-1.0"
    
    def __init__(self):
        """Initialize scoring engine."""
        self.skill_matcher = SkillMatcher()
    
    def score(
        self,
        candidate: ParsedCandidate,
        job: JobProfile,
        custom_weights: Optional[Dict[str, float]] = None,
        request_id: str = "unknown"
    ) -> ScoringResult:
        """Score a candidate against a job profile.
        
        Args:
            candidate: Parsed candidate data
            job: Job requirements
            custom_weights: Optional custom component weights
            request_id: Request ID for tracking
            
        Returns:
            ScoringResult with overall score, breakdown, and flags
        """
        weights = custom_weights or self.WEIGHTS
        
        # Calculate component scores
        skills_score, skills_contrib = self._score_skills(candidate, job)
        exp_score, exp_contrib = self._score_experience(candidate, job)
        edu_score, edu_contrib = self._score_education(candidate, job)
        cert_score, cert_contrib = self._score_certifications(candidate, job)
        stability_score, stability_contrib = self._score_stability(candidate)
        
        # Calculate weighted overall score
        overall = (
            skills_score * weights['skills'] / 100 +
            exp_score * weights['experience'] / 100 +
            edu_score * weights['education'] / 100 +
            cert_score * weights['certifications'] / 100 +
            stability_score * weights['stability'] / 100
        )
        
        # Generate flags
        flags = self._generate_flags(candidate, job, skills_score, exp_score, stability_score)
        
        # Build breakdown
        breakdown = ScoreBreakdown(
            skills_score=skills_score,
            experience_score=exp_score,
            education_score=edu_score,
            certifications_score=cert_score,
            stability_score=stability_score,
            skills_contribution=skills_contrib,
            experience_contribution=exp_contrib,
            education_contribution=edu_contrib,
            certifications_contribution=cert_contrib,
            stability_contribution=stability_contrib
        )
        
        return ScoringResult(
            overall_score=round(overall, 1),
            breakdown=breakdown,
            rationale=None,  # Baseline mode has no rationale
            flags=flags,
            mode=ScoringMode.BASELINE,
            llm_adjustment=None,
            model_version=self.MODEL_VERSION,
            rules_version=self.RULES_VERSION,
            request_id=request_id
        )
    
    def _score_skills(self, candidate: ParsedCandidate, job: JobProfile) -> Tuple[float, float]:
        """Score skills match (55% weight).
        
        Returns:
            (component_score 0-100, weighted_contribution)
        """
        if not job.required_skills and not job.preferred_skills:
            return 100.0, self.WEIGHTS['skills']
        
        candidate_skills = {s.name.lower(): s for s in candidate.skills}
        
        # Required skills (must have, hard penalty if missing)
        required_score = 0.0
        if job.required_skills:
            matches = 0
            for req_skill in job.required_skills:
                match_strength = self.skill_matcher.match_skill(
                    req_skill,
                    candidate_skills
                )
                matches += match_strength
            required_score = (matches / len(job.required_skills)) * 100
        else:
            required_score = 100.0  # No requirements = full marks
        
        # Preferred skills (nice to have, bonus)
        preferred_score = 0.0
        if job.preferred_skills:
            matches = 0
            for pref_skill in job.preferred_skills:
                match_strength = self.skill_matcher.match_skill(
                    pref_skill,
                    candidate_skills
                )
                matches += match_strength
            preferred_score = (matches / len(job.preferred_skills)) * 100
        
        # Weighted combination: required is 70%, preferred is 30%
        if job.required_skills:
            component_score = required_score * 0.7 + preferred_score * 0.3
        else:
            component_score = preferred_score
        
        contribution = component_score * self.WEIGHTS['skills'] / 100
        return component_score, contribution
    
    def _score_experience(self, candidate: ParsedCandidate, job: JobProfile) -> Tuple[float, float]:
        """Score work experience (25% weight).
        
        Returns:
            (component_score 0-100, weighted_contribution)
        """
        if not candidate.work_experience:
            return 0.0, 0.0
        
        # Calculate total relevant years with recency weighting
        total_months = 0
        weighted_months = 0.0
        current_year = date.today().year
        
        for work in candidate.work_experience:
            if work.duration_months:
                total_months += work.duration_months
                
                # Apply recency decay
                if work.end_date:
                    years_ago = current_year - work.end_date.year
                    recency_factor = max(0.5, 1.0 - (years_ago * 0.1))
                else:
                    recency_factor = 1.0  # Current role
                
                weighted_months += work.duration_months * recency_factor
        
        total_years = total_months / 12.0
        weighted_years = weighted_months / 12.0
        
        # Score against requirements
        if job.min_years_experience:
            if total_years >= job.min_years_experience:
                # Meet minimum, score based on how much experience vs preferred
                preferred = job.preferred_years_experience or job.min_years_experience * 1.5
                excess = min(weighted_years - job.min_years_experience, preferred - job.min_years_experience)
                component_score = 70 + (excess / (preferred - job.min_years_experience)) * 30
            else:
                # Below minimum, proportional penalty
                component_score = (total_years / job.min_years_experience) * 70
        else:
            # No requirements, score based on absolute experience
            component_score = min(100.0, (weighted_years / 5.0) * 100)  # 5 years = 100%
        
        contribution = component_score * self.WEIGHTS['experience'] / 100
        return min(100.0, component_score), contribution
    
    def _score_education(self, candidate: ParsedCandidate, job: JobProfile) -> Tuple[float, float]:
        """Score education (10% weight).
        
        Returns:
            (component_score 0-100, weighted_contribution)
        """
        if not candidate.education:
            if job.min_education:
                return 0.0, 0.0
            return 50.0, self.WEIGHTS['education'] * 0.5  # Partial credit if no req
        
        # Education level hierarchy
        level_rank = {
            EducationLevel.HIGH_SCHOOL: 1,
            EducationLevel.CERTIFICATE: 2,
            EducationLevel.ASSOCIATES: 3,
            EducationLevel.BACHELORS: 4,
            EducationLevel.MASTERS: 5,
            EducationLevel.DOCTORATE: 6
        }
        
        # Get highest candidate degree
        highest_degree = None
        for edu in candidate.education:
            if edu.degree and (not highest_degree or level_rank.get(edu.degree, 0) > level_rank.get(highest_degree, 0)):
                highest_degree = edu.degree
        
        if not job.min_education:
            # No requirement, give credit for having education
            if highest_degree:
                return 100.0, self.WEIGHTS['education']
            return 50.0, self.WEIGHTS['education'] * 0.5
        
        # Compare to requirements
        min_rank = level_rank.get(job.min_education, 0)
        candidate_rank = level_rank.get(highest_degree, 0) if highest_degree else 0
        
        if candidate_rank >= min_rank:
            component_score = 100.0
            # Bonus for exceeding preferred
            if job.preferred_education:
                pref_rank = level_rank.get(job.preferred_education, 0)
                if candidate_rank >= pref_rank:
                    component_score = 100.0
        else:
            # Below minimum
            component_score = (candidate_rank / min_rank) * 70 if min_rank > 0 else 0.0
        
        contribution = component_score * self.WEIGHTS['education'] / 100
        return component_score, contribution
    
    def _score_certifications(self, candidate: ParsedCandidate, job: JobProfile) -> Tuple[float, float]:
        """Score certifications (5% weight).
        
        Returns:
            (component_score 0-100, weighted_contribution)
        """
        if not job.required_certifications:
            # No requirements, give credit for having any
            if candidate.certifications:
                return 100.0, self.WEIGHTS['certifications']
            return 50.0, self.WEIGHTS['certifications'] * 0.5
        
        if not candidate.certifications:
            return 0.0, 0.0
        
        # Match required certifications
        candidate_certs = {c.name.lower() for c in candidate.certifications}
        matches = 0
        
        for req_cert in job.required_certifications:
            for cand_cert in candidate_certs:
                if fuzz.ratio(req_cert.lower(), cand_cert) > 80:
                    matches += 1
                    break
        
        component_score = (matches / len(job.required_certifications)) * 100
        contribution = component_score * self.WEIGHTS['certifications'] / 100
        return component_score, contribution
    
    def _score_stability(self, candidate: ParsedCandidate) -> Tuple[float, float]:
        """Score job stability (5% weight).
        
        Returns:
            (component_score 0-100, weighted_contribution)
        """
        if not candidate.work_experience or len(candidate.work_experience) < 2:
            return 80.0, self.WEIGHTS['stability'] * 0.8  # Neutral for limited history
        
        # Calculate average tenure
        tenures = []
        for work in candidate.work_experience:
            if work.duration_months:
                tenures.append(work.duration_months)
        
        if not tenures:
            return 80.0, self.WEIGHTS['stability'] * 0.8
        
        avg_tenure_months = sum(tenures) / len(tenures)
        avg_tenure_years = avg_tenure_months / 12.0
        
        # Score based on average tenure
        # 2+ years = excellent, 1-2 years = good, <1 year = concerning
        if avg_tenure_years >= 2.0:
            component_score = 100.0
        elif avg_tenure_years >= 1.0:
            component_score = 70.0 + (avg_tenure_years - 1.0) * 30
        else:
            component_score = avg_tenure_years * 70.0
        
        # Penalty for many short stints (job hopping)
        short_stints = sum(1 for t in tenures if t < 12)
        if short_stints >= 3:
            component_score *= 0.7
        
        contribution = component_score * self.WEIGHTS['stability'] / 100
        return component_score, contribution
    
    def _generate_flags(
        self,
        candidate: ParsedCandidate,
        job: JobProfile,
        skills_score: float,
        exp_score: float,
        stability_score: float
    ) -> List[RiskFlag]:
        """Generate risk flags based on scoring."""
        flags = []
        
        # Missing critical skills
        if skills_score < 60:
            flags.append(RiskFlag(
                type="missing_required_skills",
                severity="high",
                description=f"Skills match is low ({skills_score:.0f}/100). May lack required competencies."
            ))
        
        # Insufficient experience
        if exp_score < 50:
            flags.append(RiskFlag(
                type="insufficient_experience",
                severity="medium",
                description=f"Experience score is low ({exp_score:.0f}/100). May not meet minimum requirements."
            ))
        
        # Stability concerns
        if stability_score < 60:
            flags.append(RiskFlag(
                type="tenure_volatility",
                severity="medium",
                description=f"Stability score is low ({stability_score:.0f}/100). History of short tenures."
            ))
        
        # Check for employment gaps (>6 months)
        if candidate.work_experience:
            sorted_work = sorted(
                candidate.work_experience,
                key=lambda w: w.start_date or date.min
            )
            for i in range(len(sorted_work) - 1):
                current = sorted_work[i]
                next_job = sorted_work[i + 1]
                
                if current.end_date and next_job.start_date:
                    gap_months = (
                        (next_job.start_date.year - current.end_date.year) * 12 +
                        (next_job.start_date.month - current.end_date.month)
                    )
                    if gap_months > 6:
                        flags.append(RiskFlag(
                            type="employment_gap",
                            severity="low",
                            description=f"Gap of {gap_months} months between {current.employer} and {next_job.employer}"
                        ))
                        break  # Only flag once
        
        return flags


class SkillMatcher:
    """Fuzzy skill matching with canonical taxonomy support."""
    
    def __init__(self):
        """Initialize skill matcher."""
        # TODO: Load from taxonomy file
        self.synonyms = {
            'python': ['python3', 'py'],
            'javascript': ['js', 'javascript', 'ecmascript'],
            'aws': ['amazon web services', 'aws'],
            'gcp': ['google cloud', 'google cloud platform', 'gcp'],
            'kubernetes': ['k8s', 'kubernetes'],
            'docker': ['docker', 'containerization'],
            'postgresql': ['postgres', 'postgresql', 'psql'],
            'react': ['reactjs', 'react.js', 'react'],
        }
    
    def match_skill(self, required: str, candidate_skills: Dict[str, any]) -> float:
        """Match a required skill against candidate skills.
        
        Args:
            required: Required skill name
            candidate_skills: Dict of candidate skill names (lowercase) -> Skill objects
            
        Returns:
            Match strength: 1.0 (exact), 0.8 (synonym), 0.5 (fuzzy), 0.0 (no match)
        """
        required_lower = required.lower()
        
        # Exact match
        if required_lower in candidate_skills:
            return 1.0
        
        # Synonym match
        for canonical, syns in self.synonyms.items():
            if required_lower in syns or required_lower == canonical:
                for syn in syns:
                    if syn in candidate_skills:
                        return 0.8
        
        # Fuzzy match
        for cand_skill in candidate_skills.keys():
            ratio = fuzz.ratio(required_lower, cand_skill)
            if ratio > 85:
                return 0.6
            elif ratio > 70:
                return 0.4
        
        return 0.0
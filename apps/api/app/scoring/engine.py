"""Baseline scoring engine for candidate-job matching."""
from datetime import date, datetime
from typing import List, Dict, Optional, Tuple
from rapidfuzz import fuzz

from app.models import (
    ParsedCandidate, JobProfile, ScoringResult, ScoreBreakdown,
    RiskFlag, ScoringMode, EducationLevel
)


class PrestigeDetector:
    """Detect prestige/quality of institutions and companies."""

    # Top-tier universities (global rankings)
    TIER_1_UNIVERSITIES = {
        'oxford', 'cambridge', 'harvard', 'stanford', 'mit', 'yale', 'princeton',
        'caltech', 'berkeley', 'imperial', 'eth zurich', 'university college london',
        'ucl', 'london school of economics', 'lse', 'columbia', 'chicago'
    }

    # Strong universities (Russell Group, top US state schools, etc.)
    TIER_2_UNIVERSITIES = {
        'manchester', 'edinburgh', 'warwick', 'bristol', 'durham',
        'nottingham', 'birmingham', 'leeds', 'sheffield', 'southampton',
        'reading',  # Good for some subjects, solid overall
        'ucla', 'michigan', 'virginia', 'texas', 'washington', 'cornell',
        'penn', 'duke', 'northwestern', 'johns hopkins', 'carnegie mellon'
    }

    # Prestigious companies (FAANG, Big 4, major banks, consulting)
    TIER_1_COMPANIES = {
        'google', 'apple', 'microsoft', 'amazon', 'meta', 'facebook',
        'goldman sachs', 'morgan stanley', 'jp morgan', 'jpmorgan',
        'mckinsey', 'bain', 'bcg', 'boston consulting',
        'deloitte', 'pwc', 'ey', 'kpmg', 'accenture'
    }

    # Well-known companies (established firms, boutiques, regional players)
    TIER_2_COMPANIES = {
        'salesforce', 'adobe', 'oracle', 'ibm', 'uber', 'airbnb',
        'barclays', 'hsbc', 'citi', 'citigroup', 'credit suisse',
        'rothschild', 'lazard', 'evercore', 'moelis'
    }

    # Lesser-known but legitimate companies (small boutiques, startups)
    TIER_3_COMPANIES = {
        'laven partners',  # Small boutique - good experience but not prestigious
        'rolabotic'  # Small consulting/startup
    }

    @classmethod
    def get_university_prestige_multiplier(cls, institution_name: str) -> float:
        """
        Get prestige multiplier for a university.

        Returns:
            1.3 for Tier 1, 1.15 for Tier 2, 1.0 for others
        """
        if not institution_name:
            return 1.0

        name_lower = institution_name.lower()

        # Check Tier 1
        for uni in cls.TIER_1_UNIVERSITIES:
            if uni in name_lower:
                return 1.3

        # Check Tier 2
        for uni in cls.TIER_2_UNIVERSITIES:
            if uni in name_lower:
                return 1.15

        return 1.0

    @classmethod
    def get_company_prestige_multiplier(cls, company_name: str) -> float:
        """
        Get prestige multiplier for a company.

        Returns:
            1.4 for Tier 1, 1.2 for Tier 2, 1.05 for Tier 3, 1.0 for unknown
        """
        if not company_name:
            return 1.0

        name_lower = company_name.lower()

        # Check Tier 1 (prestigious: FAANG, Big 4, major banks)
        for company in cls.TIER_1_COMPANIES:
            if company in name_lower:
                return 1.4

        # Check Tier 2 (well-known: established firms, boutiques)
        for company in cls.TIER_2_COMPANIES:
            if company in name_lower:
                return 1.2

        # Check Tier 3 (lesser-known but legitimate)
        for company in cls.TIER_3_COMPANIES:
            if company in name_lower:
                return 1.05

        return 1.0


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
    RULES_VERSION = "2.1.0"  # Added job-level awareness
    MODEL_VERSION = "baseline-2.1"

    # Job level keywords
    INTERN_KEYWORDS = ['intern', 'internship', 'trainee', 'placement', 'summer analyst', 'spring week']
    ENTRY_LEVEL_KEYWORDS = ['entry', 'junior', 'graduate', 'analyst', 'associate', 'assistant']
    SENIOR_KEYWORDS = ['senior', 'lead', 'principal', 'staff', 'head', 'director', 'manager', 'vp', 'vice president']

    def __init__(self):
        """Initialize scoring engine."""
        self.skill_matcher = SkillMatcher()

    def _detect_job_level(self, job: JobProfile) -> str:
        """
        Detect the job level from title and description.

        Returns:
            'intern', 'entry', 'mid', or 'senior'
        """
        title_lower = job.title.lower()
        desc_lower = job.description.lower()
        combined = f"{title_lower} {desc_lower}"

        # Check for intern first (most specific)
        if any(kw in combined for kw in self.INTERN_KEYWORDS):
            return 'intern'

        # Check for senior
        if any(kw in combined for kw in self.SENIOR_KEYWORDS):
            return 'senior'

        # Check for entry-level
        if any(kw in combined for kw in self.ENTRY_LEVEL_KEYWORDS):
            return 'entry'

        # Check experience requirements as fallback
        if job.min_years_experience:
            if job.min_years_experience <= 1:
                return 'entry'
            elif job.min_years_experience <= 3:
                return 'mid'
            else:
                return 'senior'

        # Default to mid-level
        return 'mid'
    
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

        # Detect job level for context-aware scoring
        job_level = self._detect_job_level(job)

        # Calculate component scores (all now job-level aware)
        skills_score, skills_contrib = self._score_skills(candidate, job, job_level)
        exp_score, exp_contrib = self._score_experience(candidate, job, job_level)
        edu_score, edu_contrib = self._score_education(candidate, job, job_level)
        cert_score, cert_contrib = self._score_certifications(candidate, job, job_level)
        stability_score, stability_contrib = self._score_stability(candidate, job_level)
        
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
            skills_score=round(skills_score, 2),
            experience_score=round(exp_score, 2),
            education_score=round(edu_score, 2),
            certifications_score=round(cert_score, 2),
            stability_score=round(stability_score, 2),
            skills_contribution=round(skills_contrib, 2),
            experience_contribution=round(exp_contrib, 2),
            education_contribution=round(edu_contrib, 2),
            certifications_contribution=round(cert_contrib, 2),
            stability_contribution=round(stability_contrib, 2)
        )

        return ScoringResult(
            overall_score=round(overall, 2),  # Round to 2 decimal places
            breakdown=breakdown,
            rationale=None,  # Baseline mode has no rationale
            flags=flags,
            mode=ScoringMode.BASELINE,
            llm_adjustment=None,
            model_version=self.MODEL_VERSION,
            rules_version=self.RULES_VERSION,
            request_id=request_id
        )
    
    def _score_skills(self, candidate: ParsedCandidate, job: JobProfile, job_level: str) -> Tuple[float, float]:
        """Score skills match (55% weight) with flexible matching and job-level awareness.

        Args:
            candidate: Candidate data
            job: Job requirements
            job_level: 'intern', 'entry', 'mid', or 'senior'

        Returns:
            (component_score 0-100, weighted_contribution)
        """
        if not job.required_skills and not job.preferred_skills:
            # No requirements: give credit for having any skills
            if candidate.skills and len(candidate.skills) > 0:
                # Scale by number of skills (5+ skills = 80)
                component_score = min(80.0, 55 + len(candidate.skills) * 5)
            else:
                component_score = 50.0
            return round(component_score, 2), round(self.WEIGHTS['skills'] * component_score / 100, 2)

        candidate_skills = {s.name.lower(): s for s in candidate.skills}

        # For interns/entry-level: extract skills from coursework in education
        if job_level in ['intern', 'entry'] and candidate.education:
            for edu in candidate.education:
                # Look for relevant coursework in institution name or as field
                coursework_text = f"{edu.field or ''} {edu.institution or ''}".lower()

                # Finance coursework keywords
                finance_keywords = {
                    'corporate finance': 'corporate finance',
                    'financial modelling': 'financial modeling',
                    'financial modeling': 'financial modeling',
                    'portfolio management': 'portfolio management',
                    'fx': 'foreign exchange',
                    'debt markets': 'debt markets',
                    'econometrics': 'econometrics',
                    'accounting': 'accounting',
                    'valuation': 'valuation',
                    'investment': 'investment',
                    'financial analysis': 'financial analysis'
                }

                for keyword, skill_name in finance_keywords.items():
                    if keyword in coursework_text and skill_name not in candidate_skills:
                        # Add as a skill with slightly lower confidence
                        candidate_skills[skill_name] = f"coursework:{skill_name}"

        # Give base credit for having ANY skills (reduces harshness)
        # Higher base credit for interns (they're learning!)
        if job_level == 'intern':
            base_credit = min(40.0, len(candidate_skills) * 4) if candidate_skills else 0.0
        elif job_level == 'entry':
            base_credit = min(35.0, len(candidate_skills) * 3.5) if candidate_skills else 0.0
        else:
            base_credit = min(30.0, len(candidate_skills) * 3) if candidate_skills else 0.0

        # Required skills (must have, but less harsh)
        required_score = 0.0
        if job.required_skills:
            matches = 0.0
            for req_skill in job.required_skills:
                match_strength = self.skill_matcher.match_skill(
                    req_skill,
                    candidate_skills
                )
                matches += match_strength

            # More generous scoring: even partial matches count
            match_ratio = matches / len(job.required_skills)
            if match_ratio >= 0.8:  # 80%+ match
                required_score = min(95.0, 85 + (match_ratio - 0.8) * 50)
            elif match_ratio >= 0.5:  # 50-80% match
                required_score = 70 + (match_ratio - 0.5) * 50
            elif match_ratio >= 0.3:  # 30-50% match
                required_score = 50 + (match_ratio - 0.3) * 100
            else:  # <30% match
                required_score = base_credit + (match_ratio * 67)
        else:
            required_score = 85.0  # No requirements = good

        # Preferred skills (nice to have, bonus)
        preferred_score = 0.0
        if job.preferred_skills:
            matches = 0.0
            for pref_skill in job.preferred_skills:
                match_strength = self.skill_matcher.match_skill(
                    pref_skill,
                    candidate_skills
                )
                matches += match_strength

            match_ratio = matches / len(job.preferred_skills)
            preferred_score = min(92.0, match_ratio * 92)

        # Weighted combination: required is 65%, preferred is 35% (slightly less harsh on required)
        if job.required_skills:
            component_score = required_score * 0.65 + preferred_score * 0.35
        else:
            component_score = preferred_score

        # Ensure minimum score if candidate has any relevant skills
        if component_score < base_credit and candidate.skills:
            component_score = base_credit

        # Round to 2 decimal places
        component_score = round(component_score, 2)
        contribution = round(component_score * self.WEIGHTS['skills'] / 100, 2)
        return component_score, contribution
    
    def _score_experience(self, candidate: ParsedCandidate, job: JobProfile, job_level: str) -> Tuple[float, float]:
        """Score work experience (25% weight) with prestige and job-level consideration.

        Args:
            candidate: Candidate data
            job: Job requirements
            job_level: 'intern', 'entry', 'mid', or 'senior'

        Returns:
            (component_score 0-100, weighted_contribution)
        """
        if not candidate.work_experience:
            # No experience is OK for interns, less OK for others
            if job_level == 'intern':
                return 65.0, round(self.WEIGHTS['experience'] * 0.65, 2)
            elif job_level == 'entry':
                return 30.0, round(self.WEIGHTS['experience'] * 0.30, 2)
            return 0.0, 0.0

        # Calculate total relevant years with recency and prestige weighting
        total_months = 0
        weighted_months = 0.0
        prestige_weighted_months = 0.0
        current_year = date.today().year
        max_prestige = 1.0

        for work in candidate.work_experience:
            if work.duration_months:
                total_months += work.duration_months

                # Get company prestige multiplier
                prestige_mult = PrestigeDetector.get_company_prestige_multiplier(work.employer)
                max_prestige = max(max_prestige, prestige_mult)

                # Apply recency decay
                if work.end_date:
                    years_ago = current_year - work.end_date.year
                    recency_factor = max(0.5, 1.0 - (years_ago * 0.1))
                else:
                    recency_factor = 1.0  # Current role

                weighted_months += work.duration_months * recency_factor
                prestige_weighted_months += work.duration_months * recency_factor * prestige_mult

        total_years = total_months / 12.0
        weighted_years = weighted_months / 12.0
        prestige_years = prestige_weighted_months / 12.0

        # Determine if this looks like an internship/entry-level candidate
        is_likely_intern = all(
            work.duration_months and work.duration_months <= 6
            for work in candidate.work_experience
        )

        # Score against requirements - ADJUSTED FOR JOB LEVEL
        if job_level == 'intern':
            # For intern roles: score varies significantly by company prestige
            if is_likely_intern or total_years < 1:
                # Score based on company tier
                if max_prestige >= 1.4:
                    # Tier 1 company (FAANG, Big 4, etc.)
                    base_score = 70.0
                    max_bonus = 25.0
                    target_years = 0.5
                elif max_prestige >= 1.2:
                    # Tier 2 company (well-known firms)
                    base_score = 60.0
                    max_bonus = 25.0
                    target_years = 0.5
                elif max_prestige >= 1.05:
                    # Tier 3 company (small boutiques)
                    base_score = 45.0
                    max_bonus = 20.0
                    target_years = 0.5
                else:
                    # Unknown company
                    base_score = 35.0
                    max_bonus = 15.0
                    target_years = 0.5

                # Add bonus based on prestige-weighted experience
                bonus = (prestige_years / target_years) * max_bonus
                component_score = min(base_score + max_bonus, base_score + bonus)
            else:
                # Overqualified but still good
                component_score = 90.0 + (max_prestige - 1.0) * 5

        elif job_level == 'entry':
            # For entry-level: 0-2 years is ideal
            if total_years <= 2:
                base_score = 75.0 + (prestige_years / 2.0) * 20
                component_score = min(95.0, base_score)
            else:
                # Experienced but applying to entry-level
                component_score = 85.0

        else:
            # Mid/Senior roles: use traditional scoring
            if job.min_years_experience:
                if total_years >= job.min_years_experience:
                    # Meet minimum - use prestige-weighted years for scoring
                    preferred = job.preferred_years_experience or job.min_years_experience * 1.5
                    excess = min(prestige_years - job.min_years_experience, preferred - job.min_years_experience)
                    # Relaxed cap: 95 instead of 90
                    component_score = min(95.0, 75 + (excess / (preferred - job.min_years_experience)) * 20)
                else:
                    # Below minimum but account for prestige
                    base_score = (total_years / job.min_years_experience) * 75
                    # Boost for prestigious companies even if experience is short
                    prestige_boost = (max_prestige - 1.0) * 20
                    component_score = min(85.0, base_score + prestige_boost)
            else:
                # No requirements - score based on experience and prestige
                # Regular experience: 6+ years = 90%, prestige can push higher
                base_score = min(85.0, (weighted_years / 6.0) * 85)
                prestige_boost = (max_prestige - 1.0) * 10
                component_score = min(95.0, base_score + prestige_boost)

        # Round to 2 decimal places
        component_score = round(component_score, 2)
        contribution = round(component_score * self.WEIGHTS['experience'] / 100, 2)
        return component_score, contribution
    
    def _score_education(self, candidate: ParsedCandidate, job: JobProfile, job_level: str) -> Tuple[float, float]:
        """Score education (10% weight) with university prestige.

        Args:
            candidate: Candidate data
            job: Job requirements
            job_level: 'intern', 'entry', 'mid', or 'senior'

        Returns:
            (component_score 0-100, weighted_contribution)
        """
        if not candidate.education:
            if job.min_education:
                return 0.0, 0.0
            return round(50.0, 2), round(self.WEIGHTS['education'] * 0.5, 2)

        # Education level hierarchy
        level_rank = {
            EducationLevel.HIGH_SCHOOL: 1,
            EducationLevel.CERTIFICATE: 2,
            EducationLevel.ASSOCIATES: 3,
            EducationLevel.BACHELORS: 4,
            EducationLevel.MASTERS: 5,
            EducationLevel.DOCTORATE: 6
        }

        # Get highest candidate degree and best institution prestige
        highest_degree = None
        best_institution = None
        max_prestige = 1.0

        for edu in candidate.education:
            if edu.degree:
                current_rank = level_rank.get(edu.degree, 0)
                highest_rank = level_rank.get(highest_degree, 0) if highest_degree else 0

                if current_rank > highest_rank:
                    highest_degree = edu.degree
                    best_institution = edu.institution

                # Track best prestige across all institutions
                prestige = PrestigeDetector.get_university_prestige_multiplier(edu.institution)
                max_prestige = max(max_prestige, prestige)

        if not job.min_education:
            # No requirement, give credit for education + prestige
            if highest_degree:
                # Base score by degree level
                candidate_rank = level_rank.get(highest_degree, 0)
                base_score = min(80.0, 50 + (candidate_rank * 8))

                # Prestige boost
                prestige_boost = (max_prestige - 1.0) * 20
                component_score = min(92.0, base_score + prestige_boost)
            else:
                component_score = 50.0
            contribution = round(component_score * self.WEIGHTS['education'] / 100, 2)
            return round(component_score, 2), contribution

        # Compare to requirements
        min_rank = level_rank.get(job.min_education, 0)
        candidate_rank = level_rank.get(highest_degree, 0) if highest_degree else 0

        if candidate_rank >= min_rank:
            # Meets minimum: base 88 score
            component_score = 88.0

            # Bonus for exceeding preferred
            if job.preferred_education:
                pref_rank = level_rank.get(job.preferred_education, 0)
                if candidate_rank >= pref_rank:
                    component_score = 93.0

            # Prestige boost (can push to 98)
            prestige_boost = (max_prestige - 1.0) * 15
            component_score = min(98.0, component_score + prestige_boost)
        else:
            # Below minimum but prestige helps
            base_score = (candidate_rank / min_rank) * 70 if min_rank > 0 else 0.0
            prestige_boost = (max_prestige - 1.0) * 15
            component_score = min(80.0, base_score + prestige_boost)

        # Round to 2 decimal places
        component_score = round(component_score, 2)
        contribution = round(component_score * self.WEIGHTS['education'] / 100, 2)
        return component_score, contribution
    
    def _score_certifications(self, candidate: ParsedCandidate, job: JobProfile, job_level: str) -> Tuple[float, float]:
        """Score certifications (5% weight).

        Args:
            candidate: Candidate data
            job: Job requirements
            job_level: 'intern', 'entry', 'mid', or 'senior'

        Returns:
            (component_score 0-100, weighted_contribution)
        """
        if not job.required_certifications:
            # No requirements, give credit for having any (but not perfect)
            if candidate.certifications:
                # Having certs is good but not 100%
                component_score = min(80.0, 50 + len(candidate.certifications) * 10)
            else:
                component_score = 50.0
            contribution = round(component_score * self.WEIGHTS['certifications'] / 100, 2)
            return round(component_score, 2), contribution

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

        # Cap at 90 instead of 100
        component_score = min(90.0, (matches / len(job.required_certifications)) * 90)

        # Round to 2 decimal places
        component_score = round(component_score, 2)
        contribution = round(component_score * self.WEIGHTS['certifications'] / 100, 2)
        return component_score, contribution
    
    def _score_stability(self, candidate: ParsedCandidate, job_level: str) -> Tuple[float, float]:
        """Score job stability (5% weight) - job-level aware.

        Args:
            candidate: Candidate data
            job_level: 'intern', 'entry', 'mid', or 'senior'

        Returns:
            (component_score 0-100, weighted_contribution)
        """
        if not candidate.work_experience or len(candidate.work_experience) < 2:
            # Limited history is fine for interns/entry
            if job_level in ['intern', 'entry']:
                return round(85.0, 2), round(self.WEIGHTS['stability'] * 0.85, 2)
            return round(75.0, 2), round(self.WEIGHTS['stability'] * 0.75, 2)

        # Detect if candidate's experience is primarily internships/temp roles
        is_early_career = all(
            work.duration_months and work.duration_months <= 6
            for work in candidate.work_experience
        )

        # For intern/entry-level jobs OR early-career candidates:
        # Don't penalize short tenures (they're expected!)
        if job_level in ['intern', 'entry'] or is_early_career:
            # Check for relevant experience, not tenure length
            has_multiple_experiences = len(candidate.work_experience) >= 2
            if has_multiple_experiences:
                component_score = 85.0  # Good - they've tried different roles
            else:
                component_score = 80.0  # Fine - still learning

            # Round to 2 decimal places
            component_score = round(component_score, 2)
            contribution = round(component_score * self.WEIGHTS['stability'] / 100, 2)
            return component_score, contribution

        # For mid/senior roles: traditional stability scoring
        # Calculate average tenure
        tenures = []
        for work in candidate.work_experience:
            if work.duration_months:
                tenures.append(work.duration_months)

        if not tenures:
            return round(75.0, 2), round(self.WEIGHTS['stability'] * 0.75, 2)

        avg_tenure_months = sum(tenures) / len(tenures)
        avg_tenure_years = avg_tenure_months / 12.0

        # Score based on average tenure
        # 4+ years = 90, 3 years = 85, 2 years = 75, 1-2 years = 60-75
        if avg_tenure_years >= 4.0:
            component_score = 90.0
        elif avg_tenure_years >= 3.0:
            component_score = 85.0
        elif avg_tenure_years >= 2.0:
            component_score = 75.0
        elif avg_tenure_years >= 1.0:
            component_score = 60.0 + (avg_tenure_years - 1.0) * 15
        else:
            component_score = avg_tenure_years * 60.0

        # Penalty for many short stints (job hopping) - only for mid/senior
        short_stints = sum(1 for t in tenures if t < 12)
        if short_stints >= 3:
            component_score *= 0.7

        # Round to 2 decimal places
        component_score = round(component_score, 2)
        contribution = round(component_score * self.WEIGHTS['stability'] / 100, 2)
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
        """Initialize skill matcher with expanded synonyms."""
        # Expanded skill synonyms for better matching
        self.synonyms = {
            # Programming
            'python': ['python', 'python3', 'py'],
            'javascript': ['js', 'javascript', 'ecmascript', 'node', 'nodejs'],
            'java': ['java'],
            'csharp': ['c#', 'csharp', 'c-sharp', '.net'],
            'sql': ['sql', 'structured query language', 'database'],

            # Cloud & DevOps
            'aws': ['amazon web services', 'aws', 'amazon cloud'],
            'gcp': ['google cloud', 'google cloud platform', 'gcp'],
            'azure': ['azure', 'microsoft azure'],
            'kubernetes': ['k8s', 'kubernetes'],
            'docker': ['docker', 'containerization', 'containers'],

            # Databases
            'postgresql': ['postgres', 'postgresql', 'psql'],
            'mysql': ['mysql'],
            'mongodb': ['mongo', 'mongodb'],

            # Web frameworks
            'react': ['reactjs', 'react.js', 'react'],
            'angular': ['angular', 'angularjs'],
            'vue': ['vue', 'vuejs', 'vue.js'],

            # Finance & Business
            'excel': ['excel', 'microsoft excel', 'spreadsheets'],
            'financial_modeling': ['financial modeling', 'financial modelling', 'modeling', 'modelling'],
            'financial_analysis': ['financial analysis', 'finance', 'financial'],
            'accounting': ['accounting', 'accountancy'],
            'valuation': ['valuation', 'company valuation', 'dcf'],
            'portfolio_management': ['portfolio management', 'portfolio', 'investment management'],
            'risk_management': ['risk management', 'risk'],
            'data_analysis': ['data analysis', 'analytics', 'data analytics'],
            'powerpoint': ['powerpoint', 'presentations', 'ppt'],
            'communication': ['communication', 'presentation', 'writing'],
        }

        # Common skill categories for broader matching
        self.categories = {
            'finance': ['finance', 'financial', 'accounting', 'investment', 'banking'],
            'programming': ['programming', 'coding', 'development', 'software'],
            'data': ['data', 'analytics', 'analysis', 'statistics'],
            'cloud': ['cloud', 'aws', 'azure', 'gcp'],
        }

    def match_skill(self, required: str, candidate_skills: Dict[str, any]) -> float:
        """Match a required skill against candidate skills with flexible matching.

        Args:
            required: Required skill name
            candidate_skills: Dict of candidate skill names (lowercase) -> Skill objects

        Returns:
            Match strength: 1.0 (exact), 0.85 (synonym), 0.7 (fuzzy high), 0.5 (fuzzy med), 0.3 (fuzzy low)
        """
        required_lower = required.lower().strip()

        # Exact match
        if required_lower in candidate_skills:
            return 1.0

        # Check if any candidate skill contains the required skill (or vice versa)
        for cand_skill in candidate_skills.keys():
            if required_lower in cand_skill or cand_skill in required_lower:
                # Partial containment (e.g., "financial" matches "financial analysis")
                return 0.9

        # Synonym match
        for canonical, syns in self.synonyms.items():
            if required_lower in syns or required_lower == canonical:
                for syn in syns:
                    if syn in candidate_skills:
                        return 0.85
                    # Check partial matches in synonyms
                    for cand_skill in candidate_skills.keys():
                        if syn in cand_skill or cand_skill in syn:
                            return 0.8

        # Category match (broader matching)
        for category, keywords in self.categories.items():
            if any(kw in required_lower for kw in keywords):
                for cand_skill in candidate_skills.keys():
                    if any(kw in cand_skill for kw in keywords):
                        return 0.6

        # Fuzzy match with more generous thresholds
        best_ratio = 0
        for cand_skill in candidate_skills.keys():
            ratio = fuzz.ratio(required_lower, cand_skill)
            best_ratio = max(best_ratio, ratio)

            # Also try partial ratio for better matching
            partial_ratio = fuzz.partial_ratio(required_lower, cand_skill)
            best_ratio = max(best_ratio, partial_ratio * 0.9)  # Slightly lower weight for partial

        if best_ratio > 80:
            return 0.7
        elif best_ratio > 65:
            return 0.5
        elif best_ratio > 50:
            return 0.3

        return 0.0
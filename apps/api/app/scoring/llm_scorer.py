"""LLM-enhanced scoring with rationale generation."""
import json
from typing import Optional, Dict, Any
from datetime import datetime
import asyncio

from app.models import (
    ParsedCandidate, JobProfile, ScoringResult, ScoreBreakdown,
    RiskFlag, ScoringMode
)
from app.config import settings


class LLMScorer:
    """LLM-enhanced scoring that adds rationale and score adjustment to baseline."""
    
    def __init__(self):
        """Initialize LLM scorer with appropriate provider."""
        self.provider = settings.LLM_PROVIDER.lower()
        self.model = settings.LLM_MODEL
        self.api_key = settings.LLM_API_KEY
        self.timeout = settings.LLM_TIMEOUT_S
        
        if not self.api_key:
            raise ValueError("LLM_API_KEY is required when LLM_ENABLED=true")
        
        # Initialize provider client
        if self.provider == "openai":
            import openai
            self.client = openai.OpenAI(api_key=self.api_key)
        elif self.provider == "anthropic":
            import anthropic
            self.client = anthropic.Anthropic(api_key=self.api_key)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
    
    async def enhance_score(
        self,
        baseline_result: ScoringResult,
        candidate: ParsedCandidate,
        job: JobProfile
    ) -> ScoringResult:
        """Enhance baseline score with LLM rationale and adjustment.
        
        Args:
            baseline_result: Result from baseline scoring engine
            candidate: Parsed candidate data
            job: Job requirements
            
        Returns:
            Enhanced ScoringResult with rationale and potential score adjustment
        """
        try:
            # Build context for LLM
            context = self._build_context(baseline_result, candidate, job)
            
            # Get LLM response
            llm_response = await self._call_llm(context)

            # Parse structured response and format into readable rationale
            summary = llm_response.get("summary", "")
            strengths = llm_response.get("strengths", [])
            concerns = llm_response.get("concerns", [])
            recommendation = llm_response.get("recommendation", "")
            adjustment = llm_response.get("score_adjustment", 0) or 0  # Handle None
            additional_flags = llm_response.get("flags", [])

            # Build formatted rationale from structured data
            rationale_parts = []

            if summary:
                rationale_parts.append(f"**Summary**\n{summary}")

            if strengths:
                rationale_parts.append("**Key Strengths**\n" + "\n".join(f"• {s}" for s in strengths))

            if concerns:
                rationale_parts.append("**Areas of Concern**\n" + "\n".join(f"• {c}" for c in concerns))

            if recommendation:
                rationale_parts.append(f"**Recommendation**\n{recommendation}")

            rationale = "\n\n".join(rationale_parts) if rationale_parts else "No detailed analysis available."
            
            # Clamp adjustment to -10 to +10
            adjustment = max(-10, min(10, adjustment))
            
            # Apply adjustment to overall score
            adjusted_score = baseline_result.overall_score + adjustment
            adjusted_score = max(0, min(100, adjusted_score))  # Keep in 0-100 range
            
            # Add any new flags from LLM
            all_flags = baseline_result.flags.copy()
            for flag_data in additional_flags:
                all_flags.append(RiskFlag(**flag_data))
            
            # Return enhanced result
            return ScoringResult(
                overall_score=round(adjusted_score, 1),
                breakdown=baseline_result.breakdown,
                rationale=rationale,
                flags=all_flags,
                mode=ScoringMode.LLM,
                llm_adjustment=adjustment,
                model_version=baseline_result.model_version,
                rules_version=baseline_result.rules_version,
                request_id=baseline_result.request_id
            )
            
        except Exception as e:
            # If LLM fails, return baseline result with error note
            print(f"LLM enhancement failed: {e}")
            baseline_result.rationale = f"[LLM unavailable: {str(e)[:100]}]"
            baseline_result.llm_adjustment = 0.0  # Set to 0 instead of None
            return baseline_result
    
    def _build_context(
        self,
        baseline_result: ScoringResult,
        candidate: ParsedCandidate,
        job: JobProfile
    ) -> Dict[str, Any]:
        """Build structured context for LLM prompt."""
        # Summarize candidate
        total_years = sum(
            (w.duration_months or 0) / 12.0 
            for w in candidate.work_experience
        )
        
        recent_roles = [
            f"{w.title} at {w.employer} ({w.duration_months or 0} months)"
            for w in candidate.work_experience[:3]
        ]
        
        candidate_skills = [s.name for s in candidate.skills]
        
        education_summary = []
        for edu in candidate.education:
            edu_str = f"{edu.degree or 'Degree'} from {edu.institution}"
            education_summary.append(edu_str)
        
        # Build context
        return {
            "job": {
                "title": job.title,
                "description": job.description[:500],  # Truncate long descriptions
                "required_skills": job.required_skills,
                "preferred_skills": job.preferred_skills,
                "min_years_experience": job.min_years_experience,
                "min_education": job.min_education
            },
            "candidate": {
                "name": candidate.contact.full_name or "Candidate",
                "total_years_experience": round(total_years, 1),
                "recent_roles": recent_roles,
                "skills": candidate_skills[:20],  # Top 20 skills
                "education": education_summary,
                "certifications": [c.name for c in candidate.certifications]
            },
            "baseline_score": {
                "overall": baseline_result.overall_score,
                "skills": baseline_result.breakdown.skills_score,
                "experience": baseline_result.breakdown.experience_score,
                "education": baseline_result.breakdown.education_score,
                "certifications": baseline_result.breakdown.certifications_score,
                "stability": baseline_result.breakdown.stability_score
            },
            "flags": [
                {
                    "type": flag.type,
                    "severity": flag.severity,
                    "description": flag.description
                }
                for flag in baseline_result.flags
            ]
        }
    
    async def _call_llm(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call LLM provider to generate rationale and adjustment.
        
        Returns:
            {
                "rationale": str,
                "score_adjustment": int,
                "flags": [{"type": str, "severity": str, "description": str}]
            }
        """
        system_prompt = self._get_system_prompt()
        user_prompt = self._format_user_prompt(context)
        
        if self.provider == "openai":
            return await self._call_openai(system_prompt, user_prompt)
        elif self.provider == "anthropic":
            return await self._call_anthropic(system_prompt, user_prompt)
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for LLM scoring."""
        return """You are an expert HR analyst evaluating candidate-job matches.

Your task is to review a baseline algorithmic score and provide:
1. A clear, professional rationale explaining the match quality
2. A small score adjustment (-10 to +10) if you see qualitative factors the algorithm missed
3. Any additional risk flags not caught by the baseline system

Focus on:
- Qualitative factors: communication style, domain expertise depth, career trajectory
- Cultural fit indicators: company loyalty, role progression patterns
- Subtle red flags: unexplained gaps, vague descriptions, credential mismatches
- Positive signals: leadership experience, impact-driven achievements

Provide comprehensive, detailed analysis. Be thorough in your assessment while remaining fair and evidence-based. Adjustments should be modest - the baseline is generally accurate."""
    
    def _format_user_prompt(self, context: Dict[str, Any]) -> str:
        """Format context into user prompt."""
        prompt = f"""# Job Requirements
Title: {context['job']['title']}
Description: {context['job']['description']}
Required Skills: {', '.join(context['job']['required_skills'])}
Preferred Skills: {', '.join(context['job']['preferred_skills'])}
Min Experience: {context['job']['min_years_experience']} years
Min Education: {context['job']['min_education']}

# Candidate Profile
Name: {context['candidate']['name']}
Total Experience: {context['candidate']['total_years_experience']} years
Recent Roles:
{chr(10).join(f"  - {role}" for role in context['candidate']['recent_roles'])}

Skills: {', '.join(context['candidate']['skills'])}
Education: {', '.join(context['candidate']['education'])}
Certifications: {', '.join(context['candidate']['certifications']) if context['candidate']['certifications'] else 'None'}

# Baseline Algorithmic Score
Overall: {context['baseline_score']['overall']}/100
- Skills: {context['baseline_score']['skills']}/100
- Experience: {context['baseline_score']['experience']}/100
- Education: {context['baseline_score']['education']}/100
- Certifications: {context['baseline_score']['certifications']}/100
- Stability: {context['baseline_score']['stability']}/100

Risk Flags: {len(context['flags'])}
{chr(10).join(f"  - [{flag['severity']}] {flag['description']}" for flag in context['flags'])}

# Your Task
Provide a structured assessment in JSON format:
{{
  "summary": "2-3 sentence comprehensive overview of the match quality with specific details",
  "strengths": ["Specific strength 1", "Specific strength 2", "Specific strength 3", "Specific strength 4"],  // 4-6 detailed bullet points
  "concerns": ["Specific concern 1", "Specific concern 2", "Specific concern 3"],  // 3-5 bullet points (or empty array if none)
  "recommendation": "Detailed recommendation (2-3 sentences) with specific reasoning",
  "score_adjustment": 0,  // Integer from -10 to +10 (0 if baseline is accurate)
  "flags": []  // Array of additional flags: [{{"type": "...", "severity": "low|medium|high", "description": "..."}}]
}}

Guidelines:
- Be specific and reference actual skills/experiences from the CV
- Provide detailed bullets (1-2 lines each) with concrete examples
- Expand on key points with additional context and analysis
- Focus on actionable insights with thorough explanations
- Only adjust score if you identify significant qualitative factors the algorithm missed"""

        return prompt
    
    async def _call_openai(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Call OpenAI API."""
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.chat.completions.create,
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.3,  # Lower temperature for consistency
                    max_tokens=1500  # Increased to allow for more detailed content
                ),
                timeout=self.timeout
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
            
        except asyncio.TimeoutError:
            raise TimeoutError(f"OpenAI request timed out after {self.timeout}s")
        except Exception as e:
            raise Exception(f"OpenAI API error: {e}")
    
    async def _call_anthropic(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Call Anthropic API."""
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.messages.create,
                    model=self.model,
                    max_tokens=1500,  # Increased to allow for more detailed content
                    temperature=0.3,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                ),
                timeout=self.timeout
            )

            content = response.content[0].text

            # Anthropic doesn't have native JSON mode, so extract JSON
            # Look for JSON block in response
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0].strip()
            elif "{" in content and "}" in content:
                # Extract first JSON object
                start = content.index("{")
                end = content.rindex("}") + 1
                json_str = content[start:end]
            else:
                json_str = content

            return json.loads(json_str)

        except asyncio.TimeoutError:
            raise TimeoutError(f"Anthropic request timed out after {self.timeout}s")
        except Exception as e:
            raise Exception(f"Anthropic API error: {e}")

    async def generate_detailed_review(
        self,
        baseline_result: "ScoringResult",
        candidate: ParsedCandidate,
        job: JobProfile
    ) -> Dict[str, Any]:
        """Generate a detailed review with strengths, weaknesses, and comprehensive assessment.

        This is used for batch CV reviews where recruiters need detailed analysis.

        Args:
            baseline_result: Result from baseline scoring engine
            candidate: Parsed candidate data
            job: Job requirements

        Returns:
            {
                "suitability_score": float,  # 0-100 with LLM adjustment
                "strengths": [str],  # 3-5 bullet points
                "weaknesses": [str],  # 3-5 bullet points
                "detailed_review": str,  # 2-3 paragraphs
                "recommendation": str,  # "strong_match", "good_match", "moderate_match", "weak_match"
                "flags": [RiskFlag]
            }
        """
        try:
            context = self._build_context(baseline_result, candidate, job)

            system_prompt = """You are an expert HR analyst conducting detailed candidate reviews.

Your task is to provide a comprehensive, in-depth assessment of how well a candidate matches a job opening.

Focus on:
- Technical skills alignment and depth
- Experience relevance and career trajectory
- Education and certifications
- Stability and reliability indicators
- Cultural fit signals and soft skills indicators
- Any red flags or concerns

Be thorough, detailed, and fair. Provide comprehensive actionable insights for recruiters with expanded analysis and context."""

            user_prompt = self._format_batch_review_prompt(context)

            # Call LLM
            if self.provider == "openai":
                llm_response = await self._call_openai(system_prompt, user_prompt)
            else:
                llm_response = await self._call_anthropic(system_prompt, user_prompt)

            # Parse and validate response
            strengths = llm_response.get("strengths", [])
            weaknesses = llm_response.get("weaknesses", [])
            detailed_review = llm_response.get("detailed_review", "")
            score_adjustment = llm_response.get("score_adjustment", 0) or 0
            additional_flags = llm_response.get("flags", [])

            # Clamp adjustment
            score_adjustment = max(-10, min(10, score_adjustment))

            # Calculate final suitability score
            suitability_score = baseline_result.overall_score + score_adjustment
            suitability_score = max(0, min(100, suitability_score))

            # Determine recommendation level
            if suitability_score >= 80:
                recommendation = "strong_match"
            elif suitability_score >= 65:
                recommendation = "good_match"
            elif suitability_score >= 50:
                recommendation = "moderate_match"
            else:
                recommendation = "weak_match"

            # Build flags list
            all_flags = baseline_result.flags.copy()
            for flag_data in additional_flags:
                all_flags.append(RiskFlag(**flag_data))

            return {
                "suitability_score": round(suitability_score, 1),
                "strengths": strengths[:5],  # Max 5
                "weaknesses": weaknesses[:5],  # Max 5
                "detailed_review": detailed_review,
                "recommendation": recommendation,
                "flags": all_flags,
                "llm_adjustment": score_adjustment
            }

        except Exception as e:
            print(f"Detailed review generation failed: {e}")
            # Fallback to basic analysis
            return {
                "suitability_score": baseline_result.overall_score,
                "strengths": ["See baseline score breakdown"],
                "weaknesses": [f.description for f in baseline_result.flags[:3]],
                "detailed_review": f"[LLM review unavailable: {str(e)[:100]}] Baseline score: {baseline_result.overall_score}/100",
                "recommendation": "moderate_match" if baseline_result.overall_score >= 50 else "weak_match",
                "flags": baseline_result.flags,
                "llm_adjustment": 0
            }

    def _format_batch_review_prompt(self, context: Dict[str, Any]) -> str:
        """Format context into detailed review prompt."""
        prompt = f"""# Job Opening
Title: {context['job']['title']}
Description: {context['job']['description']}
Required Skills: {', '.join(context['job']['required_skills'])}
Preferred Skills: {', '.join(context['job']['preferred_skills'])}
Min Experience: {context['job']['min_years_experience']} years
Min Education: {context['job']['min_education']}

# Candidate Profile
Name: {context['candidate']['name']}
Total Experience: {context['candidate']['total_years_experience']} years

Recent Work History:
{chr(10).join(f"  - {role}" for role in context['candidate']['recent_roles'])}

Skills: {', '.join(context['candidate']['skills'])}
Education: {', '.join(context['candidate']['education'])}
Certifications: {', '.join(context['candidate']['certifications']) if context['candidate']['certifications'] else 'None'}

# Baseline Algorithmic Assessment
Overall: {context['baseline_score']['overall']}/100
Component Scores:
- Skills: {context['baseline_score']['skills']}/100
- Experience: {context['baseline_score']['experience']}/100
- Education: {context['baseline_score']['education']}/100
- Certifications: {context['baseline_score']['certifications']}/100
- Stability: {context['baseline_score']['stability']}/100

Algorithmic Flags ({len(context['flags'])}):
{chr(10).join(f"  - [{flag['severity']}] {flag['description']}" for flag in context['flags']) if context['flags'] else '  None'}

# Your Task
Provide a comprehensive review in JSON format:
{{
  "strengths": ["Key strength 1", "Key strength 2", "Key strength 3", "Key strength 4"],  // 4-6 detailed bullet points
  "weaknesses": ["Concern 1", "Concern 2", "Concern 3", "Concern 4"],  // 4-6 bullet points
  "detailed_review": "3-4 paragraph comprehensive assessment covering: technical fit, experience relevance, growth trajectory, and overall suitability. Be specific and reference actual skills/experiences from the CV. Provide additional depth and context in your analysis.",
  "score_adjustment": 0,  // Integer from -10 to +10 based on qualitative factors
  "flags": []  // Additional flags if needed: [{{"type": "...", "severity": "low|medium|high", "description": "..."}}]
}}

Guidelines:
- Be specific: reference actual skills, roles, and achievements from the CV
- Balance positive and negative observations
- Consider both technical and soft skill indicators
- Identify deal-breakers vs. nice-to-haves
- Suggest what additional information would be valuable
- Score adjustment should reflect qualitative factors the algorithm can't measure"""

        return prompt


# Global LLM scorer instance (created on first use)
_llm_scorer: Optional[LLMScorer] = None


def get_llm_scorer() -> LLMScorer:
    """Get or create global LLM scorer instance."""
    global _llm_scorer
    
    if not settings.LLM_ENABLED:
        raise ValueError("LLM scoring is not enabled (LLM_ENABLED=false)")
    
    if _llm_scorer is None:
        _llm_scorer = LLMScorer()
    
    return _llm_scorer

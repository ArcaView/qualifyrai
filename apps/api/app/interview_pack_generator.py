"""Interview pack generation using LLM."""
import json
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

from app.config import settings
from app.models.interview_pack import InterviewPackRequest, InterviewQuestion


class InterviewPackGenerator:
    """Generate interview packs using LLM."""
    
    def __init__(self):
        """Initialize generator with LLM provider."""
        self.provider = settings.LLM_PROVIDER.lower()
        self.model = settings.LLM_MODEL
        self.api_key = settings.LLM_API_KEY
        self.timeout = settings.LLM_TIMEOUT_S * 2  # Longer timeout for interview packs
        
        if not self.api_key:
            raise ValueError("LLM_API_KEY is required for interview pack generation")
        
        # Initialize provider client
        if self.provider == "openai":
            import openai
            self.client = openai.OpenAI(api_key=self.api_key)
        elif self.provider == "anthropic":
            import anthropic
            self.client = anthropic.Anthropic(api_key=self.api_key)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
    
    async def generate(self, request: InterviewPackRequest) -> Dict[str, Any]:
        """Generate interview pack.
        
        Args:
            request: Interview pack generation request
            
        Returns:
            Interview pack as dictionary
        """
        prompt = self._build_prompt(request)
        
        # Call LLM
        if self.provider == "openai":
            llm_response = await self._call_openai(prompt)
        else:
            llm_response = await self._call_anthropic(prompt)
        
        # Transform to interview pack format
        return self._transform_to_pack(llm_response, request.duration)
    
    def _get_interview_type_context(self, interview_type: Optional[str]) -> Dict[str, str]:
        """Get context and instructions based on interview type."""
        if not interview_type:
            interview_type = "general"
        
        contexts = {
            "technical": {
                "name": "Technical",
                "instructions": "Focus on technical skills, problem-solving abilities, coding/system design knowledge, and hands-on experience. Emphasize practical skills and depth of technical understanding.",
                "exclusions": "Do NOT ask generic questions like 'Why do you want to work here?' or 'Tell me about yourself' - focus purely on technical competency assessment."
            },
            "behavioral": {
                "name": "Behavioral",
                "instructions": "Focus on past experiences, soft skills, teamwork, conflict resolution, leadership, and cultural fit. Use STAR method questions (Situation, Task, Action, Result).",
                "exclusions": "Do NOT ask highly technical questions - focus on behavioral patterns, soft skills, and past experiences."
            },
            "phone_screen": {
                "name": "Phone Screen",
                "instructions": "Focus on basic qualifications, salary expectations, availability, motivation, and high-level fit. Keep questions concise and straightforward.",
                "exclusions": "Do NOT ask deep technical or detailed behavioral questions - focus on screening for basic fit and qualifications."
            },
            "final": {
                "name": "Final Round",
                "instructions": "Focus on senior-level concerns: strategic thinking, leadership potential, long-term fit, expectations, and closing questions. May include some technical validation but emphasize judgment and vision.",
                "exclusions": "Avoid basic questions already covered in earlier rounds. Focus on seniority, strategic thinking, and closing the candidate."
            },
            "other": {
                "name": "General",
                "instructions": "Create a balanced mix of questions appropriate for a general interview covering both technical and behavioral aspects.",
                "exclusions": "Create a well-rounded set of questions."
            }
        }
        
        return contexts.get(interview_type.lower(), contexts["other"])
    
    def _build_prompt(self, request: InterviewPackRequest) -> str:
        """Build prompt for LLM."""
        candidate_summary = self._build_candidate_summary(request.candidate)
        num_questions = max(3, min(9, request.duration // 10))  # ~10 minutes per question
        
        # Tailor prompt based on interview type
        interview_type_context = self._get_interview_type_context(request.interview_type)
        
        return f"""Generate a comprehensive interview pack for a {request.duration}-minute {interview_type_context['name']} interview.

JOB DETAILS:
Title: {request.job_title}
Description:
{request.job_description}

CANDIDATE PROFILE:
{candidate_summary}

INTERVIEW TYPE CONTEXT:
{interview_type_context['instructions']}

Generate {num_questions} tailored interview questions that:
1. Are appropriate for a {interview_type_context['name']} interview
2. Target specific job description requirements relevant to this interview type
3. Reference specific evidence from the candidate's CV when available (or mark as null if no relevant evidence)
4. Include main question + 2-3 follow-up questions
5. Provide clear "what good looks like" guidance
6. List 2-3 red flags to watch for
7. Suggest appropriate timebox (5-15 minutes per question)
8. Include a 1-5 rubric with descriptions for each score

IMPORTANT: {interview_type_context['exclusions']}

Also provide:
- 3-5 focus areas (key skills/competencies to assess for this interview type)
- 3-5 risks/concerns to probe (gaps, inconsistencies, concerns from CV relevant to this type)
- A suggested timeline breakdown for the {request.duration}-minute interview

Respond with JSON in this exact format:
{{
  "focusAreas": ["area1", "area2", ...],
  "risks": ["risk1", "risk2", ...],
  "timeline": "Detailed timeline breakdown text",
  "questions": [
    {{
      "jdRequirement": "Specific JD requirement this targets",
      "candidateEvidence": "Specific CV snippet or null if missing",
      "mainQuestion": "Main interview question",
      "followUpQuestions": ["follow-up 1", "follow-up 2"],
      "goodLooksLike": "Description of what a good answer looks like",
      "redFlags": ["red flag 1", "red flag 2"],
      "timebox": 10,
      "rubric": {{
        "1": "Poor: ...",
        "2": "Below Average: ...",
        "3": "Average: ...",
        "4": "Good: ...",
        "5": "Excellent: ..."
      }}
    }}
  ]
}}"""
    
    def _build_candidate_summary(self, candidate_data: Dict[str, Any]) -> str:
        """Build candidate summary from parsed data."""
        summary_parts = []
        
        # Name
        contact = candidate_data.get("contact", {})
        name = contact.get("full_name", "Candidate")
        summary_parts.append(f"Name: {name}\n")
        
        # Work Experience
        work_exp = candidate_data.get("work_experience", [])
        if work_exp:
            summary_parts.append("WORK EXPERIENCE:")
            for exp in work_exp[:5]:  # Limit to recent 5 roles
                title = exp.get("title", "Position")
                employer = exp.get("employer", "Company")
                summary_parts.append(f"- {title} at {employer}")
                if exp.get("start_date") or exp.get("end_date"):
                    start = exp.get("start_date", "")
                    end = exp.get("end_date", "Present")
                    summary_parts.append(f"  ({start} - {end})")
                bullets = exp.get("bullets", [])
                if bullets:
                    for bullet in bullets[:3]:  # Limit bullets
                        summary_parts.append(f"  • {bullet}")
            summary_parts.append("")
        
        # Education
        education = candidate_data.get("education", [])
        if education:
            summary_parts.append("EDUCATION:")
            for edu in education:
                degree = edu.get("degree", "Degree")
                field = edu.get("field", "")
                institution = edu.get("institution", "")
                edu_str = f"- {degree}"
                if field:
                    edu_str += f" in {field}"
                if institution:
                    edu_str += f" from {institution}"
                summary_parts.append(edu_str)
            summary_parts.append("")
        
        # Skills
        skills = candidate_data.get("skills", [])
        if skills:
            skill_names = [s.get("name") if isinstance(s, dict) else str(s) for s in skills[:20]]
            skill_names = [s for s in skill_names if s]
            if skill_names:
                summary_parts.append(f"SKILLS: {', '.join(skill_names)}\n")
        
        # Certifications
        certs = candidate_data.get("certifications", [])
        if certs:
            summary_parts.append("CERTIFICATIONS:")
            for cert in certs[:5]:
                cert_name = cert.get("name") if isinstance(cert, dict) else str(cert)
                summary_parts.append(f"- {cert_name}")
            summary_parts.append("")
        
        # Raw text if available
        raw_text = candidate_data.get("raw_text")
        if raw_text:
            # Truncate to first 2000 chars to avoid token limits
            summary_parts.append(f"FULL CV TEXT:\n{raw_text[:2000]}...")
        
        return "\n".join(summary_parts)
    
    async def _call_openai(self, prompt: str) -> Dict[str, Any]:
        """Call OpenAI API."""
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.chat.completions.create,
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert technical interviewer and hiring manager. Generate tailored interview questions based on job requirements and candidate CV. Always respond with valid JSON only, no markdown formatting or code blocks."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.7,
                    max_tokens=4000,  # Higher for interview packs
                ),
                timeout=self.timeout
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
            
        except asyncio.TimeoutError:
            raise TimeoutError(f"OpenAI request timed out after {self.timeout}s")
        except Exception as e:
            raise Exception(f"OpenAI API error: {e}")
    
    async def _call_anthropic(self, prompt: str) -> Dict[str, Any]:
        """Call Anthropic API."""
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.messages.create,
                    model=self.model,
                    max_tokens=4000,
                    temperature=0.7,
                    system="You are an expert technical interviewer and hiring manager. Generate tailored interview questions based on job requirements and candidate CV. Always respond with valid JSON only, no markdown formatting or code blocks.",
                    messages=[
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                ),
                timeout=self.timeout
            )
            
            content = response.content[0].text
            return json.loads(content)
            
        except asyncio.TimeoutError:
            raise TimeoutError(f"Anthropic request timed out after {self.timeout}s")
        except Exception as e:
            raise Exception(f"Anthropic API error: {e}")
    
    def _transform_to_pack(self, parsed: Dict[str, Any], duration: int) -> Dict[str, Any]:
        """Transform LLM response to interview pack format."""
        now = datetime.utcnow().isoformat()
        
        questions = []
        for idx, q in enumerate(parsed.get("questions", [])):
            questions.append({
                "id": f"q-{int(datetime.utcnow().timestamp() * 1000)}-{idx}",
                "jdRequirement": q.get("jdRequirement", ""),
                "candidateEvidence": q.get("candidateEvidence") if q.get("candidateEvidence") else None,
                "mainQuestion": q.get("mainQuestion", ""),
                "followUpQuestions": q.get("followUpQuestions", []),
                "goodLooksLike": q.get("goodLooksLike", ""),
                "redFlags": q.get("redFlags", []),
                "timebox": q.get("timebox", 10),
                "rubric": q.get("rubric", {
                    "1": "Poor",
                    "2": "Below Average",
                    "3": "Average",
                    "4": "Good",
                    "5": "Excellent"
                })
            })
        
        return {
            "id": f"pack-{int(datetime.utcnow().timestamp() * 1000)}",
            "duration": duration,
            "focusAreas": parsed.get("focusAreas", []),
            "risks": parsed.get("risks", []),
            "timeline": parsed.get("timeline", ""),
            "questions": questions,
            "createdAt": now,
            "updatedAt": now,
        }


# Global generator instance
_generator: InterviewPackGenerator = None


def get_interview_pack_generator() -> InterviewPackGenerator:
    """Get or create global generator instance."""
    global _generator
    
    if not settings.LLM_ENABLED:
        raise ValueError("LLM is not enabled (LLM_ENABLED=false)")
    
    if _generator is None:
        _generator = InterviewPackGenerator()
    
    return _generator


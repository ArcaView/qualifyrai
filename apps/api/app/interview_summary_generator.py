"""Interview summary generation using LLM."""
import json
import asyncio
from typing import Dict, Any, List

from app.config import settings
from app.models.interview_summary import InterviewSummaryRequest


class InterviewSummaryGenerator:
    """Generate interview summaries using LLM."""
    
    def __init__(self):
        """Initialize generator with LLM provider."""
        self.provider = settings.LLM_PROVIDER.lower()
        self.model = settings.LLM_MODEL
        self.api_key = settings.LLM_API_KEY
        self.timeout = settings.LLM_TIMEOUT_S
        
        if not self.api_key:
            raise ValueError("LLM_API_KEY is required for interview summary generation")
        
        # Initialize provider client
        if self.provider == "openai":
            import openai
            self.client = openai.OpenAI(api_key=self.api_key)
        elif self.provider == "anthropic":
            import anthropic
            self.client = anthropic.Anthropic(api_key=self.api_key)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
    
    async def generate(self, request: InterviewSummaryRequest) -> Dict[str, Any]:
        """Generate interview summary.
        
        Args:
            request: Interview summary generation request
            
        Returns:
            Summary with overall score, strengths, and concerns
        """
        prompt = self._build_prompt(request)
        
        # Call LLM
        if self.provider == "openai":
            llm_response = await self._call_openai(prompt)
        else:
            llm_response = await self._call_anthropic(prompt)
        
        # Transform to summary format
        return self._transform_to_summary(llm_response, request)
    
    def _build_prompt(self, request: InterviewSummaryRequest) -> str:
        """Build prompt for LLM."""
        # Collect questions with notes and scores
        questions_text = ""
        total_score = 0
        scored_questions = 0
        
        for idx, question in enumerate(request.questions, 1):
            main_question = question.get("mainQuestion", "")
            notes = question.get("notes", "")
            score = question.get("score")
            
            questions_text += f"\nQuestion {idx}: {main_question}\n"
            
            if score:
                questions_text += f"Score: {score}/5\n"
                total_score += score
                scored_questions += 1
            
            if notes:
                questions_text += f"Notes: {notes}\n"
            
            questions_text += "---\n"
        
        overall_score_avg = total_score / scored_questions if scored_questions > 0 else None
        
        return f"""Generate a comprehensive interview summary based on the interview notes and scores provided.

CANDIDATE: {request.candidate_name}
JOB TITLE: {request.job_title}
INTERVIEW TYPE: {request.interview_type}

INTERVIEW NOTES AND SCORES:
{questions_text}

Generate a professional interview summary that includes:
1. An overall assessment paragraph (2-3 sentences)
2. Key strengths demonstrated (3-5 bullet points)
3. Areas of concern or gaps (2-4 bullet points)
4. Overall recommendation context

{"Calculate an overall score based on the question scores provided. Average score: " + str(round(overall_score_avg, 1)) if overall_score_avg else "No scores provided, focus on qualitative assessment."}

The summary should be concise but comprehensive, suitable for sharing with hiring managers and decision-makers.

Respond with JSON in this exact format:
{{
  "summary": "Overall assessment paragraph (2-3 sentences)...",
  "overall_score": {overall_score_avg if overall_score_avg else "null"},
  "strengths": ["strength 1", "strength 2", ...],
  "concerns": ["concern 1", "concern 2", ...]
}}"""
    
    async def _call_openai(self, prompt: str) -> Dict[str, Any]:
        """Call OpenAI API."""
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.client.chat.completions.create,
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are an expert interviewer and hiring consultant. Generate professional, objective interview summaries. Always respond with valid JSON only, no markdown formatting or code blocks."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.3,
                    max_tokens=2000
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
                    max_tokens=2048,
                    temperature=0.3,
                    system="You are an expert interviewer and hiring consultant. Generate professional, objective interview summaries. Always respond with valid JSON only, no markdown formatting or code blocks.",
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                ),
                timeout=self.timeout
            )
            
            content = response.content[0].text
            # Try to parse JSON from response
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                content = content[json_start:json_end]
            
            return json.loads(content)
            
        except asyncio.TimeoutError:
            raise TimeoutError(f"Anthropic request timed out after {self.timeout}s")
        except Exception as e:
            raise Exception(f"Anthropic API error: {e}")
    
    def _transform_to_summary(self, parsed: Dict[str, Any], request: InterviewSummaryRequest) -> Dict[str, Any]:
        """Transform LLM response to summary format."""
        # Calculate overall score if all questions have scores
        scores = [q.get("score") for q in request.questions if q.get("score")]
        overall_score = sum(scores) / len(scores) if scores else None
        
        return {
            "summary": parsed.get("summary", "No summary generated."),
            "overall_score": parsed.get("overall_score") if parsed.get("overall_score") else overall_score,
            "strengths": parsed.get("strengths", []),
            "concerns": parsed.get("concerns", [])
        }


# Global generator instance
_generator: InterviewSummaryGenerator = None


def get_interview_summary_generator() -> InterviewSummaryGenerator:
    """Get or create global interview summary generator."""
    global _generator
    if _generator is None:
        _generator = InterviewSummaryGenerator()
    return _generator


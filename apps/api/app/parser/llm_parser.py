"""LLM-based CV parsing for maximum flexibility and accuracy."""
import json
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

from app.models import ParsedCandidate, ContactInfo, WorkExperience, Education, Skill, Certification, Language, ProficiencyLevel, EducationLevel
from app.config import settings


# In-memory cache for parsed CVs (by file hash)
_parse_cache: Dict[str, ParsedCandidate] = {}


class LLMParser:
    """LLM-based CV parser using structured outputs."""

    def __init__(self):
        """Initialize LLM parser with appropriate provider."""
        self.provider = settings.LLM_PROVIDER.lower()
        self.model = settings.LLM_MODEL
        self.api_key = settings.LLM_API_KEY
        self.timeout = settings.LLM_TIMEOUT_S

        if not self.api_key:
            raise ValueError("LLM_API_KEY is required when LLM_ENABLED=true")

        # Initialize provider client
        if self.provider == "openai":
            import openai
            # Simple initialization without extra parameters
            self.client = openai.AsyncOpenAI(
                api_key=self.api_key,
                timeout=self.timeout,
                max_retries=2
            )
            # Use fastest model
            if self.model == "gpt-4":
                self.model = "gpt-4o-mini"
        elif self.provider == "anthropic":
            import anthropic
            self.client = anthropic.AsyncAnthropic(api_key=self.api_key)
            if self.model == "gpt-4":
                self.model = "claude-3-haiku-20240307"
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")

    async def parse_async(self, text: str, filename: str, file_hash: str) -> ParsedCandidate:
        """Parse CV text using LLM with structured output (async).

        Args:
            text: Extracted CV text
            filename: Original filename
            file_hash: SHA256 hash of file

        Returns:
            ParsedCandidate with all fields populated
        """
        # Check cache first
        if file_hash in _parse_cache:
            print("⚡ Using cached parse result")
            return _parse_cache[file_hash]

        try:
            # Call LLM with structured output schema
            result = await self._call_llm_async(text)

            # Build ParsedCandidate from LLM response
            candidate = self._build_candidate(result, text, filename, file_hash)

            # Cache the result
            _parse_cache[file_hash] = candidate

            return candidate

        except Exception as e:
            print(f"LLM parsing failed: {e}")
            raise

    def parse(self, text: str, filename: str, file_hash: str) -> ParsedCandidate:
        """Synchronous wrapper for async parse (for backward compatibility)."""
        return asyncio.run(self.parse_async(text, filename, file_hash))

    async def _call_llm_async(self, text: str) -> Dict[str, Any]:
        """Call LLM async with CV text and get structured JSON response."""

        # Shortened, more efficient prompt
        prompt = f"""Parse this CV into JSON. Extract ALL sections completely and accurately.

{text}

Return JSON with this structure (replace examples with actual data from CV):
{{
  "contact": {{"full_name": "John Smith", "emails": ["john@email.com"], "phones": ["+1234567890"], "location": "New York, NY", "linkedin": "https://linkedin.com/in/...", "github": "https://github.com/...", "portfolio": "https://..."}},
  "work_experience": [{{"employer": "Company Name", "title": "Job Title", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD or null", "duration_months": 12, "location": "City, State", "bullets": ["Achievement 1", "Achievement 2"], "inferred_seniority": "junior/mid/senior/lead", "confidence": 0.9}}],
  "education": [{{"institution": "University Name", "degree": "bachelors/masters/doctorate/associates/other", "field": "Finance", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "gpa": 3.8, "confidence": 0.9}}],
  "skills": [{{"name": "Python", "canonical_id": "python", "group": "language", "years_experience": 5.0, "proficiency": "expert", "confidence": 0.9}}],
  "certifications": [{{"name": "AWS Certified", "issuer": "Amazon", "issue_date": "YYYY-MM-DD", "expiry_date": "YYYY-MM-DD", "credential_id": "ABC123", "confidence": 0.9}}],
  "languages": [{{"name": "English", "proficiency": "native", "confidence": 0.9}}]
}}

CRITICAL: Replace ALL example values with ACTUAL data from the CV. Do not return type names like "str" or "int" - extract the real values.
For education:
  - "degree" should be the LEVEL only (bachelors/masters/doctorate/associates/other)
  - "field" should be the SUBJECT only (e.g., "Finance", "Computer Science") - DO NOT include words like "in" or "of"
  - Example: "Bachelor of Science in Finance" → degree="bachelors", field="Finance"
Rules: Extract everything. Use YYYY-MM-DD dates. Current jobs: end_date=null. Calculate duration_months. Infer seniority. Return only JSON."""

        if self.provider == "openai":
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Expert CV parser. Extract structured data completely and accurately."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0,  # Faster with 0
                max_tokens=3000,  # Limit tokens for speed
                timeout=self.timeout,
                response_format={"type": "json_object"}
            )
            result = json.loads(response.choices[0].message.content)

        elif self.provider == "anthropic":
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=3000,  # Limit tokens for speed
                temperature=0,  # Faster with 0
                messages=[
                    {"role": "user", "content": prompt}
                ],
                timeout=self.timeout
            )
            result = json.loads(response.content[0].text)

        return result

    def _validate_and_clean_value(self, value: Any, field_name: str) -> Any:
        """Validate and clean extracted values to catch LLM errors."""
        if value is None:
            return None

        # Check for common LLM errors (returning type names instead of values)
        if isinstance(value, str):
            value_lower = value.lower().strip()
            # Invalid values that indicate parsing errors
            invalid_values = ['str', 'string', 'int', 'float', 'none', 'null', 'n/a', 'unknown', '']
            if value_lower in invalid_values:
                print(f"⚠️  Warning: Detected invalid value '{value}' for field '{field_name}' - setting to None")
                return None

        return value

    def _build_candidate(self, data: Dict[str, Any], raw_text: str, filename: str, file_hash: str) -> ParsedCandidate:
        """Build ParsedCandidate from LLM response."""

        # Contact info
        contact_data = data.get("contact", {})
        contact = ContactInfo(
            full_name=self._validate_and_clean_value(contact_data.get("full_name"), "full_name"),
            emails=contact_data.get("emails", []),
            phones=contact_data.get("phones", []),
            location=self._validate_and_clean_value(contact_data.get("location"), "location"),
            linkedin=contact_data.get("linkedin"),
            github=contact_data.get("github"),
            portfolio=contact_data.get("portfolio")
        )

        # Work experience
        work_experience = []
        for exp in data.get("work_experience", []):
            # Validate employer and title to prevent "N/A", "Unknown", etc.
            employer = self._validate_and_clean_value(exp.get("employer"), "employer")
            title = self._validate_and_clean_value(exp.get("title"), "title")

            # Skip entries with no employer or title
            if not employer and not title:
                continue

            work_experience.append(WorkExperience(
                employer=employer or "Unknown",
                title=title or "Unknown",
                start_date=exp.get("start_date"),
                end_date=exp.get("end_date"),
                duration_months=exp.get("duration_months"),
                location=exp.get("location"),
                bullets=exp.get("bullets", []),
                inferred_seniority=exp.get("inferred_seniority"),
                confidence=exp.get("confidence", 0.8)
            ))

        # Education
        education = []
        for edu in data.get("education", []):
            degree_str = edu.get("degree")
            degree = None
            if degree_str:
                try:
                    degree = EducationLevel(degree_str)
                except:
                    degree = None

            # Validate institution name
            institution = self._validate_and_clean_value(edu.get("institution"), "institution")
            if not institution:
                institution = "Unknown"

            # Handle GPA - convert empty strings to None to prevent validation errors
            gpa_value = edu.get("gpa")
            if gpa_value == "" or gpa_value is None:
                gpa = None
            else:
                try:
                    gpa = float(gpa_value) if gpa_value else None
                except (ValueError, TypeError):
                    gpa = None

            education.append(Education(
                institution=institution,
                degree=degree,
                field=self._validate_and_clean_value(edu.get("field"), "field"),
                start_date=edu.get("start_date"),
                end_date=edu.get("end_date"),
                gpa=gpa,
                confidence=edu.get("confidence", 0.8)
            ))

        # Skills
        skills = []
        for skill in data.get("skills", []):
            skills.append(Skill(
                name=skill.get("name", ""),
                canonical_id=skill.get("canonical_id"),
                group=skill.get("group"),
                years_experience=skill.get("years_experience"),
                proficiency=skill.get("proficiency"),
                confidence=skill.get("confidence", 0.8)
            ))

        # Certifications
        certifications = []
        for cert in data.get("certifications", []):
            certifications.append(Certification(
                name=cert.get("name", ""),
                issuer=cert.get("issuer"),
                issue_date=cert.get("issue_date"),
                expiry_date=cert.get("expiry_date"),
                credential_id=cert.get("credential_id"),
                confidence=cert.get("confidence", 0.8)
            ))

        # Languages
        languages = []
        for lang in data.get("languages", []):
            prof_str = lang.get("proficiency", "intermediate")
            try:
                proficiency = ProficiencyLevel(prof_str)
            except:
                proficiency = ProficiencyLevel.INTERMEDIATE

            languages.append(Language(
                name=lang.get("name", ""),
                proficiency=proficiency,
                confidence=lang.get("confidence", 0.8)
            ))

        return ParsedCandidate(
            contact=contact,
            work_experience=work_experience,
            education=education,
            skills=skills,
            certifications=certifications,
            languages=languages,
            raw_text=raw_text,
            file_hash=file_hash,
            parsing_metadata={
                "filename": filename,
                "text_length": len(raw_text),
                "parsed_at": datetime.utcnow().isoformat(),
                "parser": "llm"
            }
        )

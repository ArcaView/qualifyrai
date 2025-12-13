// Wrapper to adapt parsescore-client to the interface expected by ParseCV.tsx
import { parseScoreAPI as client, ParseResponse, ScoreResponse } from './api/parsescore-client';

// Adapter that matches the interface expected by ParseCV.tsx
export const parseScoreAPI = {
  /**
   * Parse a CV file
   * @param file - The CV file to parse
   * @returns ParseResponse with the parsed data
   */
  async parseCV(file: File): Promise<ParseResponse> {
    // Call the actual API with persist=true so we can reference it later for scoring
    return await client.parseCV(file, true);
  },

  /**
   * Score a candidate against a job description
   * @param parseId - The request_id from the parse response
   * @param jobDescription - The job description text
   * @param aiScoringEnabled - Whether AI scoring is enabled for the user's plan
   * @returns Adapted score response matching the UI expectations
   */
  async scoreCV(parseId: string, jobDescription: string, aiScoringEnabled: boolean = false): Promise<any> {
    // First, fetch the parsed CV data using the parseId
    const cvData = await client.getCV(parseId);
    
    // Extract skills from the job description (simple keyword extraction)
    // In a real app, you might want to use NLP or let the user specify these
    const skillKeywords = extractSkillsFromDescription(jobDescription);

    // Determine scoring mode based on user's plan
    // AI scoring (LLM mode) is only available for Professional/Enterprise tiers
    const scoringMode = aiScoringEnabled ? 'llm' : 'baseline';

    // Create the score request
    const scoreRequest = {
      candidate: cvData.candidate,
      job: {
        title: "Position", // Generic title since we only have description
        description: jobDescription,
        required_skills: skillKeywords.required,
        preferred_skills: skillKeywords.preferred,
      },
      mode: scoringMode as const,
    };

    // Call the scoring API
    const scoreResponse: ScoreResponse = await client.scoreCandidate(scoreRequest);

    // Transform the response to match the UI expectations
    return {
      overall_score: scoreResponse.result.overall_score,
      fit: getFitLevel(scoreResponse.result.overall_score),
      breakdown: {
        skills: scoreResponse.result.breakdown.skills_score,
        experience: scoreResponse.result.breakdown.experience_score,
        education: scoreResponse.result.breakdown.education_score,
        certifications: scoreResponse.result.breakdown.certifications_score,
        stability: scoreResponse.result.breakdown.stability_score,
      },
      risk_flags: scoreResponse.result.flags.map(flag => ({
        type: flag.type,
        severity: flag.severity,
        description: flag.description,
      })),
      rationale: scoreResponse.result.rationale || "Score calculated based on candidate qualifications and job requirements.",
      matched_skills: getMatchedSkills(cvData.candidate, skillKeywords.required),
      missing_skills: getMissingSkills(cvData.candidate, skillKeywords.required),
    };
  },
};

/**
 * Extract skills from job description
 * This is a simple implementation - in production you might want something more sophisticated
 */
export function extractSkillsFromDescription(description: string): { required: string[], preferred: string[] } {
  const commonSkills = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'C++', 'C#',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'SQL', 'PostgreSQL', 'MongoDB',
    'Git', 'CI/CD', 'Agile', 'Scrum', 'REST API', 'GraphQL', 'Redis',
    'Machine Learning', 'Data Science', 'DevOps', 'Linux',
    // Finance/Business skills
    'Excel', 'Financial Modeling', 'DCF', 'LBO', 'Valuation', 'Bloomberg',
    'Capital IQ', 'PowerPoint', 'VBA', 'Tableau', 'Power BI'
  ];

  // Context patterns that indicate false positives (meta-references, not actual requirements)
  const falsePositivePatterns = [
    /\bai[- ]scoring\b/i,        // "AI scoring"
    /\bai[- ]powered\b/i,         // "AI-powered"
    /\bai[- ]based\b/i,           // "AI-based"
    /\bapi\b.*\b(endpoint|call|integration)\b/i, // "API endpoint" (system reference)
    /\bcloud[- ]based\b/i,        // "cloud-based platform"
  ];

  const descLower = description.toLowerCase();

  const foundSkills = commonSkills.filter(skill => {
    const skillLower = skill.toLowerCase();

    // Check if skill appears in description
    if (!descLower.includes(skillLower)) {
      return false;
    }

    // Filter out false positives
    for (const pattern of falsePositivePatterns) {
      if (pattern.test(description)) {
        // Check if this specific skill is part of the false positive
        const skillPattern = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const match = pattern.exec(description);
        if (match && skillPattern.test(match[0])) {
          return false; // Skip this skill - it's a meta-reference
        }
      }
    }

    return true;
  });

  return {
    required: foundSkills.slice(0, Math.ceil(foundSkills.length * 0.7)), // 70% as required
    preferred: foundSkills.slice(Math.ceil(foundSkills.length * 0.7)), // 30% as preferred
  };
}

/**
 * Determine fit level based on score
 */
export function getFitLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 55) return 'fair';
  return 'poor';
}

/**
 * Get matched skills from candidate
 */
function getMatchedSkills(candidate: any, requiredSkills: string[]): string[] {
  // Skills are objects with 'name' property, not plain strings
  const candidateSkills = (candidate.skills || [])
    .map((s: any) => s.name?.toLowerCase() || (typeof s === 'string' ? s.toLowerCase() : ''))
    .filter((s: string) => s.length > 0);

  return requiredSkills.filter(skill =>
    candidateSkills.some(cs => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs))
  );
}

/**
 * Get missing skills
 */
function getMissingSkills(candidate: any, requiredSkills: string[]): string[] {
  const matched = getMatchedSkills(candidate, requiredSkills);
  return requiredSkills.filter(skill => !matched.includes(skill));
}

// Re-export types
export type { ParseResponse, ScoreResponse };
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
   * @returns Adapted score response matching the UI expectations
   */
  async scoreCV(parseId: string, jobDescription: string): Promise<any> {
    // First, fetch the parsed CV data using the parseId
    const cvData = await client.getCV(parseId);
    
    // Extract skills from the job description (simple keyword extraction)
    // In a real app, you might want to use NLP or let the user specify these
    const skillKeywords = extractSkillsFromDescription(jobDescription);
    
    // Create the score request
    const scoreRequest = {
      candidate: cvData.candidate,
      job: {
        title: "Position", // Generic title since we only have description
        description: jobDescription,
        required_skills: skillKeywords.required,
        preferred_skills: skillKeywords.preferred,
      },
      mode: 'llm' as const, // Use LLM mode for better analysis
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
function extractSkillsFromDescription(description: string): { required: string[], preferred: string[] } {
  const commonSkills = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Java', 'C++', 'C#',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'SQL', 'PostgreSQL', 'MongoDB',
    'Git', 'CI/CD', 'Agile', 'Scrum', 'REST', 'API', 'GraphQL', 'Redis',
    'Machine Learning', 'AI', 'Data Science', 'DevOps', 'Cloud', 'Linux',
  ];

  const foundSkills = commonSkills.filter(skill => 
    description.toLowerCase().includes(skill.toLowerCase())
  );

  return {
    required: foundSkills.slice(0, Math.ceil(foundSkills.length * 0.7)), // 70% as required
    preferred: foundSkills.slice(Math.ceil(foundSkills.length * 0.7)), // 30% as preferred
  };
}

/**
 * Determine fit level based on score
 */
function getFitLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 55) return 'fair';
  return 'poor';
}

/**
 * Get matched skills from candidate
 */
function getMatchedSkills(candidate: any, requiredSkills: string[]): string[] {
  const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase());
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
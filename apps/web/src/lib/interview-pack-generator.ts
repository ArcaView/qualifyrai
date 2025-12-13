import type { InterviewPack, GenerateInterviewPackRequest } from '@/types/interview-pack';

const API_BASE_URL = import.meta.env.VITE_PARSESCORE_API_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_PARSESCORE_API_KEY;

/**
 * Generate interview pack using backend API (which uses LLM)
 * This reuses the existing LLM_API_KEY from the backend, keeping API keys secure on the server.
 */
export async function generateInterviewPack(
  request: GenerateInterviewPackRequest,
  interviewType?: string
): Promise<InterviewPack> {
  // Prepare candidate data in ParsedCandidate format
  const candidateData = {
    contact: {
      full_name: request.candidateData.name,
      emails: [],
      phones: [],
      location: null,
      linkedin: null,
      github: null,
      portfolio: null,
    },
    work_experience: request.candidateData.experience || [],
    education: request.candidateData.education || [],
    skills: (request.candidateData.skills || []).map((skill: any) => {
      if (typeof skill === 'string') {
        return { name: skill };
      }
      return typeof skill === 'object' && skill.name ? skill : { name: String(skill) };
    }),
    certifications: request.candidateData.certifications || [],
    languages: [],
    raw_text: request.candidateData.cvText || null,
    file_hash: null,
    parsing_metadata: {},
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if available (for external API usage)
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(`${API_BASE_URL}/v1/interview-pack`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        job_description: request.jobDescription,
        job_title: request.jobTitle,
        candidate: candidateData,
        duration: request.duration,
        interview_type: interviewType,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail?.message || error.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // The API returns the pack in the expected format
    return data.pack as InterviewPack;
  } catch (error: any) {
    console.error('Interview pack generation error:', error);
    throw new Error(error.message || 'Failed to generate interview pack');
  }
}

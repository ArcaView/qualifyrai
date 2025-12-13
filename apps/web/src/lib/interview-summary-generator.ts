import type { InterviewPack } from '@/types/interview-pack';

const API_BASE_URL = import.meta.env.VITE_PARSESCORE_API_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_PARSESCORE_API_KEY;

export interface InterviewSummaryRequest {
  candidate_name: string;
  job_title: string;
  interview_type: string;
  questions: Array<{
    mainQuestion: string;
    notes?: string;
    score?: number;
  }>;
}

export interface InterviewSummary {
  summary: string;
  overall_score?: number;
  strengths?: string[];
  concerns?: string[];
}

/**
 * Generate interview summary using backend API (which uses LLM)
 */
export async function generateInterviewSummary(
  request: InterviewSummaryRequest
): Promise<InterviewSummary> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if available (for external API usage)
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(`${API_BASE_URL}/v1/interview-summary`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        candidate_name: request.candidate_name,
        job_title: request.job_title,
        interview_type: request.interview_type,
        questions: request.questions,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail?.message || error.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      summary: data.summary,
      overall_score: data.overall_score,
      strengths: data.strengths || [],
      concerns: data.concerns || [],
    };
  } catch (error: any) {
    console.error('Interview summary generation error:', error);
    throw new Error(error.message || 'Failed to generate interview summary');
  }
}


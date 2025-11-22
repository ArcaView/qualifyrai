const API_BASE_URL = import.meta.env.VITE_PARSESCORE_API_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_PARSESCORE_API_KEY;

interface ParseResponse {
  request_id: string;
  candidate: any;
  processing_time_ms: number;
}

interface ScoreRequest {
  candidate: any;
  job: {
    title: string;
    description: string;
    required_skills: string[];
    preferred_skills?: string[];
    min_years_experience?: number;
    min_education?: string;
  };
  mode: 'baseline' | 'llm';
}

interface ScoreResponse {
  request_id: string;
  result: {
    overall_score: number;
    breakdown: {
      skills_score: number;
      experience_score: number;
      education_score: number;
      certifications_score: number;
      stability_score: number;
    };
    rationale?: string;
    flags: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
    mode: string;
    llm_adjustment?: number;
  };
  processing_time_ms: number;
}

interface BatchParseResponse {
  request_id: string;
  total_cvs: number;
  successful_parses: number;
  failed_parses: number;
  results: Array<{
    filename: string;
    candidate?: any;
    parsing_errors?: string;
  }>;
  processing_time_ms: number;
}

interface BatchScoreResponse {
  request_id: string;
  job_title: string;
  total_cvs: number;
  successful_reviews: number;
  failed_reviews: number;
  reviews: Array<{
    filename: string;
    candidate_name?: string;
    suitability_score: number;
    recommendation: 'strong_match' | 'good_match' | 'moderate_match' | 'weak_match';
    strengths: string[];
    weaknesses: string[];
    detailed_review: string;
    baseline_scores: {
      skills_score: number;
      experience_score: number;
      education_score: number;
      certifications_score: number;
      stability_score: number;
    };
    flags: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
    parsing_errors?: string;
  }>;
  processing_time_ms: number;
}

class ParseScoreAPI {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.apiKey = API_KEY || '';
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: any = {
      ...options.headers,
    };

    // Only add Authorization if API key exists
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  async parseCV(file: File, persist: boolean = false): Promise<ParseResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(`/v1/parse?persist=${persist}`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - browser will set it with boundary
      },
    });
  }

  async batchParse(files: File[], persist: boolean = false): Promise<any> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    return this.request(`/v1/batch-parse?persist=${persist}`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - browser will set it with boundary
      },
    });
  }

  async scoreCandidate(request: ScoreRequest): Promise<ScoreResponse> {
    return this.request('/v1/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
  }

  async batchParse(files: File[]): Promise<BatchParseResponse> {
    const formData = new FormData();
    
    // Add all CV files
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.request('/v1/batch-parse', {
      method: 'POST',
      body: formData,
    });
  }

  async batchScore(
    files: File[],
    jobTitle: string,
    jobDescription: string,
    requiredSkills: string[],
    preferredSkills: string[] = [],
    minYearsExperience: number = 0,
    minEducation?: string
  ): Promise<BatchScoreResponse> {
    const formData = new FormData();
    
    // Add all CV files
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Add job details
    formData.append('job_title', jobTitle);
    formData.append('job_description', jobDescription);
    formData.append('required_skills', requiredSkills.join(','));
    formData.append('preferred_skills', preferredSkills.join(','));
    formData.append('min_years_experience', minYearsExperience.toString());
    
    if (minEducation) {
      formData.append('min_education', minEducation);
    }

    return this.request('/v1/batch-score', {
      method: 'POST',
      body: formData,
    });
  }

  async getCV(cvId: string) {
    return this.request(`/v1/cvs/${cvId}`);
  }

  async listCVs(limit: number = 50) {
    return this.request(`/v1/cvs?limit=${limit}`);
  }

  async getScore(scoreId: string) {
    return this.request(`/v1/scores/${scoreId}`);
  }

  async getCVScores(cvId: string) {
    return this.request(`/v1/cvs/${cvId}/scores`);
  }

  async healthCheck() {
    return this.request('/v1/health');
  }
}

export const parseScoreAPI = new ParseScoreAPI();
export type { ParseResponse, ScoreRequest, ScoreResponse, BatchScoreResponse, BatchParseResponse };
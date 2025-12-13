export interface InterviewQuestion {
  id: string;
  jdRequirement: string; // The job description requirement this question targets
  candidateEvidence: string | null; // Snippet from CV that relates, or null if "missing"
  mainQuestion: string;
  followUpQuestions: string[];
  goodLooksLike: string; // What a good answer looks like
  redFlags: string[]; // Red flags to watch for
  timebox: number; // Minutes allocated
  rubric: {
    [key: string]: string; // Score 1-5 with descriptions
  };
  notes?: string; // Interviewer's notes for this question
  score?: number; // Score 1-5 for this question
}

export interface InterviewPack {
  id: string;
  duration: 30 | 60 | 90; // Interview duration in minutes
  focusAreas: string[]; // Key areas to focus on
  risks: string[]; // Risks/concerns identified
  timeline: string; // Suggested interview timeline breakdown
  questions: InterviewQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerateInterviewPackRequest {
  jobDescription: string;
  jobTitle: string;
  candidateData: {
    name: string;
    experience: any[];
    education: any[];
    skills: any[];
    certifications: any[];
    cvText?: string;
  };
  duration: 30 | 60 | 90;
}


import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoles, type Interview } from "@/contexts/RolesContext";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ScoreBreakdownCard } from "@/components/ScoreBreakdownCard";
import { parseScoreAPI as client } from "@/lib/api/parsescore-client";
import { Sparkles, Loader2 } from "lucide-react";
import { extractSkillsFromDescription, getFitLevel } from "@/lib/api";
import { InterviewPackComponent } from "@/components/InterviewPack";
import { generateInterviewPack } from "@/lib/interview-pack-generator";
import type { InterviewPack } from "@/types/interview-pack";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CandidateDetail = () => {
  const { candidateId, roleId } = useParams();
  const navigate = useNavigate();
  const { roles, updateCandidateStatus, updateCandidateSummary, addInterview, updateInterview, deleteInterview, removeCandidateFromRole, refreshRoles } = useRoles();
  const { user, supabaseUser } = useUser();
  const { toast } = useToast();

  // Find the role and candidate
  const role = roles.find(r => r.id === roleId);
  const candidate = role?.candidatesList.find(c => c.id === candidateId);

  // State management
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState(candidate?.summary || '');
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [deleteInterviewId, setDeleteInterviewId] = useState<string | null>(null);
  const [deleteCandidateDialogOpen, setDeleteCandidateDialogOpen] = useState(false);
  const [cvOpen, setCvOpen] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    date: '',
    interviewer: '',
    notes: '',
    type: 'technical' as Interview['type']
  });
  const [generatingPackForInterview, setGeneratingPackForInterview] = useState<string | null>(null);

  if (!role || !candidate) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard/candidates')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Candidates
          </Button>
          <Card className="mt-4">
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Candidate not found</h3>
              <p className="text-muted-foreground">
                The candidate you're looking for doesn't exist.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleStatusChange = (newStatus: typeof candidate.status) => {
    if (roleId && candidateId) {
      updateCandidateStatus(roleId, candidateId, newStatus);
      toast({
        title: 'Status updated',
        description: `Candidate status changed to ${newStatus}`
      });
    }
  };

  const handleSaveSummary = () => {
    if (roleId && candidateId) {
      updateCandidateSummary(roleId, candidateId, summaryText);
      setEditingSummary(false);
    }
  };

  const handleAddInterview = () => {
    setEditingInterview(null);
    setInterviewForm({
      date: '',
      interviewer: '',
      notes: '',
      type: 'technical'
    });
    setInterviewDialogOpen(true);
  };

  const handleEditInterview = (interview: Interview) => {
    setEditingInterview(interview);
    setInterviewForm({
      date: interview.date,
      interviewer: interview.interviewer,
      notes: interview.notes,
      type: interview.type
    });
    setInterviewDialogOpen(true);
  };

  const handleSaveInterview = () => {
    if (!roleId || !candidateId) return;

    if (editingInterview) {
      updateInterview(roleId, candidateId, editingInterview.id, interviewForm);
    } else {
      addInterview(roleId, candidateId, interviewForm);
    }

    setInterviewDialogOpen(false);
    setEditingInterview(null);
    setInterviewForm({
      date: '',
      interviewer: '',
      notes: '',
      type: 'technical'
    });
  };

  const handleDeleteInterview = () => {
    if (roleId && candidateId && deleteInterviewId) {
      deleteInterview(roleId, candidateId, deleteInterviewId);
      setDeleteInterviewId(null);
    }
  };

  const handleDeleteCandidate = async () => {
    if (roleId && candidateId) {
      try {
        await removeCandidateFromRole(roleId, candidateId);
        toast({
          title: 'Candidate deleted',
          description: 'The candidate has been removed successfully'
        });
        navigate('/dashboard/candidates');
      } catch (err: any) {
        toast({
          title: 'Error deleting candidate',
          description: err.message,
          variant: 'destructive'
        });
      }
      setDeleteCandidateDialogOpen(false);
    }
  };

  const handleScoreCandidate = async () => {
    if (!role || !candidate || !roleId || !candidateId) return;

    // Check if role has description
    if (!role.description || role.description.trim() === '') {
      toast({
        title: 'Missing Job Description',
        description: 'Please add a job description to the role before scoring candidates.',
        variant: 'destructive'
      });
      return;
    }

    setIsScoring(true);

    try {
      const aiScoringEnabled = user?.planLimits?.ai_scoring_enabled || false;
      const scoringMode = aiScoringEnabled ? 'llm' : 'baseline';

      // Extract skills from role description
      const skillKeywords = extractSkillsFromDescription(role.description);

      // Check if we have the original parsed candidate data in the correct format
      let parsedCandidateData;
      if (candidate.cv_parsed_data && 
          candidate.cv_parsed_data.contact && 
          typeof candidate.cv_parsed_data.contact === 'object' &&
          !Array.isArray(candidate.cv_parsed_data.contact)) {
        // Use the original parsed data if available and in correct format
        parsedCandidateData = {
          ...candidate.cv_parsed_data,
          // Ensure contact has required structure
          contact: {
            full_name: candidate.cv_parsed_data.contact.full_name || candidate.name,
            emails: Array.isArray(candidate.cv_parsed_data.contact.emails) 
              ? candidate.cv_parsed_data.contact.emails 
              : (candidate.cv_parsed_data.contact.email ? [candidate.cv_parsed_data.contact.email] : [candidate.email]),
            phones: Array.isArray(candidate.cv_parsed_data.contact.phones)
              ? candidate.cv_parsed_data.contact.phones
              : (candidate.cv_parsed_data.contact.phone ? [candidate.cv_parsed_data.contact.phone] : (candidate.phone ? [candidate.phone] : [])),
            location: candidate.cv_parsed_data.contact.location || candidate.location || null,
            linkedin: candidate.cv_parsed_data.contact.linkedin || candidate.linkedin_url || null,
            portfolio: candidate.cv_parsed_data.contact.portfolio || candidate.portfolio_url || null,
            github: candidate.cv_parsed_data.contact.github || null
          }
        };
      } else {
        // Reconstruct ParsedCandidate structure from flat candidate data
        parsedCandidateData = {
          contact: {
            full_name: candidate.name,
            emails: candidate.email ? [candidate.email] : [],
            phones: candidate.phone ? [candidate.phone] : [],
            location: candidate.location || null,
            linkedin: candidate.linkedin_url || null,
            portfolio: candidate.portfolio_url || null,
            github: null
          },
          work_experience: (candidate.experience || []).map((exp: any) => ({
            employer: exp.employer || exp.company || exp.organization || 'Unknown',
            title: exp.title || exp.position || exp.role || 'Unknown',
            start_date: exp.start_date || exp.startDate || null,
            end_date: exp.end_date || exp.endDate || null,
            duration_months: exp.duration_months || null,
            location: exp.location || null,
            bullets: Array.isArray(exp.bullets) ? exp.bullets : (Array.isArray(exp.responsibilities) ? exp.responsibilities : []),
            inferred_seniority: exp.inferred_seniority || exp.seniority || null,
            confidence: exp.confidence || 0.8
          })),
          education: (candidate.education || []).map((edu: any) => ({
            institution: edu.institution || edu.school || edu.university || 'Unknown',
            degree: edu.degree || null,
            field: edu.field || edu.major || edu.subject || null,
            start_date: edu.start_date || edu.startDate || null,
            end_date: edu.end_date || edu.endDate || null,
            gpa: edu.gpa || null,
            confidence: edu.confidence || 0.8
          })),
          skills: (candidate.skills || []).map((skill: any) => {
            // Handle both string and object formats
            if (typeof skill === 'string') {
              return {
                name: skill,
                canonical_id: null,
                group: null,
                years_experience: null,
                proficiency: null,
                confidence: 0.8
              };
            } else {
              return {
                name: skill.name || skill,
                canonical_id: skill.canonical_id || null,
                group: skill.group || null,
                years_experience: skill.years_experience || null,
                proficiency: skill.proficiency || null,
                confidence: skill.confidence || 0.8
              };
            }
          }),
          certifications: (candidate.certifications || []).map((cert: any) => {
            if (typeof cert === 'string') {
              return {
                name: cert,
                issuer: null,
                issue_date: null,
                expiry_date: null,
                credential_id: null,
                confidence: 0.8
              };
            } else {
              return {
                name: cert.name || cert,
                issuer: cert.issuer || null,
                issue_date: cert.issue_date || cert.issueDate || null,
                expiry_date: cert.expiry_date || cert.expiryDate || null,
                credential_id: cert.credential_id || null,
                confidence: cert.confidence || 0.8
              };
            }
          }),
          languages: (candidate.languages || []).map((lang: any) => {
            if (typeof lang === 'string') {
              return {
                name: lang,
                proficiency: 'professional' as const,
                confidence: 0.8
              };
            } else {
              return {
                name: lang.name || lang,
                proficiency: lang.proficiency || 'professional' as const,
                confidence: lang.confidence || 0.8
              };
            }
          }),
          raw_text: null,
          file_hash: null,
          parsing_metadata: {}
        };
      }

      // Create the score request
      const scoreRequest = {
        candidate: parsedCandidateData,
        job: {
          title: role.title,
          description: role.description,
          required_skills: skillKeywords.required,
          preferred_skills: skillKeywords.preferred,
        },
        mode: scoringMode as 'llm' | 'baseline',
      };

      // Call the scoring API
      const scoreResponse = await client.scoreCandidate(scoreRequest);

      // Update candidate score in database
      const { supabase } = await import('@/lib/supabase');
      
      // Get authenticated user - use UserContext supabaseUser if available, otherwise get from session
      let authUser = supabaseUser || undefined;
      
      // If not available from context, get from session
      if (!authUser) {
        const { data: { session } } = await supabase.auth.getSession();
        authUser = session?.user || undefined;
      }
      
      // Final fallback to getUser
      if (!authUser) {
        try {
          const { data: { user: fetchedUser } } = await supabase.auth.getUser();
          authUser = fetchedUser || undefined;
        } catch (err) {
          console.error('Failed to get user:', err);
        }
      }
      
      if (!authUser) {
        throw new Error('Not authenticated. Please refresh the page and try again.');
      }

      // Get fit level from score
      const fitLevel = getFitLevel(scoreResponse.result.overall_score);
      // Map to our fit type (excellent, good, fair)
      const fit = fitLevel === 'poor' ? 'fair' : fitLevel as 'excellent' | 'good' | 'fair';

      // Update candidate with new score (now supports decimal values)
      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          overall_score: scoreResponse.result.overall_score,
          cv_parsed_data: {
            ...(candidate.cv_parsed_data || {}),
            score_breakdown: {
              skills: scoreResponse.result.breakdown.skills_score,
              experience: scoreResponse.result.breakdown.experience_score,
              education: scoreResponse.result.breakdown.education_score,
              certifications: scoreResponse.result.breakdown.certifications_score,
              stability: scoreResponse.result.breakdown.stability_score,
            },
            fit: fit,
            rationale: scoreResponse.result.rationale
          }
        })
        .eq('id', candidateId)
        .eq('user_id', authUser.id);

      if (updateError) throw updateError;

      // Refresh roles to update UI
      await refreshRoles();

      toast({
        title: 'Scoring Complete',
        description: `Match score: ${scoreResponse.result.overall_score}/100${aiScoringEnabled ? ' (AI-powered)' : ''}`,
      });
    } catch (error: any) {
      console.error('Scoring error:', error);
      let errorMessage = 'Failed to score candidate. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.detail) {
        // Handle API validation errors
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (detail.message) {
          errorMessage = detail.message;
        }
      }
      
      toast({
        title: 'Scoring Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsScoring(false);
    }
  };

  const getStatusColor = (status: typeof candidate.status) => {
    switch (status) {
      case 'new': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'reviewing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'shortlisted': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'interviewing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'offered': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'hired': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: typeof candidate.status) => {
    switch (status) {
      case 'new': return 'New';
      case 'reviewing': return 'Reviewing';
      case 'shortlisted': return 'Shortlisted';
      case 'interviewing': return 'Interviewing';
      case 'offered': return 'Offered';
      case 'hired': return 'Hired';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const getInterviewTypeLabel = (type: Interview['type']) => {
    switch (type) {
      case 'phone_screen': return 'Phone Screen';
      case 'technical': return 'Technical';
      case 'behavioral': return 'Behavioral';
      case 'final': return 'Final';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const getFitColor = (fit?: string) => {
    switch (fit) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'fair': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const handleGenerateInterviewPack = async (interviewId: string, duration: 30 | 60 | 90) => {
    if (!role || !candidate || !roleId || !candidateId) return;

    if (!role.description || role.description.trim() === '') {
      toast({
        title: 'Missing Job Description',
        description: 'Please add a job description to the role before generating interview pack.',
        variant: 'destructive'
      });
      return;
    }

    const interview = candidate.interviews.find(i => i.id === interviewId);
    if (!interview) return;

    setGeneratingPackForInterview(interviewId);

    try {
      // Prepare candidate data for generation
      const candidateData = {
        name: candidate.name,
        experience: candidate.experience || [],
        education: candidate.education || [],
        skills: candidate.skills || [],
        certifications: candidate.certifications || [],
        cvText: candidate.cv_parsed_data?.raw_text || null,
      };

      // Generate interview pack tailored to interview type
      const pack = await generateInterviewPack({
        jobDescription: role.description,
        jobTitle: role.title,
        candidateData,
        duration,
      }, interview.type);

      // Update interview with pack
      await updateInterview(roleId, candidateId, interviewId, {
        interview_pack: pack
      });

      toast({
        title: 'Interview Pack Generated',
        description: `Generated ${duration}-minute ${getInterviewTypeLabel(interview.type)} interview pack with ${pack.questions.length} questions`,
      });
    } catch (error: any) {
      console.error('Interview pack generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate interview pack. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingPackForInterview(null);
    }
  };

  const handleRegenerateInterviewPack = (interviewId: string) => {
    const interview = candidate?.interviews.find(i => i.id === interviewId);
    if (interview?.interview_pack) {
      handleGenerateInterviewPack(interviewId, interview.interview_pack.duration);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard/candidates')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Candidates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteCandidateDialogOpen(true)}
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>

        {/* Candidate Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{candidate.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-base">
                  Applied for: <span className="font-medium text-foreground">{role.title}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {candidate.fit && (
                  <Badge className={getFitColor(candidate.fit)} variant="secondary">
                    {candidate.fit}
                  </Badge>
                )}
                <Badge className={getStatusColor(candidate.status)} variant="secondary">
                  {getStatusLabel(candidate.status)}
                </Badge>
                {candidate.score && (
                  <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                    {candidate.score}%
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{candidate.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{candidate.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>{candidate.experience_years} years exp</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Applied {new Date(candidate.appliedDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Skills</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {candidate.skills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Resume File</Label>
              <p className="text-sm mt-1">{candidate.fileName}</p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Current Status</Label>
              <Select
                value={candidate.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-[250px] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="interviewing">Interviewing</SelectItem>
                  <SelectItem value="offered">Offered</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Score Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Match Score</CardTitle>
                <CardDescription>
                  {candidate.score 
                    ? `Current score: ${candidate.score}/100`
                    : 'No score available yet'}
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button
                  onClick={handleScoreCandidate}
                  disabled={isScoring || !role.description}
                  className="gap-2"
                >
                  {isScoring ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scoring...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {user?.planLimits?.ai_scoring_enabled ? 'AI Score Candidate' : 'Score Candidate'}
                    </>
                  )}
                </Button>
                {!role.description && (
                  <p className="text-xs text-muted-foreground text-right">
                    Add job description to enable scoring
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          {candidate.score_breakdown && (
            <CardContent>
              <ScoreBreakdownCard
                scoreBreakdown={candidate.score_breakdown}
                totalScore={candidate.score}
                rationale={candidate.cv_parsed_data?.rationale}
              />
            </CardContent>
          )}
        </Card>

        {/* CV Details */}
        <Collapsible open={cvOpen} onOpenChange={setCvOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>CV Details</CardTitle>
                    <CardDescription>Candidate's curriculum vitae information</CardDescription>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-200 ${cvOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                {/* Show message if no CV data */}
                {!candidate.experience?.length &&
                 !candidate.education?.length &&
                 !candidate.certifications?.length &&
                 !candidate.languages?.length &&
                 !candidate.cv_parsed_data?.summary &&
                 !candidate.cv_parsed_data?.professional_summary ? (
                  <p className="text-sm text-muted-foreground">No CV details available for this candidate.</p>
                ) : (
                  <>
                    {/* Professional Summary */}
                    {(candidate.cv_parsed_data?.summary || candidate.cv_parsed_data?.professional_summary) && (
                      <div>
                        <h3 className="font-semibold mb-2 text-sm">Professional Summary</h3>
                        <p className="text-sm leading-relaxed">
                          {candidate.cv_parsed_data?.summary || candidate.cv_parsed_data?.professional_summary}
                        </p>
                      </div>
                    )}

                    {/* Work Experience */}
                    {candidate.experience && candidate.experience.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 text-sm">Work Experience</h3>
                        <div className="space-y-4">
                          {candidate.experience.map((exp: any, index: number) => (
                            <div key={index} className="border-l-2 border-muted pl-4">
                              <div className="mb-2">
                                <h4 className="font-medium text-base">
                                  {exp.title || exp.role || exp.position || 'Position'}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {exp.company || exp.employer || 'Company'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {exp.start_date || exp.from || exp.startDate || ''} - {exp.end_date || exp.to || exp.endDate || 'Present'}
                                  {exp.duration && ` (${exp.duration})`}
                                </p>
                              </div>

                              {/* Description/Summary - check multiple possible field names */}
                              {(() => {
                                const description = exp.description || exp.summary || exp.details || exp.text || exp.content || '';
                                const bullets = exp.bullets || exp.bullet_points || exp.highlights || [];

                                // Show description if available
                                if (description) {
                                  return (
                                    <p className="text-sm mb-3 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                      {description}
                                    </p>
                                  );
                                }

                                // Otherwise show bullets if they're strings (not already shown as responsibilities)
                                if (Array.isArray(bullets) && bullets.length > 0 && !exp.responsibilities) {
                                  return (
                                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground mb-3">
                                      {bullets.map((bullet: string, idx: number) => (
                                        <li key={idx} className="leading-relaxed">{bullet}</li>
                                      ))}
                                    </ul>
                                  );
                                }

                                return null;
                              })()}

                              {/* Responsibilities */}
                              {exp.responsibilities && Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-foreground mb-1.5">Key Responsibilities</p>
                                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                                    {exp.responsibilities.map((resp: string, idx: number) => (
                                      <li key={idx} className="leading-relaxed">{resp}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Achievements */}
                              {exp.achievements && Array.isArray(exp.achievements) && exp.achievements.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-foreground mb-1.5">Key Achievements</p>
                                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                                    {exp.achievements.map((achievement: string, idx: number) => (
                                      <li key={idx} className="leading-relaxed">{achievement}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {exp.technologies && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Technologies:</p>
                                  <p className="text-sm">{Array.isArray(exp.technologies) ? exp.technologies.join(', ') : exp.technologies}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {candidate.education && candidate.education.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 text-sm">Education</h3>
                        <div className="space-y-3">
                          {candidate.education.map((edu: any, index: number) => {
                            // Helper to format degree names properly
                            const formatEducation = (degree: string, field?: string) => {
                              const degreeMap: { [key: string]: string } = {
                                'bachelors': "Bachelor's Degree",
                                'masters': "Master's Degree",
                                'phd': 'Ph.D.',
                                'doctorate': 'Doctorate',
                                'high_school': 'High School',
                                'associates': "Associate's Degree",
                                'mba': 'MBA',
                              };

                              const baseDegree = degreeMap[degree?.toLowerCase()] || degree;

                              // Special handling for high school/secondary qualifications
                              const isSecondary = degree?.toLowerCase() === 'high_school' ||
                                                field?.match(/a-level|gcse|secondary|high school/i);

                              if (isSecondary && field) {
                                // For A-Levels, GCSEs, etc., show them separately
                                return field;
                              }

                              // For degrees, combine with field
                              return field && !isSecondary ? `${baseDegree} in ${field}` : baseDegree;
                            };

                            const educationTitle = formatEducation(
                              edu.degree || edu.qualification || 'Education',
                              edu.field
                            );

                            return (
                              <div key={index} className="border-l-2 border-muted pl-4">
                                <h4 className="font-medium text-base">
                                  {educationTitle}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {edu.institution || edu.school || edu.university || 'Institution'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {edu.start_date || edu.from || ''} {edu.start_date && edu.end_date && '- '} {edu.graduation_date || edu.year || edu.end_date || ''}
                                </p>
                                {/* Show grades for secondary education */}
                                {(edu.grade || edu.grades) && (
                                  <p className="text-sm mt-1">Grades: {edu.grade || edu.grades}</p>
                                )}
                                {/* Show GPA for university */}
                                {edu.gpa && (
                                  <p className="text-sm mt-1">GPA: {edu.gpa}</p>
                                )}
                                {edu.honors && (
                                  <p className="text-sm">{edu.honors}</p>
                                )}
                                {edu.description && (
                                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{edu.description}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {candidate.certifications && candidate.certifications.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2 text-sm">Certifications</h3>
                        <ul className="space-y-1 text-sm">
                          {candidate.certifications.map((cert: any, index: number) => (
                            <li key={index}>
                              <span className="font-medium">
                                {typeof cert === 'string' ? cert : cert.name || cert.title || 'Certification'}
                              </span>
                              {cert.issuer && <span className="text-muted-foreground"> by {cert.issuer}</span>}
                              {cert.year && <span className="text-muted-foreground"> ({cert.year})</span>}
                              {cert.expiry && <span className="text-muted-foreground"> • Expires: {cert.expiry}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Languages */}
                    {candidate.languages && candidate.languages.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2 text-sm">Languages</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {candidate.languages.map((lang: any, index: number) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">
                                {typeof lang === 'string' ? lang : lang.name || lang.language || 'Language'}
                              </span>
                              {lang.proficiency && <span className="text-muted-foreground block text-xs">{lang.proficiency}</span>}
                              {lang.level && <span className="text-muted-foreground block text-xs">{lang.level}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Interviews */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Interviews</CardTitle>
                <CardDescription>Schedule and track interview sessions</CardDescription>
              </div>
              <Button onClick={handleAddInterview}>
                <Plus className="w-4 h-4 mr-2" />
                Add Interview
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {candidate.interviews.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>No interviews scheduled yet</p>
                <p className="text-sm mt-2">Click "Add Interview" to schedule one</p>
              </div>
            ) : (
              <div className="space-y-4">
                {candidate.interviews.map((interview) => (
                  <Card key={interview.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/dashboard/interviews/${candidateId}/${roleId}/${interview.id}`)}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{getInterviewTypeLabel(interview.type)}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(interview.date).toLocaleDateString()}
                            </span>
                            {interview.interview_pack && (
                              <Badge variant="secondary" className="ml-auto">
                                Pack Generated
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-2">Interviewer: {interview.interviewer}</p>
                          {interview.summary ? (
                            <div className="space-y-2">
                              {interview.summary.overall_score && (
                                <Badge variant="secondary">
                                  Score: {interview.summary.overall_score.toFixed(1)}/5.0
                                </Badge>
                              )}
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                                {interview.summary.summary}
                              </p>
                            </div>
                          ) : interview.notes ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">{interview.notes}</p>
                          ) : null}
                          {interview.interview_pack && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {interview.interview_pack.questions.length} questions • {interview.interview_pack.duration} minutes
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditInterview(interview)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteInterviewId(interview.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Interview Pack Section */}
                      <div className="border-t pt-4" onClick={(e) => e.stopPropagation()}>
                        {generatingPackForInterview === interview.id ? (
                          <div className="py-4 text-center">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                            <p className="text-xs text-muted-foreground">Generating pack...</p>
                          </div>
                        ) : interview.interview_pack ? (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {interview.interview_pack.questions.length} questions ready • Click to view full pack
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => navigate(`/dashboard/interviews/${roleId}/${candidateId}/${interview.id}`)}
                              className="w-full"
                            >
                              View Interview Pack
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">
                              No pack generated yet
                            </p>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={!role.description} className="w-full">
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Generate Pack
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => handleGenerateInterviewPack(interview.id, 30)}
                                  disabled={generatingPackForInterview === interview.id}
                                >
                                  30 minutes
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleGenerateInterviewPack(interview.id, 60)}
                                  disabled={generatingPackForInterview === interview.id}
                                >
                                  60 minutes
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleGenerateInterviewPack(interview.id, 90)}
                                  disabled={generatingPackForInterview === interview.id}
                                >
                                  90 minutes
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary/Notes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Internal Notes</CardTitle>
                <CardDescription>Private notes about this candidate</CardDescription>
              </div>
              {!editingSummary && (
                <Button variant="outline" size="sm" onClick={() => setEditingSummary(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingSummary ? (
              <div className="space-y-4">
                <Textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="Add notes about this candidate..."
                  className="min-h-[150px]"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveSummary}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setEditingSummary(false);
                    setSummaryText(candidate.summary || '');
                  }}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {candidate.summary ? (
                  <p className="text-sm whitespace-pre-wrap">{candidate.summary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes yet. Click "Edit" to add notes.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status History */}
        <Card>
          <CardHeader>
            <CardTitle>Status History</CardTitle>
            <CardDescription>Timeline of status changes for this candidate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...candidate.statusHistory].reverse().map((entry, index) => (
                <div key={index} className="flex items-start gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="flex-shrink-0">
                    <Badge className={getStatusColor(entry.status)} variant="secondary">
                      {getStatusLabel(entry.status)}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    {entry.note && (
                      <p className="text-sm font-medium mb-1">{entry.note}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true })}</span>
                      <span>•</span>
                      <span>{new Date(entry.changedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Interview Dialog */}
        <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingInterview ? 'Edit Interview' : 'Add Interview'}</DialogTitle>
              <DialogDescription>
                {editingInterview ? 'Update interview details below' : 'Schedule a new interview for this candidate'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Interview Type</Label>
                <Select
                  value={interviewForm.type}
                  onValueChange={(value) => setInterviewForm({ ...interviewForm, type: value as Interview['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone_screen">Phone Screen</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={interviewForm.date}
                  onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Interviewer</Label>
                <Input
                  placeholder="Name of interviewer"
                  value={interviewForm.interviewer}
                  onChange={(e) => setInterviewForm({ ...interviewForm, interviewer: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Interview notes, feedback, etc."
                  value={interviewForm.notes}
                  onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInterviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveInterview}>
                {editingInterview ? 'Update' : 'Add'} Interview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Interview Confirmation */}
        <AlertDialog open={deleteInterviewId !== null} onOpenChange={() => setDeleteInterviewId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Interview</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this interview? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteInterview} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Candidate Confirmation */}
        <AlertDialog open={deleteCandidateDialogOpen} onOpenChange={setDeleteCandidateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this candidate? This action cannot be undone and will remove all associated data including interviews, notes, and status history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCandidate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Candidate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default CandidateDetail;

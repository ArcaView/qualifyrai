import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, Copy, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoles, type Interview } from "@/contexts/RolesContext";
import { useToast } from "@/hooks/use-toast";
import { InterviewPackComponent } from "@/components/InterviewPack";
import { generateInterviewPack } from "@/lib/interview-pack-generator";
import { generateInterviewSummary } from "@/lib/interview-summary-generator";
import type { InterviewPack } from "@/types/interview-pack";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const InterviewDetail = () => {
  const { candidateId, roleId, interviewId } = useParams();
  const navigate = useNavigate();
  const { roles, updateInterview, refreshRoles } = useRoles();
  const { toast } = useToast();

  // Find the role, candidate, and interview
  const role = roles.find(r => r.id === roleId);
  const candidate = role?.candidatesList.find(c => c.id === candidateId);
  const interview = candidate?.interviews.find(i => i.id === interviewId);

  const [generatingPack, setGeneratingPack] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  if (!role || !candidate || !interview) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Button variant="ghost" onClick={() => navigate(`/dashboard/candidates/${candidateId}/${roleId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Candidate
          </Button>
          <Card className="mt-4">
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Interview not found</h3>
              <p className="text-muted-foreground">
                The interview you're looking for doesn't exist.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

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

  const handleGenerateInterviewPack = async (duration: 30 | 60 | 90) => {
    if (!role || !candidate || !roleId || !candidateId || !interviewId) return;

    if (!role.description || role.description.trim() === '') {
      toast({
        title: 'Missing Job Description',
        description: 'Please add a job description to the role before generating interview pack.',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingPack(true);

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
      setGeneratingPack(false);
    }
  };

  const handleRegenerateInterviewPack = () => {
    if (interview.interview_pack) {
      handleGenerateInterviewPack(interview.interview_pack.duration);
    }
  };

  const handleQuestionUpdate = async (questionId: string, updates: { notes?: string; score?: number }) => {
    if (!roleId || !candidateId || !interviewId || !interview.interview_pack) return;

    try {
      // Update the question in the pack
      const updatedPack = {
        ...interview.interview_pack,
        questions: interview.interview_pack.questions.map(q =>
          q.id === questionId ? { ...q, ...updates } : q
        ),
        updatedAt: new Date().toISOString()
      };

      // Update interview with the modified pack
      await updateInterview(roleId, candidateId, interviewId, {
        interview_pack: updatedPack
      });
    } catch (error: any) {
      console.error('Error updating question:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to save question notes/score. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleGenerateSummary = async () => {
    if (!role || !candidate || !interview.interview_pack || !roleId || !candidateId || !interviewId) return;

    // Check if there are any notes or scores
    const hasNotesOrScores = interview.interview_pack.questions.some(
      q => (q.notes && q.notes.trim()) || q.score
    );

    if (!hasNotesOrScores) {
      toast({
        title: 'No Notes Found',
        description: 'Please add notes or scores to questions before generating a summary.',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingSummary(true);

    try {
      const summary = await generateInterviewSummary({
        candidate_name: candidate.name,
        job_title: role.title,
        interview_type: interview.type,
        questions: interview.interview_pack.questions.map(q => ({
          mainQuestion: q.mainQuestion,
          notes: q.notes || '',
          score: q.score
        }))
      });

      // Update interview with summary
      await updateInterview(roleId, candidateId, interviewId, {
        summary
      }, true); // Pass true to indicate summary was generated (interview conducted)

      toast({
        title: 'Summary Generated',
        description: 'Interview summary has been generated successfully.',
      });
    } catch (error: any) {
      console.error('Interview summary generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate interview summary. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingSummary(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(`/dashboard/candidates/${candidateId}/${roleId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Candidate
          </Button>
        </div>

        {/* Interview Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  {getInterviewTypeLabel(interview.type)} Interview
                </CardTitle>
                <CardDescription>
                  Interview with {candidate.name} for {role.title}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-base px-3 py-1">
                {getInterviewTypeLabel(interview.type)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(interview.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Interviewer: {interview.interviewer}</span>
              </div>
            </div>

            {interview.notes && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded">
                  {interview.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interview Summary */}
        {interview.summary && (
          <Card>
            <CardHeader>
              <CardTitle>Interview Summary</CardTitle>
              <CardDescription>
                AI-generated summary of interview notes and scores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {interview.summary.overall_score && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-base px-3 py-1">
                    Overall Score: {interview.summary.overall_score.toFixed(1)}/5.0
                  </Badge>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{interview.summary.summary}</p>
              </div>
              {interview.summary.strengths && interview.summary.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Strengths</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {interview.summary.strengths.map((strength, idx) => (
                      <li key={idx}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}
              {interview.summary.concerns && interview.summary.concerns.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Concerns</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {interview.summary.concerns.map((concern, idx) => (
                      <li key={idx}>{concern}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Interview Pack */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Interview Pack</CardTitle>
                <CardDescription>
                  Tailored questions and guidance for this interview
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {interview.interview_pack && !interview.summary && (
                  <Button
                    variant="outline"
                    onClick={handleGenerateSummary}
                    disabled={generatingSummary}
                  >
                    {generatingSummary ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Summary
                      </>
                    )}
                  </Button>
                )}
                {!interview.interview_pack && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" disabled={generatingPack || !role.description}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {generatingPack ? 'Generating...' : 'Generate Pack'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleGenerateInterviewPack(30)}
                        disabled={generatingPack}
                      >
                        30 minutes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleGenerateInterviewPack(60)}
                        disabled={generatingPack}
                      >
                        60 minutes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleGenerateInterviewPack(90)}
                        disabled={generatingPack}
                      >
                        90 minutes
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {generatingPack ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Generating tailored interview pack...</p>
              </div>
            ) : interview.interview_pack ? (
              <InterviewPackComponent
                pack={interview.interview_pack}
                onRegenerate={handleRegenerateInterviewPack}
                isGenerating={generatingPack}
                compact={false}
                onQuestionUpdate={handleQuestionUpdate}
              />
            ) : (
              <div className="py-12 text-center border-2 border-dashed rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">No interview pack generated yet</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Generate tailored questions based on the job description, candidate CV, and interview type
                </p>
                {!role.description && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Note: Job description is required to generate interview pack
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default InterviewDetail;


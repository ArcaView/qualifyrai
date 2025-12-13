import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  ArrowLeft,
  Users,
  Star,
  FileText,
  Mail,
  Phone,
  Trash2,
  AlertTriangle,
  Download,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoles, type Candidate } from "@/contexts/RolesContext";
import { useToast } from "@/hooks/use-toast";
import { generateCandidateSummaryPDF } from "@/lib/candidateSummaryPDF";

const RoleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { roles, updateRole, removeCandidateFromRole } = useRoles();

  // Find the role from context
  const role = roles.find(r => r.id === id);

  const handleToggleStatus = (checked: boolean) => {
    if (id) {
      updateRole(id, { status: checked ? 'active' : 'inactive' });
    }
  };

  const downloadCandidateSummary = async () => {
    toast({
      title: "Generating Summary",
      description: "Creating comprehensive candidate summary PDF...",
      duration: 3000,
    });

    // Simulate processing time for AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate PDF with all candidate data and AI summary
    if (role) {
      generateCandidateSummaryPDF({
        roleTitle: role.title,
        candidates: sortedCandidates
      });

      toast({
        title: "Summary Ready",
        description: `Downloaded comprehensive PDF summary with ${sortedCandidates.length} candidates`,
      });
    }
  };

  // Get candidates from role
  const candidates = role?.candidatesList || [];

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);

  const handleViewCandidate = (candidate: Candidate) => {
    if (id) {
      navigate(`/dashboard/candidates/${candidate.id}/${id}`);
    }
  };

  const handleDeleteCandidate = (candidateId: string) => {
    setCandidateToDelete(candidateId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCandidate = () => {
    if (candidateToDelete && id) {
      removeCandidateFromRole(id, candidateToDelete);
      setDeleteDialogOpen(false);
      setCandidateToDelete(null);
      toast({
        title: "Candidate Removed",
        description: "The candidate has been removed from this role.",
      });
    }
  };

  // Helper function to calculate combined score (CV score + interview score)
  const getCombinedScore = (candidate: Candidate): number => {
    const cvScore = candidate.score || 0;
    
    // Calculate average interview score from summaries (1-5 scale, convert to 0-100)
    const interviewScores = candidate.interviews
      .filter(i => i.summary?.overall_score)
      .map(i => (i.summary!.overall_score! / 5) * 100);
    
    if (interviewScores.length === 0) {
      return cvScore; // No interviews, use CV score only
    }
    
    const avgInterviewScore = interviewScores.reduce((sum, score) => sum + score, 0) / interviewScores.length;
    
    // Weighted combination: 60% CV score, 40% interview score
    return (cvScore * 0.6) + (avgInterviewScore * 0.4);
  };

  // Sort by combined score (CV + interviews), then by CV score as tiebreaker
  const sortedCandidates = [...candidates].sort((a, b) => {
    const scoreA = getCombinedScore(a);
    const scoreB = getCombinedScore(b);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    // Tiebreaker: use CV score
    return (b.score || 0) - (a.score || 0);
  });

  const getFitColor = (fit?: string) => {
    switch (fit) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'fair': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (!role) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/roles')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Roles
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Role not found</h3>
              <p className="text-muted-foreground">
                The role you're looking for doesn't exist.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/roles')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Roles
          </Button>
        </div>

        {/* Role Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-2xl">{role.title}</CardTitle>
                  <Badge variant={role.status === 'active' ? 'default' : 'secondary'}>
                    {role.status}
                  </Badge>
                </div>
                <CardDescription className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {role.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {role.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {role.type}
                  </span>
                  {role.salary && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {role.salary}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Switch
                  id="role-status"
                  checked={role.status === 'active'}
                  onCheckedChange={handleToggleStatus}
                />
                <Label htmlFor="role-status" className="cursor-pointer text-sm font-medium">
                  {role.status === 'active' ? 'Active' : 'Inactive'}
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{candidates.length}</span>
                <span className="text-sm text-muted-foreground">candidates</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Created {new Date(role.createdAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidates List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Candidates</h2>
            <div className="flex items-center gap-2">
              {candidates.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCandidateSummary}
                  className="border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Download Summary PDF
                </Button>
              )}
            </div>
          </div>

          {candidates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No candidates yet</h3>
                <p className="text-muted-foreground mb-4">
                  Parse CVs and attach them to this role to see candidates here
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => navigate('/dashboard/parse')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Parse CV
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard/bulk-parse')}>
                    Bulk Parse
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            sortedCandidates.map((candidate, index) => (
              <Card 
                key={candidate.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleViewCandidate(candidate)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Rank Badge */}
                      {index === 0 && candidate.score && candidate.score >= 85 && (
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                            <Star className="w-5 h-5 text-white fill-white" />
                          </div>
                        </div>
                      )}
                      {(!candidate.score || candidate.score < 85 || index > 0) && (
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                            {index + 1}
                          </div>
                        </div>
                      )}

                      {/* Candidate Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{candidate.name}</h3>
                          {candidate.fit && (
                            <Badge className={getFitColor(candidate.fit)} variant="secondary">
                              {candidate.fit}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {candidate.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {candidate.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {candidate.fileName}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {candidate.skills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.skills.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidate.skills.length - 5} more
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{candidate.experience_years} years experience</span>
                          <span>Applied {new Date(candidate.appliedDate).toLocaleDateString()}</span>
                        </div>

                        {/* Interview Results */}
                        {candidate.interviews.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-xs font-medium text-muted-foreground">Interviews:</span>
                              {candidate.interviews.map((interview, idx) => {
                                const interviewScore = interview.summary?.overall_score;
                                return (
                                  <Badge 
                                    key={interview.id} 
                                    variant={interviewScore ? "default" : "outline"}
                                    className="text-xs"
                                  >
                                    {interview.type === 'phone_screen' ? 'Phone' : 
                                     interview.type === 'technical' ? 'Technical' :
                                     interview.type === 'behavioral' ? 'Behavioral' :
                                     interview.type === 'final' ? 'Final' : 'Interview'}
                                    {interviewScore && ` ${interviewScore.toFixed(1)}/5`}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Scores */}
                      <div className="flex-shrink-0 text-right space-y-1">
                        {getCombinedScore(candidate) !== (candidate.score || 0) && (
                          <>
                            <div className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                              {getCombinedScore(candidate).toFixed(0)}%
                            </div>
                            <p className="text-xs text-muted-foreground">Combined Score</p>
                          </>
                        )}
                        {candidate.score && (
                          <>
                            <div className={`text-xl font-semibold ${getCombinedScore(candidate) !== candidate.score ? 'text-muted-foreground/70' : 'bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent'}`}>
                              {candidate.score}%
                            </div>
                            <p className="text-xs text-muted-foreground">{getCombinedScore(candidate) !== candidate.score ? 'CV Score' : 'Match Score'}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCandidate(candidate.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Delete Candidate Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base">
                Are you sure you want to remove this candidate from this role? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCandidateToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteCandidate}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Candidate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default RoleDetails;

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Users,
  FileText,
  Award,
  Calendar,
  ArrowUpRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRoles } from "@/contexts/RolesContext";
import { useToast } from "@/hooks/use-toast";
import { generateAllCandidatesPDF } from "@/lib/allCandidatesPDF";
import { useUsage } from "@/hooks/useUsage";

const Overview = () => {
  const navigate = useNavigate();
  const { roles } = useRoles();
  const { toast } = useToast();
  const { usage, limits, loadUsageData } = useUsage();
  const [scoreCandidateDialogOpen, setScoreCandidateDialogOpen] = useState(false);

  // Load usage data on mount
  useEffect(() => {
    loadUsageData();
  }, [loadUsageData]);

  // Get all candidates from all roles
  const allCandidates = roles.flatMap(role =>
    (role.candidatesList || []).map(candidate => ({
      ...candidate,
      roleTitle: role.title,
      roleId: role.id
    }))
  );

  // Calculate statistics from real data
  const totalCandidates = allCandidates.length;
  const candidatesWithScores = allCandidates.filter(c => c.score != null).length;
  const topMatches = allCandidates.filter(c => c.score && c.score >= 85).length;
  const averageScore = candidatesWithScores > 0
    ? allCandidates.reduce((sum, c) => sum + (c.score || 0), 0) / candidatesWithScores
    : 0;

  // Get recent candidates (sorted by appliedDate, most recent first)
  const recentCandidates = [...allCandidates]
    .sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime())
    .slice(0, 5);

  // Calculate time difference for "time ago" display
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const handleUploadNewCV = () => {
    navigate('/dashboard/parse');
  };

  const handleViewAllCandidates = () => {
    navigate('/dashboard/candidates');
  };

  const handleDownloadReport = async () => {
    toast({
      title: "Generating Report",
      description: "Creating comprehensive overview of all candidates...",
      duration: 3000,
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    generateAllCandidatesPDF({ roles });

    toast({
      title: "Report Ready",
      description: `Downloaded complete overview with ${allCandidates.length} candidates across ${roles.length} roles`,
    });
  };

  const handleScoreCandidateSelect = (candidate: any) => {
    setScoreCandidateDialogOpen(false);
    // Navigate to the role details page where the candidate is located
    navigate(`/dashboard/roles/${candidate.roleId}`);
    toast({
      title: "Candidate Selected",
      description: `Viewing ${candidate.name} in ${candidate.roleTitle}`,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
            <p className="text-muted-foreground">
              Here's what's happening with your hiring process today.
            </p>
          </div>
          <Badge className="bg-success/10 text-success border-success/20">
            Pro Plan • Active
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6" data-tour="stats-overview">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                CVs Processed
              </CardDescription>
              <CardTitle className="text-3xl">{totalCandidates}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {roles.length} active {roles.length === 1 ? 'role' : 'roles'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Candidates Scored
              </CardDescription>
              <CardTitle className="text-3xl">{candidatesWithScores}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {totalCandidates > 0
                  ? `${Math.round((candidatesWithScores / totalCandidates) * 100)}% scored`
                  : 'Upload CVs to get started'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Top Matches
              </CardDescription>
              <CardTitle className="text-3xl">{topMatches}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Candidates scored 85+
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Avg. Match Score
              </CardDescription>
              <CardTitle className="text-3xl">
                {candidatesWithScores > 0 ? averageScore.toFixed(1) : '—'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {candidatesWithScores > 0
                  ? `Based on ${candidatesWithScores} ${candidatesWithScores === 1 ? 'candidate' : 'candidates'}`
                  : 'No scored candidates yet'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest candidate evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentCandidates.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent activity yet</p>
                  <p className="text-sm mt-2">Upload and parse CVs to see candidates here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between py-3 border-b last:border-0 cursor-pointer hover:bg-accent/50 -mx-3 px-3 rounded-md transition-colors"
                      onClick={() => navigate(`/dashboard/candidates/${candidate.id}/${candidate.roleId}`)}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-sm text-muted-foreground">{candidate.roleTitle}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {candidate.score != null && (
                          <Badge
                            variant={candidate.score >= 85 ? "default" : "secondary"}
                            className={
                              candidate.score >= 85
                                ? "bg-success/10 text-success border-success/20"
                                : ""
                            }
                          >
                            Score: {candidate.score}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {getTimeAgo(candidate.appliedDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card data-tour="quick-actions">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  onClick={handleUploadNewCV}
                >
                  <span>Upload New CV</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  onClick={() => setScoreCandidateDialogOpen(true)}
                  disabled={allCandidates.length === 0}
                >
                  <span>Score Candidate</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  onClick={handleViewAllCandidates}
                >
                  <span>View All Candidates</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
                <Button
                  className="w-full justify-between"
                  variant="outline"
                  onClick={handleDownloadReport}
                  disabled={allCandidates.length === 0}
                >
                  <span>Download Report</span>
                  <Sparkles className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Usage Overview */}
            <Card>
              <CardHeader>
                <CardTitle>This Month's Usage</CardTitle>
                <CardDescription>
                  Your plan limits and usage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">CV Parses</span>
                    <span className="font-medium">
                      {usage?.parses_used || 0} / {limits?.max_parses || 0}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: limits?.max_parses
                          ? `${Math.min(((usage?.parses_used || 0) / limits.max_parses) * 100, 100)}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Scores Generated</span>
                    <span className="font-medium">
                      {usage?.scores_used || 0} / {limits?.max_scores || 0}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full transition-all"
                      style={{
                        width: limits?.max_scores
                          ? `${Math.min(((usage?.scores_used || 0) / limits.max_scores) * 100, 100)}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Active Roles</span>
                    </div>
                    <span className="font-medium">{roles.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>
              Key metrics from your hiring process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  High-Quality Matches
                </div>
                <p className="text-2xl font-bold">
                  {topMatches} {topMatches === 1 ? 'candidate' : 'candidates'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Scored 85 or above - ready for interview
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Average Match Score
                </div>
                <p className="text-2xl font-bold">
                  {candidatesWithScores > 0 ? averageScore.toFixed(1) : '—'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {candidatesWithScores > 0
                    ? `Across ${candidatesWithScores} scored ${candidatesWithScores === 1 ? 'candidate' : 'candidates'}`
                    : 'No scored candidates yet'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  Time Saved
                </div>
                <p className="text-2xl font-bold">
                  ~{Math.round(totalCandidates * 0.33)} hours
                </p>
                <p className="text-sm text-muted-foreground">
                  Estimated manual review time saved
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Candidate Dialog */}
        <Dialog open={scoreCandidateDialogOpen} onOpenChange={setScoreCandidateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Select Candidate to Score</DialogTitle>
              <DialogDescription>
                Choose a candidate from the list below to view their AI-powered score and details
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2 overflow-y-auto max-h-[60vh]">
              {allCandidates.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No candidates available yet</p>
                  <p className="text-sm mt-2">Upload and parse CVs to see candidates here</p>
                </div>
              ) : (
                allCandidates
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .map((candidate) => (
                    <Card
                      key={candidate.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleScoreCandidateSelect(candidate)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{candidate.name}</h4>
                              {candidate.score && (
                                <Badge
                                  variant={candidate.score >= 85 ? "default" : "secondary"}
                                  className={
                                    candidate.score >= 85
                                      ? "bg-success/10 text-success border-success/20"
                                      : ""
                                  }
                                >
                                  {candidate.score}%
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {candidate.roleTitle}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{candidate.email}</span>
                              <span>•</span>
                              <span>{candidate.experience_years} years exp</span>
                              {candidate.fit && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{candidate.fit}</span>
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {candidate.skills.slice(0, 4).map((skill: string) => (
                                <Badge key={skill} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {candidate.skills.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{candidate.skills.length - 4}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ArrowUpRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Overview;

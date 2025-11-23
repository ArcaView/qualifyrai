import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Activity, Users, FileText, Clock, Target, Code, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";
import { getEventCounts, getMonthlyApiCalls } from "@/lib/analytics";
import { useRoles } from "@/contexts/RolesContext";
import { useUsage } from "@/hooks/useUsage";

interface AnalyticsStats {
  totalCandidates: number;
  avgMatchScore: number;
  cvsProcessed: number;
  rolesCreated: number;
  totalApiCalls: number;
  candidatesScored: number;
}

const Analytics = () => {
  const { roles } = useRoles();
  const { usage } = useUsage();
  const [stats, setStats] = useState<AnalyticsStats>({
    totalCandidates: 0,
    avgMatchScore: 0,
    cvsProcessed: 0,
    rolesCreated: 0,
    totalApiCalls: 0,
    candidatesScored: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get last 30 days of events
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();

      const [eventCounts, apiCalls] = await Promise.all([
        getEventCounts(thirtyDaysAgo, today),
        getMonthlyApiCalls()
      ]);

      // Calculate stats from events
      const candidatesParsed = eventCounts.find(e => e.event_type === 'cv_parsed')?.count || 0;
      const candidatesScored = eventCounts.find(e => e.event_type === 'candidate_scored')?.count || 0;
      const rolesCreated = eventCounts.find(e => e.event_type === 'role_created')?.count || 0;
      const candidatesAdded = eventCounts.find(e => e.event_type === 'candidate_added')?.count || 0;

      // Calculate total candidates from roles
      const totalCandidates = roles.reduce((sum, role) => sum + role.candidates, 0);

      // Calculate average match score from candidates with scores
      let totalScore = 0;
      let scoredCount = 0;
      roles.forEach(role => {
        role.candidatesList.forEach(candidate => {
          if (candidate.score && candidate.score > 0) {
            totalScore += candidate.score;
            scoredCount++;
          }
        });
      });
      const avgMatchScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;

      setStats({
        totalCandidates,
        avgMatchScore,
        cvsProcessed: candidatesParsed,
        rolesCreated,
        totalApiCalls: apiCalls,
        candidatesScored
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recruitment metrics for main users
  const recruitmentStats = [
    {
      title: "Total Candidates",
      value: loading ? "..." : stats.totalCandidates.toString(),
      change: stats.totalCandidates > 0 ? `${stats.totalCandidates} total` : "No data yet",
      icon: Users,
      description: "All time",
    },
    {
      title: "Avg. Match Score",
      value: loading ? "..." : stats.avgMatchScore > 0 ? `${stats.avgMatchScore}%` : "N/A",
      change: stats.candidatesScored > 0 ? `${stats.candidatesScored} scored` : "No scored candidates",
      icon: Target,
      description: "All time",
    },
    {
      title: "CVs Processed",
      value: loading ? "..." : stats.cvsProcessed.toString(),
      change: stats.cvsProcessed > 0 ? `${stats.cvsProcessed} parsed` : "No data yet",
      icon: FileText,
      description: "Last 30 days",
    },
    {
      title: "Open Roles",
      value: loading ? "..." : stats.rolesCreated.toString(),
      change: roles.filter(r => r.status === 'active').length + " active",
      icon: Clock,
      description: "Last 30 days",
    },
  ];

  // API metrics for developers
  const apiStats = [
    {
      title: "Total API Calls",
      value: loading ? "..." : stats.totalApiCalls.toString(),
      change: usage?.api_calls_made || 0 + " this month",
      icon: Activity,
      description: "Last 30 days",
    },
    {
      title: "CVs Parsed",
      value: loading ? "..." : (usage?.parses_used || 0).toString(),
      change: stats.cvsProcessed + " total",
      icon: FileText,
      description: "This month",
    },
    {
      title: "Candidates Scored",
      value: loading ? "..." : (usage?.scores_used || 0).toString(),
      change: stats.candidatesScored + " total",
      icon: Target,
      description: "This month",
    },
    {
      title: "Roles Created",
      value: loading ? "..." : stats.rolesCreated.toString(),
      change: roles.length + " total",
      icon: Code,
      description: "Last 30 days",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Monitor your recruitment metrics and API performance
          </p>
        </div>

        <Tabs defaultValue="recruitment" className="space-y-6">
          <TabsList>
            <TabsTrigger value="recruitment">Recruitment Metrics</TabsTrigger>
            <TabsTrigger value="api">Developer Metrics</TabsTrigger>
          </TabsList>

          {/* Recruitment View */}
          <TabsContent value="recruitment" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="analytics-metrics">
              {recruitmentStats.map((stat, index) => {
                const Icon = stat.icon;
                const isNeutral = !stat.change.startsWith('+') && !stat.change.startsWith('-');
                return (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className={isNeutral ? "text-muted-foreground" : "text-primary"}>
                          {stat.change}
                        </span> {stat.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hiring Pipeline</CardTitle>
                  <CardDescription>
                    Candidates by status across all roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const statusCounts = {
                        new: 0,
                        reviewing: 0,
                        shortlisted: 0,
                        interviewing: 0,
                        offered: 0,
                        hired: 0,
                        rejected: 0
                      };

                      roles.forEach(role => {
                        role.candidatesList.forEach(candidate => {
                          statusCounts[candidate.status]++;
                        });
                      });

                      const totalCandidates = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

                      if (totalCandidates === 0) {
                        return (
                          <div className="h-64 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                              <p>No candidates yet</p>
                              <p className="text-xs mt-1">Parse some CVs to see pipeline metrics</p>
                            </div>
                          </div>
                        );
                      }

                      return Object.entries(statusCounts).map(([status, count]) => {
                        if (count === 0) return null;
                        const percentage = Math.round((count / totalCandidates) * 100);
                        return (
                          <div key={status} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{status}</span>
                              <span className="text-muted-foreground">{count} ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Candidate Score Distribution</CardTitle>
                  <CardDescription>
                    Match score distribution for all candidates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const scoreRanges = {
                        'Excellent (80-100)': 0,
                        'Good (60-79)': 0,
                        'Fair (40-59)': 0,
                        'Poor (0-39)': 0,
                        'Not Scored': 0
                      };

                      let totalScored = 0;

                      roles.forEach(role => {
                        role.candidatesList.forEach(candidate => {
                          if (candidate.score && candidate.score > 0) {
                            totalScored++;
                            if (candidate.score >= 80) scoreRanges['Excellent (80-100)']++;
                            else if (candidate.score >= 60) scoreRanges['Good (60-79)']++;
                            else if (candidate.score >= 40) scoreRanges['Fair (40-59)']++;
                            else scoreRanges['Poor (0-39)']++;
                          } else {
                            scoreRanges['Not Scored']++;
                          }
                        });
                      });

                      const totalCandidates = totalScored + scoreRanges['Not Scored'];

                      if (totalCandidates === 0) {
                        return (
                          <div className="h-64 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
                              <p>No scored candidates yet</p>
                              <p className="text-xs mt-1">Score candidates to see distribution</p>
                            </div>
                          </div>
                        );
                      }

                      return Object.entries(scoreRanges).map(([range, count]) => {
                        if (count === 0) return null;
                        const percentage = Math.round((count / totalCandidates) * 100);
                        return (
                          <div key={range} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{range}</span>
                              <span className="text-muted-foreground">{count} ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Skills Requested</CardTitle>
                  <CardDescription>
                    Most common skills across all candidates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const skillCounts: Record<string, number> = {};

                      roles.forEach(role => {
                        role.candidatesList.forEach(candidate => {
                          candidate.skills.forEach(skill => {
                            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
                          });
                        });
                      });

                      const sortedSkills = Object.entries(skillCounts)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10);

                      if (sortedSkills.length === 0) {
                        return (
                          <div className="h-64 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <Target className="h-12 w-12 mx-auto mb-2 opacity-20" />
                              <p>No skills data yet</p>
                              <p className="text-xs mt-1">Parse CVs to see skill distribution</p>
                            </div>
                          </div>
                        );
                      }

                      const maxCount = sortedSkills[0][1];

                      return sortedSkills.map(([skill, count]) => {
                        const percentage = Math.round((count / maxCount) * 100);
                        return (
                          <div key={skill} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{skill}</span>
                              <span className="text-muted-foreground">{count}</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Overview</CardTitle>
                  <CardDescription>
                    Recent activity summary
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">CVs Parsed (30d)</span>
                      </div>
                      <span className="font-medium">{stats.cvsProcessed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Candidates Scored (30d)</span>
                      </div>
                      <span className="font-medium">{stats.candidatesScored}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Roles Created (30d)</span>
                      </div>
                      <span className="font-medium">{stats.rolesCreated}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Total Candidates</span>
                      </div>
                      <span className="font-medium">{stats.totalCandidates}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Developer/API View */}
          <TabsContent value="api" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {apiStats.map((stat, index) => {
                const Icon = stat.icon;
                const isNeutral = !stat.change.startsWith('+') && !stat.change.startsWith('-');
                return (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className={isNeutral ? "text-muted-foreground" : "text-primary"}>
                          {stat.change}
                        </span> {stat.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>API Usage Details</CardTitle>
                <CardDescription>
                  Detailed breakdown of API operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Total API Calls (Month)</span>
                    </div>
                    <span className="font-medium">{usage?.api_calls_made || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Parse Operations</span>
                    </div>
                    <span className="font-medium">{usage?.parses_used || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Score Operations</span>
                    </div>
                    <span className="font-medium">{usage?.scores_used || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, FileText, Clock, Target } from "lucide-react";
import { useRoles } from "@/contexts/RolesContext";
import { useMemo } from "react";

const Analytics = () => {
  const { roles } = useRoles();

  // Calculate real statistics from actual data
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get all candidates
    const allCandidates = roles.flatMap(role => role.candidatesList || []);
    
    // Candidates in last 30 days
    const recentCandidates = allCandidates.filter(c => {
      try {
        const appliedDate = new Date(c.appliedDate);
        return !isNaN(appliedDate.getTime()) && appliedDate >= thirtyDaysAgo;
      } catch {
        return false;
      }
    });
    
    // Candidates in previous 30 days (for comparison)
    const previousPeriodCandidates = allCandidates.filter(c => {
      try {
        const appliedDate = new Date(c.appliedDate);
        return !isNaN(appliedDate.getTime()) && appliedDate >= sixtyDaysAgo && appliedDate < thirtyDaysAgo;
      } catch {
        return false;
      }
    });

    // Total candidates
    const totalCandidates = allCandidates.length;
    const previousTotal = totalCandidates - recentCandidates.length + previousPeriodCandidates.length;
    const totalCandidatesChange = previousTotal > 0 
      ? ((recentCandidates.length - previousPeriodCandidates.length) / previousTotal * 100).toFixed(1)
      : '0';

    // Average match score
    const scoredCandidates = allCandidates.filter(c => c.score !== undefined && c.score !== null);
    const avgScore = scoredCandidates.length > 0
      ? scoredCandidates.reduce((sum, c) => sum + (c.score || 0), 0) / scoredCandidates.length
      : 0;
    
    const recentScored = recentCandidates.filter(c => c.score !== undefined && c.score !== null);
    const recentAvgScore = recentScored.length > 0
      ? recentScored.reduce((sum, c) => sum + (c.score || 0), 0) / recentScored.length
      : 0;
    
    const previousScored = previousPeriodCandidates.filter(c => c.score !== undefined && c.score !== null);
    const previousAvgScore = previousScored.length > 0
      ? previousScored.reduce((sum, c) => sum + (c.score || 0), 0) / previousScored.length
      : 0;
    
    const avgScoreChange = previousAvgScore > 0
      ? ((recentAvgScore - previousAvgScore) / previousAvgScore * 100).toFixed(1)
      : '0';

    // CVs processed (same as candidates, since each candidate has a CV)
    const cvsProcessed = allCandidates.length;
    const previousCvs = previousTotal;
    const cvsChange = previousCvs > 0
      ? ((recentCandidates.length - previousPeriodCandidates.length) / previousCvs * 100).toFixed(1)
      : '0';

    // Time-to-hire (from status history: new -> hired)
    const hiredCandidates = allCandidates.filter(c => c.status === 'hired');
    const timeToHireValues = hiredCandidates
      .map(candidate => {
        const newEntry = candidate.statusHistory?.find(e => e.status === 'new');
        const hiredEntry = candidate.statusHistory?.find(e => e.status === 'hired');
        if (newEntry && hiredEntry) {
          const newDate = new Date(newEntry.changedAt);
          const hiredDate = new Date(hiredEntry.changedAt);
          const days = Math.round((hiredDate.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24));
          return days;
        }
        return null;
      })
      .filter((days): days is number => days !== null && days >= 0);
    
    const avgTimeToHire = timeToHireValues.length > 0
      ? Math.round(timeToHireValues.reduce((sum, days) => sum + days, 0) / timeToHireValues.length)
      : 0;
    
    // Calculate previous period average for comparison
    const recentHired = hiredCandidates.filter(c => {
      const hiredEntry = c.statusHistory?.find(e => e.status === 'hired');
      return hiredEntry && new Date(hiredEntry.changedAt) >= thirtyDaysAgo;
    });
    const previousHired = hiredCandidates.filter(c => {
      const hiredEntry = c.statusHistory?.find(e => e.status === 'hired');
      return hiredEntry && new Date(hiredEntry.changedAt) >= sixtyDaysAgo && new Date(hiredEntry.changedAt) < thirtyDaysAgo;
    });
    
    const recentTimeToHire = recentHired
      .map(c => {
        const newEntry = c.statusHistory?.find(e => e.status === 'new');
        const hiredEntry = c.statusHistory?.find(e => e.status === 'hired');
        if (newEntry && hiredEntry) {
          const days = Math.round((new Date(hiredEntry.changedAt).getTime() - new Date(newEntry.changedAt).getTime()) / (1000 * 60 * 60 * 24));
          return days;
        }
        return null;
      })
      .filter((days): days is number => days !== null);
    
    const previousTimeToHire = previousHired
      .map(c => {
        const newEntry = c.statusHistory?.find(e => e.status === 'new');
        const hiredEntry = c.statusHistory?.find(e => e.status === 'hired');
        if (newEntry && hiredEntry) {
          const days = Math.round((new Date(hiredEntry.changedAt).getTime() - new Date(newEntry.changedAt).getTime()) / (1000 * 60 * 60 * 24));
          return days;
        }
        return null;
      })
      .filter((days): days is number => days !== null);
    
    const recentAvgTTH = recentTimeToHire.length > 0
      ? Math.round(recentTimeToHire.reduce((sum, days) => sum + days, 0) / recentTimeToHire.length)
      : avgTimeToHire;
    
    const previousAvgTTH = previousTimeToHire.length > 0
      ? Math.round(previousTimeToHire.reduce((sum, days) => sum + days, 0) / previousTimeToHire.length)
      : avgTimeToHire;
    
    const timeToHireChange = previousAvgTTH > 0
      ? (previousAvgTTH - recentAvgTTH).toFixed(0)
      : '0';

    return {
      totalCandidates: {
        value: totalCandidates.toLocaleString(),
        change: parseFloat(totalCandidatesChange) >= 0 ? `+${totalCandidatesChange}%` : `${totalCandidatesChange}%`,
      },
      avgScore: {
        value: `${avgScore.toFixed(0)}%`,
        change: parseFloat(avgScoreChange) >= 0 ? `+${avgScoreChange}%` : `${avgScoreChange}%`,
      },
      cvsProcessed: {
        value: cvsProcessed.toLocaleString(),
        change: parseFloat(cvsChange) >= 0 ? `+${cvsChange}%` : `${cvsChange}%`,
      },
      avgTimeToHire: {
        value: avgTimeToHire > 0 ? `${avgTimeToHire} days` : 'N/A',
        change: avgTimeToHire > 0 && previousAvgTTH > 0 
          ? (parseInt(timeToHireChange) >= 0 ? `-${timeToHireChange} days` : `+${Math.abs(parseInt(timeToHireChange))} days`)
          : 'N/A',
      },
    };
  }, [roles]);

  // Recruitment metrics for main users
  const recruitmentStats = [
    {
      title: "Total Candidates",
      value: stats.totalCandidates.value,
      change: stats.totalCandidates.change,
      icon: Users,
      description: "Last 30 days",
    },
    {
      title: "Avg. Match Score",
      value: stats.avgScore.value,
      change: stats.avgScore.change,
      icon: Target,
      description: "Last 30 days",
    },
    {
      title: "CVs Processed",
      value: stats.cvsProcessed.value,
      change: stats.cvsProcessed.change,
      icon: FileText,
      description: "Last 30 days",
    },
    {
      title: "Avg. Time-to-Hire",
      value: stats.avgTimeToHire.value,
      change: stats.avgTimeToHire.change,
      icon: Clock,
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
          </TabsList>

          {/* Recruitment View */}
          <TabsContent value="recruitment" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="analytics-metrics">
              {recruitmentStats.map((stat, index) => {
                const Icon = stat.icon;
                // Positive change: + for increases (or - for time-to-hire decrease)
                const isPositive = stat.change.startsWith('+') || (stat.change.startsWith('-') && stat.title.includes('Time')) || stat.change === 'N/A';
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
                      {stat.change !== 'N/A' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className={isPositive ? "text-green-600" : "text-muted-foreground"}>{stat.change}</span> from {stat.description}
                        </p>
                      )}
                      {stat.change === 'N/A' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hiring Pipeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Hiring Pipeline</CardTitle>
                  <CardDescription>
                    Candidates by status across all roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const statusCounts: Record<string, number> = {};
                    roles.forEach(role => {
                      role.candidatesList?.forEach(candidate => {
                        statusCounts[candidate.status] = (statusCounts[candidate.status] || 0) + 1;
                      });
                    });
                    
                    const statusLabels: Record<string, string> = {
                      'new': 'New',
                      'reviewing': 'Reviewing',
                      'shortlisted': 'Shortlisted',
                      'interviewing': 'Interviewing',
                      'offered': 'Offered',
                      'hired': 'Hired',
                      'rejected': 'Rejected',
                    };
                    
                    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
                    
                    return total > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(statusCounts)
                          .sort(([, a], [, b]) => b - a)
                          .map(([status, count]) => {
                            const percentage = (count / total * 100).toFixed(1);
                            return (
                              <div key={status} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium">{statusLabels[status] || status}</span>
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
                          })}
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p>No candidates yet</p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Candidate Score Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Candidate Score Distribution</CardTitle>
                  <CardDescription>
                    Match score distribution for all candidates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const allCandidates = roles.flatMap(role => role.candidatesList || []);
                    const scoredCandidates = allCandidates.filter(c => c.score !== undefined && c.score !== null);
                    
                    if (scoredCandidates.length === 0) {
                      return (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>No scored candidates yet</p>
                          </div>
                        </div>
                      );
                    }
                    
                    const scoreRanges = {
                      '90-100': scoredCandidates.filter(c => (c.score || 0) >= 90).length,
                      '80-89': scoredCandidates.filter(c => (c.score || 0) >= 80 && (c.score || 0) < 90).length,
                      '70-79': scoredCandidates.filter(c => (c.score || 0) >= 70 && (c.score || 0) < 80).length,
                      '60-69': scoredCandidates.filter(c => (c.score || 0) >= 60 && (c.score || 0) < 70).length,
                      '0-59': scoredCandidates.filter(c => (c.score || 0) < 60).length,
                    };
                    
                    const maxCount = Math.max(...Object.values(scoreRanges));
                    
                    return (
                      <div className="space-y-4">
                        {Object.entries(scoreRanges).map(([range, count]) => {
                          const percentage = maxCount > 0 ? (count / maxCount * 100).toFixed(0) : 0;
                          return (
                            <div key={range} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{range}%</span>
                                <span className="text-muted-foreground">{count} candidates</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;

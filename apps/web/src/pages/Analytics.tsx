import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Activity, Users, FileText, Clock, Target } from "lucide-react";
import { useRoles } from "@/contexts/RolesContext";
import { useMemo } from "react";

const Analytics = () => {
  const { roles } = useRoles();

  // Calculate real statistics from actual data
  const stats = useMemo(() => {
    // Flatten all candidates from all roles
    const allCandidates = roles.flatMap(role => role.candidatesList || []);

    // Total candidates
    const totalCandidates = allCandidates.length;

    // Average match score (only for candidates with scores)
    const candidatesWithScores = allCandidates.filter(c => c.score !== undefined);
    const avgScore = candidatesWithScores.length > 0
      ? Math.round(candidatesWithScores.reduce((sum, c) => sum + (c.score || 0), 0) / candidatesWithScores.length)
      : 0;

    // CVs processed (same as total candidates for now)
    const cvsProcessed = totalCandidates;

    // Calculate time-to-hire (candidates who went from reviewing to hired)
    const hiredCandidates = allCandidates.filter(c => c.status === 'hired');
    let avgTimeToHire = 0;
    if (hiredCandidates.length > 0) {
      const times = hiredCandidates.map(c => {
        const appliedDate = new Date(c.appliedDate);
        const hiredDate = c.statusHistory?.find(h => h.status === 'hired')?.changedAt;
        if (hiredDate) {
          const hired = new Date(hiredDate);
          return Math.floor((hired.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        return 0;
      }).filter(t => t > 0);

      avgTimeToHire = times.length > 0
        ? Math.round(times.reduce((sum, t) => sum + t, 0) / times.length)
        : 0;
    }

    return {
      totalCandidates,
      avgScore,
      cvsProcessed,
      avgTimeToHire
    };
  }, [roles]);

  const recruitmentStats = [
    {
      title: "Total Candidates",
      value: stats.totalCandidates.toString(),
      icon: Users,
      description: "All time",
    },
    {
      title: "Avg. Match Score",
      value: stats.avgScore > 0 ? `${stats.avgScore}%` : "N/A",
      icon: Target,
      description: "Across all candidates",
    },
    {
      title: "CVs Processed",
      value: stats.cvsProcessed.toString(),
      icon: FileText,
      description: "All time",
    },
    {
      title: "Avg. Time-to-Hire",
      value: stats.avgTimeToHire > 0 ? `${stats.avgTimeToHire} days` : "N/A",
      icon: Clock,
      description: "For hired candidates",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Monitor your recruitment metrics and performance
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="analytics-metrics">
            {recruitmentStats.map((stat, index) => {
              const Icon = stat.icon;
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
                      {stat.description}
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
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Pipeline metrics will be displayed here</p>
                    </div>
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
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Score distribution will be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Skills Requested</CardTitle>
                  <CardDescription>
                    Most frequently required skills across all roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Target className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Skills analysis will be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hiring Trends</CardTitle>
                  <CardDescription>
                    Number of hires and applications over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Activity className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Hiring trends will be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;

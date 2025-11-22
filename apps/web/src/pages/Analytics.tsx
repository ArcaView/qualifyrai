import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Activity, Users, FileText, Clock, Target, Code } from "lucide-react";

const Analytics = () => {
  // Recruitment metrics for main users
  const recruitmentStats = [
    {
      title: "Total Candidates",
      value: "1,247",
      change: "+18.2%",
      icon: Users,
      description: "Last 30 days",
    },
    {
      title: "Avg. Match Score",
      value: "76%",
      change: "+3.5%",
      icon: Target,
      description: "Last 30 days",
    },
    {
      title: "CVs Processed",
      value: "2,456",
      change: "+12.5%",
      icon: FileText,
      description: "Last 30 days",
    },
    {
      title: "Avg. Time-to-Hire",
      value: "18 days",
      change: "-4 days",
      icon: Clock,
      description: "Last 30 days",
    },
  ];

  // API metrics for developers
  const apiStats = [
    {
      title: "Total API Calls",
      value: "12,456",
      change: "+12.5%",
      icon: Activity,
      description: "Last 30 days",
    },
    {
      title: "Success Rate",
      value: "99.2%",
      change: "+0.3%",
      icon: TrendingUp,
      description: "Last 30 days",
    },
    {
      title: "Avg. Response Time",
      value: "245ms",
      change: "-15ms",
      icon: BarChart3,
      description: "Last 30 days",
    },
    {
      title: "Active API Keys",
      value: "8",
      change: "+2",
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
                const isPositive = stat.change.startsWith('+') || stat.change.startsWith('-') && stat.title.includes('Time');
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
                        <span className={isPositive ? "text-green-600" : "text-muted-foreground"}>{stat.change}</span> from {stat.description}
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
          </TabsContent>

          {/* API/Developer View */}
          <TabsContent value="api" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {apiStats.map((stat, index) => {
                const Icon = stat.icon;
                const isPositive = stat.change.startsWith('+') || (stat.change.startsWith('-') && stat.title.includes('Response'));
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
                        <span className={isPositive ? "text-green-600" : "text-muted-foreground"}>{stat.change}</span> from {stat.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Usage Over Time</CardTitle>
                  <CardDescription>
                    Track your API calls and usage patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Activity className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>API usage charts will be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Time Trends</CardTitle>
                  <CardDescription>
                    Monitor API performance and latency metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Performance metrics will be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Endpoint Usage</CardTitle>
                  <CardDescription>
                    Most frequently called API endpoints
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Code className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Endpoint usage will be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Rates</CardTitle>
                  <CardDescription>
                    Track errors and failed requests by type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Error analytics will be displayed here</p>
                    </div>
                  </div>
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

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key,
  BarChart3,
  FileText,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import { useState } from "react";

const Dashboard = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const apiKey = "ps_live_1234567890abcdef1234567890abcdef";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <DashboardLayout>
      <div className="bg-muted/30 min-h-full">
        {/* Header */}
        <section className="py-12 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back! Here's your API overview.
                </p>
              </div>
              <Badge className="bg-success/10 text-success border-success/20">
                Starter Plan • Active
              </Badge>
            </div>
          </div>
        </section>

        {/* Stats Overview */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-6 mb-8" data-tour="stats-overview">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>API Calls This Month</CardDescription>
                  <CardTitle className="text-3xl">247</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    753 remaining in plan
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Parses</CardDescription>
                  <CardTitle className="text-3xl">156</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    844 remaining
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Scores</CardDescription>
                  <CardTitle className="text-3xl">91</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    409 remaining
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Avg Response Time</CardDescription>
                  <CardTitle className="text-3xl">1.8s</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="w-3 h-3" />
                    Excellent
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="api-keys" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="api-keys" data-tour="api-keys-tab">API Keys</TabsTrigger>
                <TabsTrigger value="usage" data-tour="usage-tab">Usage</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* API Keys Tab */}
              <TabsContent value="api-keys" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Key className="w-5 h-5" />
                          API Keys
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Manage your API authentication keys
                        </CardDescription>
                      </div>
                      <Button size="sm">
                        Create New Key
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Production Key */}
                      <div className="border rounded-lg p-4" data-tour="api-key-section">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold mb-1">Production Key</h3>
                            <p className="text-sm text-muted-foreground">
                              Created on Nov 1, 2025 • Last used 2 hours ago
                            </p>
                          </div>
                          <Badge className="bg-success/10 text-success border-success/20">
                            Active
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 bg-code rounded p-3">
                          <code className="flex-1 text-sm font-mono text-code-foreground">
                            {showApiKey ? apiKey : apiKey.slice(0, 12) + '••••••••••••••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(apiKey)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Info Box */}
                      <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium mb-1">Keep your API keys secure</p>
                          <p className="text-muted-foreground">
                            Never share your API keys publicly or commit them to version control.
                            Use environment variables in your applications.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Usage Tab */}
              <TabsContent value="usage" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Usage Statistics
                    </CardTitle>
                    <CardDescription>
                      Track your API usage and performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Usage Bars */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Parses</span>
                          <span className="text-sm text-muted-foreground">156 / 1,000</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: '15.6%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">Scores</span>
                          <span className="text-sm text-muted-foreground">91 / 500</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-accent h-2 rounded-full" style={{ width: '18.2%' }} />
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          </div>
                          <div>
                            <p className="font-medium">99.2% Success Rate</p>
                            <p className="text-sm text-muted-foreground">245 successful / 247 total</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">1.8s Avg Response</p>
                            <p className="text-sm text-muted-foreground">Well below 2.5s target</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>
                      Your latest API requests and events
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { endpoint: 'POST /api/parse', status: 'success', time: '2 minutes ago', duration: '1.2s' },
                        { endpoint: 'POST /api/score', status: 'success', time: '8 minutes ago', duration: '0.9s' },
                        { endpoint: 'POST /api/parse', status: 'success', time: '15 minutes ago', duration: '2.1s' },
                        { endpoint: 'POST /api/score', status: 'success', time: '1 hour ago', duration: '1.5s' },
                        { endpoint: 'POST /api/parse', status: 'error', time: '2 hours ago', duration: '0.3s' },
                      ].map((activity, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              activity.status === 'success' ? 'bg-success' : 'bg-destructive'
                            }`} />
                            <div>
                              <code className="text-sm font-mono">{activity.endpoint}</code>
                              <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={activity.status === 'success' ? 'default' : 'destructive'}>
                              {activity.status === 'success' ? 'Success' : 'Error'}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{activity.duration}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Quick Links */}
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <Card className="border-primary/20 hover:shadow-lg transition-shadow cursor-pointer" data-tour="documentation-link">
                <CardHeader>
                  <FileText className="w-8 h-8 text-primary mb-2" />
                  <CardTitle className="text-lg">Documentation</CardTitle>
                  <CardDescription>
                    Learn how to integrate our API
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-accent/20 hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <BarChart3 className="w-8 h-8 text-accent mb-2" />
                  <CardTitle className="text-lg">Upgrade Plan</CardTitle>
                  <CardDescription>
                    Get more API calls and features
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <Activity className="w-8 h-8 text-muted-foreground mb-2" />
                  <CardTitle className="text-lg">View Analytics</CardTitle>
                  <CardDescription>
                    Detailed performance insights
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

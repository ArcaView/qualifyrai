import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  EyeOff,
  Code2
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const apiKey = "ps_live_1234567890abcdef1234567890abcdef";

  const copyToClipboard = (text: string, keyName: string = "API Key") => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${keyName} copied to clipboard`,
    });
  };

  const handleGenerateKeyClick = () => {
    setNewKeyName("Production Key");
    setShowKeyDialog(true);
  };

  const handleConfirmGenerateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingKey(true);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "API Key Generated",
        description: "Your new API key has been created. Make sure to copy it now.",
      });

      setShowKeyDialog(false);
      setNewKeyName("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate API key. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 bg-muted/30">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Code2 className="w-8 h-8" />
              Developer Dashboard
            </h1>
            <p className="text-muted-foreground">
              API keys, documentation, and technical resources
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6">
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
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="mt-6">
            <Card data-tour="api-keys">
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
                  <Button size="sm" onClick={handleGenerateKeyClick}>
                    Create New Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Production Key */}
                  <div className="border rounded-lg p-4">
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
                        onClick={() => copyToClipboard(apiKey, "Production Key")}
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
        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="border-primary/20 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/docs')}
          >
            <CardHeader>
              <FileText className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Documentation</CardTitle>
              <CardDescription>
                Learn how to integrate our API
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="border-accent/20 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/upgrade')}
          >
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-accent mb-2" />
              <CardTitle className="text-lg">Upgrade Plan</CardTitle>
              <CardDescription>
                Get more API calls and features
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Create API Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for authentication. Make sure to copy it immediately as it won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., Production Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmGenerateKey();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowKeyDialog(false)}
              disabled={isGeneratingKey}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmGenerateKey}
              disabled={isGeneratingKey}
            >
              {isGeneratingKey ? "Generating..." : "Generate Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DeveloperDashboard;

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
  Code2,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUsage } from "@/hooks/useUsage";
import { fetchApiKeys, generateApiKey, type ApiKey } from "@/lib/api/api-keys";
import { formatDistanceToNow } from "date-fns";

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { usage, limits, loading: usageLoading, loadUsageData, remainingParses, remainingScores } = useUsage();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);

  // Load API keys and usage data on mount
  useEffect(() => {
    loadKeys();
    loadUsageData();
  }, [loadUsageData]);

  const loadKeys = async () => {
    setLoadingKeys(true);
    const keys = await fetchApiKeys();
    setApiKeys(keys);
    setLoadingKeys(false);
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

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
      const result = await generateApiKey(newKeyName);

      if (result.success && result.apiKey) {
        setNewlyGeneratedKey(result.apiKey);
        setShowKeyDialog(false);
        setShowNewKeyDialog(true);
        setNewKeyName("");

        // Refresh API keys list
        await loadKeys();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate API key. Please try again.",
          variant: "destructive",
        });
      }
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
              <CardTitle className="text-3xl">
                {usageLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (usage?.api_calls_made || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {usageLoading ? '...' : `${limits?.max_parses || 0} total in plan`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Parses</CardDescription>
              <CardTitle className="text-3xl">
                {usageLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (usage?.parses_used || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {usageLoading ? '...' : `${remainingParses()} remaining`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Scores</CardDescription>
              <CardTitle className="text-3xl">
                {usageLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (usage?.scores_used || 0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {usageLoading ? '...' : `${remainingScores()} remaining`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active API Keys</CardDescription>
              <CardTitle className="text-3xl">
                {loadingKeys ? <Loader2 className="w-6 h-6 animate-spin" /> : apiKeys.filter(k => k.is_active).length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {loadingKeys ? '...' : `${apiKeys.length} total keys`}
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
                  {/* API Keys List */}
                  {loadingKeys ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : apiKeys.length === 0 ? (
                    <div className="text-center py-8">
                      <Key className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <h3 className="font-semibold mb-1">No API Keys Yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first API key to start using the API
                      </p>
                      <Button size="sm" onClick={handleGenerateKeyClick}>
                        Generate API Key
                      </Button>
                    </div>
                  ) : (
                    apiKeys.map((key) => (
                      <div key={key.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold mb-1">{key.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Created {formatDistanceToNow(new Date(key.created_at), { addSuffix: true })}
                              {key.last_used_at && ` • Last used ${formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })}`}
                            </p>
                          </div>
                          <Badge className={key.is_active ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                            {key.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 bg-code rounded p-3">
                          <code className="flex-1 text-sm font-mono text-code-foreground">
                            {key.key_prefix}{'••••••••••••••••••••••••••••••••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="Full key is not stored and cannot be retrieved"
                          >
                            <EyeOff className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(key.key_prefix, key.name)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Info Box */}
                  <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Keep your API keys secure</p>
                      <p className="text-muted-foreground">
                        Never share your API keys publicly or commit them to version control.
                        Use environment variables in your applications. Keys are only shown once upon generation.
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
                {usageLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Usage Bars */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Parses</span>
                        <span className="text-sm text-muted-foreground">
                          {usage?.parses_used || 0} / {limits?.max_parses && limits.max_parses >= 900000 ? 'Unlimited' : (limits?.max_parses || 0)}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: limits?.max_parses && limits.max_parses < 900000
                              ? `${Math.min(((usage?.parses_used || 0) / limits.max_parses) * 100, 100)}%`
                              : '5%'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Scores</span>
                        <span className="text-sm text-muted-foreground">
                          {usage?.scores_used || 0} / {limits?.max_scores && limits.max_scores >= 900000 ? 'Unlimited' : (limits?.max_scores || 0)}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-accent h-2 rounded-full"
                          style={{
                            width: limits?.max_scores && limits.max_scores < 900000
                              ? `${Math.min(((usage?.scores_used || 0) / limits.max_scores) * 100, 100)}%`
                              : '5%'
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">API Calls This Month</p>
                          <p className="text-sm text-muted-foreground">{usage?.api_calls_made || 0} total calls</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">Current Period</p>
                          <p className="text-sm text-muted-foreground">
                            {usage?.period_start ? new Date(usage.period_start).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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

      {/* Show New API Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              API Key Generated Successfully
            </DialogTitle>
            <DialogDescription>
              Copy this API key now - you won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg border-2 border-primary/20">
              <Label className="text-xs text-muted-foreground mb-2 block">Your API Key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono break-all bg-code p-3 rounded text-code-foreground">
                  {newlyGeneratedKey}
                </code>
                <Button
                  size="sm"
                  onClick={() => {
                    if (newlyGeneratedKey) {
                      copyToClipboard(newlyGeneratedKey, "API Key");
                    }
                  }}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning mb-1">Important Security Notice</p>
                <p className="text-muted-foreground text-xs">
                  Store this key securely. It will not be displayed again. Anyone with this key can access your account.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowNewKeyDialog(false);
                setNewlyGeneratedKey(null);
              }}
            >
              I've Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DeveloperDashboard;

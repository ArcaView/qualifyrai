import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { isAdminEmail } from "@/lib/constants";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  MessageSquare,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  XCircle,
  BarChart3,
  Shield,
  FileText,
  Settings,
  DollarSign,
  Database,
  Code,
  ArrowRight,
  ChevronRight,
  UserCog,
} from "lucide-react";

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  upvotes: number;
  downvotes: number;
  status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useUser();
  const { startImpersonation, isImpersonating, currentSession } = useImpersonation();
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonationEmail, setImpersonationEmail] = useState("");
  const [impersonationReason, setImpersonationReason] = useState("");
  const [isRequestingImpersonation, setIsRequestingImpersonation] = useState(false);
  const { toast } = useToast();

  const isAdmin = isAdminEmail(user?.email);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate, toast]);

  // Fetch feature requests for stats
  const fetchFeatures = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("feature_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeatures(data || []);
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchFeatures();
    }
  }, [isAdmin]);

  // Handle impersonation request
  const handleImpersonationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!impersonationEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a user email address",
        variant: "destructive",
      });
      return;
    }

    setIsRequestingImpersonation(true);
    const success = await startImpersonation(impersonationEmail, impersonationReason || undefined);
    setIsRequestingImpersonation(false);

    if (success) {
      setImpersonationEmail("");
      setImpersonationReason("");
    }
  };

  // Calculate statistics
  const stats = {
    totalFeatureRequests: features.length,
    pendingRequests: features.filter((f) => f.status === "pending").length,
    inProgressRequests: features.filter((f) => f.status === "in_progress").length,
    completedRequests: features.filter((f) => f.status === "completed").length,
    totalVotes: features.reduce((sum, f) => sum + f.upvotes + f.downvotes, 0),
  };

  // Quick access sections
  const quickAccessSections = [
    {
      title: "Dashboard",
      description: "Main application dashboard",
      icon: BarChart3,
      link: "/dashboard",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Feature Requests",
      description: "Manage user feature requests",
      icon: MessageSquare,
      link: "/feature-requests",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      badge: stats.pendingRequests > 0 ? `${stats.pendingRequests} pending` : undefined,
    },
    {
      title: "Analytics",
      description: "View detailed analytics",
      icon: TrendingUp,
      link: "/dashboard/analytics",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Parse CV",
      description: "Parse and analyse CVs",
      icon: FileText,
      link: "/dashboard/parse",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Bulk Parse",
      description: "Bulk CV processing",
      icon: Database,
      link: "/dashboard/bulk-parse",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      title: "Open Roles",
      description: "Manage job openings",
      icon: Users,
      link: "/dashboard/roles",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      title: "All Candidates",
      description: "View all candidates",
      icon: Users,
      link: "/dashboard/candidates",
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "Developer Tools",
      description: "API keys and integrations",
      icon: Code,
      link: "/dashboard/developer",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Billing",
      description: "Manage billing and subscriptions",
      icon: DollarSign,
      link: "/dashboard/billing",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Settings",
      description: "System and account settings",
      icon: Settings,
      link: "/dashboard/settings",
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
    },
  ];

  // Recent feature requests
  const recentFeatures = features.slice(0, 5);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <Shield className="w-10 h-10 text-primary" />
                Admin Control Center
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage all aspects of Qualifyr.AI
              </p>
            </div>
          </div>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Feature Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalFeatureRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Total submissions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Needs review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4" />
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{stats.inProgressRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Being worked on</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.completedRequests}</div>
              <p className="text-xs text-muted-foreground mt-1">Finished features</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total Votes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalVotes}</div>
              <p className="text-xs text-muted-foreground mt-1">User engagement</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Grid */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Quick Access
            </CardTitle>
            <CardDescription>Navigate to different sections of the application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {quickAccessSections.map((section) => (
                <button
                  key={section.title}
                  onClick={() => navigate(section.link)}
                  className="group relative flex items-start gap-4 p-4 rounded-lg border hover:border-primary transition-all hover:shadow-md text-left"
                >
                  <div className={`p-3 rounded-lg ${section.bgColor} shrink-0`}>
                    <section.icon className={`w-6 h-6 ${section.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{section.title}</h3>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {section.description}
                    </p>
                    {section.badge && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {section.badge}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Impersonation */}
        <Card className="mb-8 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-purple-500" />
              User Impersonation
            </CardTitle>
            <CardDescription>
              Request to view the application as another user for support purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isImpersonating ? (
              <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-6 text-center">
                <UserCog className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                <p className="font-semibold text-lg mb-2">Currently Impersonating</p>
                <p className="text-sm text-muted-foreground mb-4">
                  You are viewing as: <span className="font-mono font-medium">{currentSession?.target_email}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  The purple banner at the top allows you to end the session at any time
                </p>
              </div>
            ) : (
              <form onSubmit={handleImpersonationRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="impersonate-email">User Email Address</Label>
                  <Input
                    id="impersonate-email"
                    type="email"
                    placeholder="user@example.com"
                    value={impersonationEmail}
                    onChange={(e) => setImpersonationEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The user will receive a popup requesting their approval
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="impersonate-reason">Reason (Optional)</Label>
                  <Textarea
                    id="impersonate-reason"
                    placeholder="e.g., Help with billing issue, debug feature request bug, etc."
                    value={impersonationReason}
                    onChange={(e) => setImpersonationReason(e.target.value)}
                    rows={3}
                    maxLength={200}
                  />
                </div>
                <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <Shield className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
                    <p className="font-semibold">Important:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>User must approve within 5 minutes</li>
                      <li>Session lasts 30 minutes maximum</li>
                      <li>All actions are logged for audit</li>
                      <li>Both you and the user will see a banner</li>
                    </ul>
                  </div>
                </div>
                <Button type="submit" disabled={isRequestingImpersonation} className="w-full">
                  {isRequestingImpersonation ? "Sending Request..." : "Request Impersonation"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Recent Feature Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Feature Requests</CardTitle>
                <CardDescription>Latest submissions from users</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/feature-requests")}
                className="gap-2"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentFeatures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No feature requests yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentFeatures.map((feature) => {
                  const netVotes = feature.upvotes - feature.downvotes;
                  const getStatusIcon = (status: string) => {
                    switch (status) {
                      case "completed":
                        return <CheckCircle2 className="w-4 h-4" />;
                      case "in_progress":
                        return <Loader2 className="w-4 h-4" />;
                      case "planned":
                        return <Sparkles className="w-4 h-4" />;
                      case "under_review":
                        return <Clock className="w-4 h-4" />;
                      case "declined":
                        return <XCircle className="w-4 h-4" />;
                      default:
                        return <MessageSquare className="w-4 h-4" />;
                    }
                  };

                  const getStatusColor = (status: string) => {
                    const colors: Record<string, string> = {
                      pending: "bg-gray-500",
                      under_review: "bg-blue-500",
                      planned: "bg-purple-500",
                      in_progress: "bg-yellow-500",
                      completed: "bg-green-500",
                      declined: "bg-red-500",
                    };
                    return colors[status] || "bg-gray-500";
                  };

                  return (
                    <div
                      key={feature.id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{feature.title}</h3>
                            <Badge className={`${getStatusColor(feature.status)} shrink-0 text-xs flex items-center gap-1`}>
                              {getStatusIcon(feature.status)}
                              {feature.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                            {feature.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className={netVotes > 0 ? "text-primary font-medium" : netVotes < 0 ? "text-destructive font-medium" : ""}>
                              {netVotes > 0 ? "+" : ""}{netVotes} net votes
                            </span>
                            <span>•</span>
                            <span>{feature.upvotes} up</span>
                            <span>•</span>
                            <span>{feature.downvotes} down</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/feature-requests")}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;

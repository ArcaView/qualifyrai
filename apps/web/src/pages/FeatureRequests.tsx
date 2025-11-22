import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { isAdminEmail } from "@/lib/constants";
import { ChevronUp, ChevronDown, Plus, ArrowLeft, MessageCircle, Sparkles, TrendingUp, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  upvotes: number;
  downvotes: number;
  status: string;
  created_at: string;
  userVote?: "upvote" | "downvote" | null;
}

type SortBy = "newest" | "popular" | "controversial";
type FilterStatus = "all" | "pending" | "under_review" | "planned" | "in_progress" | "completed" | "declined";

const FeatureRequests = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useUser();
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("popular");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const { toast } = useToast();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access feature requests",
        variant: "destructive",
      });
      navigate("/auth?tab=login");
    }
  }, [authLoading, isAuthenticated, navigate, toast]);

  const [newFeature, setNewFeature] = useState({
    title: "",
    description: "",
  });

  const [feedback, setFeedback] = useState({
    message: "",
    email: "",
  });

  // Check if user is admin
  const isAdmin = isAdminEmail(user?.email);

  // Get or create browser fingerprint for anonymous voting
  const getBrowserFingerprint = (): string => {
    let fingerprint = localStorage.getItem("browser_fingerprint");
    if (!fingerprint) {
      fingerprint = `fp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      localStorage.setItem("browser_fingerprint", fingerprint);
    }
    return fingerprint;
  };

  // Fetch feature requests
  const fetchFeatures = async () => {
    setIsLoading(true);
    try {
      const fingerprint = getBrowserFingerprint();

      // Fetch feature requests (exclude declined from public view)
      let query = supabase
        .from("feature_requests")
        .select("*");

      // Apply status filter
      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      } else {
        // Exclude declined requests from public view
        query = query.neq("status", "declined");
      }

      const { data: featuresData, error: featuresError } = await query;

      if (featuresError) {
        // TODO: Replace with proper error logging service (e.g., Sentry)
        throw featuresError;
      }

      // Fetch user's votes
      const { data: votesData, error: votesError } = await supabase
        .from("feature_votes")
        .select("feature_id, vote_type")
        .eq("user_fingerprint", fingerprint);

      if (votesError) {
        // TODO: Replace with proper error logging service (e.g., Sentry)
      }

      const votesMap = new Map(
        votesData?.map((v) => [v.feature_id, v.vote_type as "upvote" | "downvote"]) || []
      );

      // Combine features with user votes
      const featuresWithVotes = (featuresData || []).map((feature) => ({
        ...feature,
        userVote: votesMap.get(feature.id) || null,
      }));

      // Sort features
      let sortedFeatures = [...featuresWithVotes];
      if (sortBy === "newest") {
        sortedFeatures.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortBy === "popular") {
        sortedFeatures.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      } else if (sortBy === "controversial") {
        sortedFeatures.sort((a, b) => {
          const aTotal = a.upvotes + a.downvotes;
          const bTotal = b.upvotes + b.downvotes;
          const aRatio = aTotal > 0 ? Math.min(a.upvotes, a.downvotes) / aTotal : 0;
          const bRatio = bTotal > 0 ? Math.min(b.upvotes, b.downvotes) / bTotal : 0;
          return bRatio - aRatio;
        });
      }

      setFeatures(sortedFeatures);
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      toast({
        title: "Error",
        description: "Failed to load feature requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, [sortBy, filterStatus]);

  // Submit new feature request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeature.title.trim() || !newFeature.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("feature_requests").insert({
        title: newFeature.title.trim(),
        description: newFeature.description.trim(),
        status: "pending",
      });

      if (error) {
        // TODO: Replace with proper error logging service (e.g., Sentry)
        throw error;
      }

      toast({
        title: "Success!",
        description: "Your feature request has been submitted",
      });

      setNewFeature({ title: "", description: "" });
      setIsDialogOpen(false);

      setTimeout(() => {
        fetchFeatures();
      }, 500);
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      toast({
        title: "Error",
        description: "Failed to submit feature request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle voting
  const handleVote = async (featureId: string, voteType: "upvote" | "downvote") => {
    const fingerprint = getBrowserFingerprint();
    const feature = features.find((f) => f.id === featureId);
    if (!feature) return;

    const currentVote = feature.userVote;

    // Optimistically update UI immediately
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.id !== featureId) return f;

        let newUpvotes = f.upvotes;
        let newDownvotes = f.downvotes;
        let newUserVote: "upvote" | "downvote" | null = null;

        if (currentVote === voteType) {
          if (voteType === "upvote") newUpvotes--;
          else newDownvotes--;
          newUserVote = null;
        } else if (currentVote) {
          if (currentVote === "upvote") newUpvotes--;
          else newDownvotes--;
          if (voteType === "upvote") newUpvotes++;
          else newDownvotes++;
          newUserVote = voteType;
        } else {
          if (voteType === "upvote") newUpvotes++;
          else newDownvotes++;
          newUserVote = voteType;
        }

        return {
          ...f,
          upvotes: Math.max(0, newUpvotes),
          downvotes: Math.max(0, newDownvotes),
          userVote: newUserVote,
        };
      })
    );

    try {
      if (currentVote === voteType) {
        await supabase
          .from("feature_votes")
          .delete()
          .eq("feature_id", featureId)
          .eq("user_fingerprint", fingerprint);
      } else if (currentVote) {
        await supabase
          .from("feature_votes")
          .update({ vote_type: voteType })
          .eq("feature_id", featureId)
          .eq("user_fingerprint", fingerprint);
      } else {
        await supabase.from("feature_votes").insert({
          feature_id: featureId,
          user_fingerprint: fingerprint,
          vote_type: voteType,
        });
      }
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      fetchFeatures();
      toast({
        title: "Error",
        description: "Failed to register vote",
        variant: "destructive",
      });
    }
  };

  // Admin: Change status
  const handleStatusChange = async (featureId: string, newStatus: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from("feature_requests")
        .update({ status: newStatus })
        .eq("id", featureId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Feature request marked as ${newStatus.replace("_", " ")}`,
      });

      fetchFeatures();
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.message.trim()) {
      toast({
        title: "Error",
        description: "Please enter your feedback",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("feature_requests").insert({
        title: "Feedback: " + feedback.message.substring(0, 50),
        description: `${feedback.message}\n\n${feedback.email ? `Contact: ${feedback.email}` : ""}`,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted",
      });

      setFeedback({ message: "", email: "" });
      setIsFeedbackOpen(false);
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

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
        return <TrendingUp className="w-4 h-4" />;
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

  const getStatusLabel = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Roadmap stats
  const getRoadmapStats = () => {
    const stats = {
      pending: features.filter((f) => f.status === "pending").length,
      under_review: features.filter((f) => f.status === "under_review").length,
      planned: features.filter((f) => f.status === "planned").length,
      in_progress: features.filter((f) => f.status === "in_progress").length,
      completed: features.filter((f) => f.status === "completed").length,
      declined: features.filter((f) => f.status === "declined").length,
    };
    return stats;
  };

  const roadmapStats = getRoadmapStats();

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
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
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Feature Requests
              </h1>
              <p className="text-muted-foreground text-lg">
                Vote on ideas and shape the future of Qualifyr.AI
              </p>
              {isAdmin && (
                <Badge variant="outline" className="mt-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Admin Mode
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Feedback
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Feedback</DialogTitle>
                    <DialogDescription>
                      Have thoughts about this feature? Let us know!
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="feedback-message">Your Feedback</Label>
                      <Textarea
                        id="feedback-message"
                        placeholder="Tell us what you think..."
                        value={feedback.message}
                        onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
                        rows={5}
                        maxLength={1000}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedback-email">Email (optional)</Label>
                      <Input
                        id="feedback-email"
                        type="email"
                        placeholder="your@email.com"
                        value={feedback.email}
                        onChange={(e) => setFeedback({ ...feedback, email: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setIsFeedbackOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Send Feedback</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit a Feature Request</DialogTitle>
                    <DialogDescription>
                      Share your idea for a new feature or improvement
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="Brief, descriptive title"
                        value={newFeature.title}
                        onChange={(e) => setNewFeature({ ...newFeature, title: e.target.value })}
                        maxLength={100}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your feature request in detail..."
                        value={newFeature.description}
                        onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                        rows={5}
                        maxLength={1000}
                        required
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="controversial">Controversial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feature Requests List */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : features.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    No feature requests yet. Be the first!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {features.map((feature) => {
                  const netVotes = feature.upvotes - feature.downvotes;
                  return (
                    <Card key={feature.id} className="hover:shadow-md transition-all border-l-4" style={{
                      borderLeftColor: `hsl(var(--${feature.status === 'completed' ? 'success' : feature.status === 'in_progress' ? 'warning' : 'primary'}))`
                    }}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Voting Column */}
                          <div className="flex flex-col items-center gap-1 min-w-[56px]">
                            <button
                              onClick={() => handleVote(feature.id, "upvote")}
                              className={`p-1.5 rounded-lg hover:bg-accent transition-colors ${
                                feature.userVote === "upvote"
                                  ? "text-primary bg-primary/10"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <ChevronUp className="w-5 h-5" strokeWidth={feature.userVote === "upvote" ? 3 : 2} />
                            </button>
                            <span
                              className={`text-base font-bold tabular-nums px-2 py-1 rounded ${
                                netVotes > 0
                                  ? "text-primary bg-primary/10"
                                  : netVotes < 0
                                  ? "text-destructive bg-destructive/10"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {netVotes > 0 ? "+" : ""}
                              {netVotes}
                            </span>
                            <button
                              onClick={() => handleVote(feature.id, "downvote")}
                              className={`p-1.5 rounded-lg hover:bg-accent transition-colors ${
                                feature.userVote === "downvote"
                                  ? "text-destructive bg-destructive/10"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <ChevronDown className="w-5 h-5" strokeWidth={feature.userVote === "downvote" ? 3 : 2} />
                            </button>
                          </div>

                          {/* Content Column */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="text-lg font-semibold leading-tight">
                                {feature.title}
                              </h3>
                              <Badge className={`${getStatusColor(feature.status)} shrink-0 text-xs flex items-center gap-1`}>
                                {getStatusIcon(feature.status)}
                                {getStatusLabel(feature.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {feature.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{formatDate(feature.created_at)}</span>
                              <span>•</span>
                              <span>{feature.upvotes} up</span>
                              <span>•</span>
                              <span>{feature.downvotes} down</span>
                              {isAdmin && (
                                <>
                                  <span>•</span>
                                  <Select
                                    value={feature.status}
                                    onValueChange={(value) => handleStatusChange(feature.id, value)}
                                  >
                                    <SelectTrigger className="h-7 w-32 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="under_review">Under Review</SelectItem>
                                      <SelectItem value="planned">Planned</SelectItem>
                                      <SelectItem value="in_progress">In Progress</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="declined">Declined</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Roadmap Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Roadmap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Under Review
                    </span>
                    <span className="text-sm font-bold">{roadmapStats.under_review}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(roadmapStats.under_review / features.length) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      Planned
                    </span>
                    <span className="text-sm font-bold">{roadmapStats.planned}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${(roadmapStats.planned / features.length) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-yellow-500" />
                      In Progress
                    </span>
                    <span className="text-sm font-bold">{roadmapStats.in_progress}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500" style={{ width: `${(roadmapStats.in_progress / features.length) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Completed
                    </span>
                    <span className="text-sm font-bold">{roadmapStats.completed}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${(roadmapStats.completed / features.length) * 100}%` }} />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total Requests</span>
                    <span className="font-bold text-foreground">{features.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>Pending Review</span>
                    <span className="font-bold text-foreground">{roadmapStats.pending}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureRequests;

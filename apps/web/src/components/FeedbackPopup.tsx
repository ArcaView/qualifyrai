import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { MessageCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const USAGE_TRACKER_KEY = "qualifyr_usage_time";
const LAST_FEEDBACK_KEY = "qualifyr_last_feedback";
const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

export const FeedbackPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    message: "",
    email: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    // Track session start time
    const sessionStart = Date.now();

    // Get accumulated usage time
    const getUsageTime = (): number => {
      const stored = localStorage.getItem(USAGE_TRACKER_KEY);
      return stored ? parseInt(stored, 10) : 0;
    };

    // Get last feedback timestamp
    const getLastFeedback = (): number => {
      const stored = localStorage.getItem(LAST_FEEDBACK_KEY);
      return stored ? parseInt(stored, 10) : 0;
    };

    // Check if we should show popup
    const checkAndShowPopup = () => {
      const currentTime = Date.now();
      const sessionTime = currentTime - sessionStart;
      const totalUsage = getUsageTime() + sessionTime;

      localStorage.setItem(USAGE_TRACKER_KEY, totalUsage.toString());

      // Check if we should show feedback popup
      const lastFeedback = getLastFeedback();
      const timeSinceLastFeedback = currentTime - lastFeedback;

      if (totalUsage >= THREE_HOURS_MS && timeSinceLastFeedback >= THREE_HOURS_MS) {
        setIsOpen(true);
        // Reset usage tracker after showing popup
        localStorage.setItem(USAGE_TRACKER_KEY, "0");
        localStorage.setItem(LAST_FEEDBACK_KEY, currentTime.toString());
      }
    };

    // Check immediately on mount
    checkAndShowPopup();

    // Then check periodically
    const updateInterval = setInterval(checkAndShowPopup, 60000); // Check every minute

    // Cleanup on unmount
    return () => {
      clearInterval(updateInterval);
      // Save session time before leaving
      const sessionTime = Date.now() - sessionStart;
      const totalUsage = getUsageTime() + sessionTime;
      localStorage.setItem(USAGE_TRACKER_KEY, totalUsage.toString());
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
        description: "Your feedback helps us improve Qualifyr.AI",
      });

      setFeedback({ message: "", email: "" });
      setIsOpen(false);
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    // Set last feedback time to prevent immediate re-showing
    localStorage.setItem(LAST_FEEDBACK_KEY, Date.now().toString());
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <DialogTitle>We'd love your feedback!</DialogTitle>
          </div>
          <DialogDescription>
            You've been using Qualifyr.AI for a while. How's your experience so far?
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="popup-feedback-message">Your Feedback</Label>
            <Textarea
              id="popup-feedback-message"
              placeholder="Tell us what you think..."
              value={feedback.message}
              onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
              rows={4}
              maxLength={1000}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="popup-feedback-email">Email (optional)</Label>
            <Input
              id="popup-feedback-email"
              type="email"
              placeholder="your@email.com"
              value={feedback.email}
              onChange={(e) => setFeedback({ ...feedback, email: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Leave your email if you'd like us to follow up
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleDismiss}>
              Maybe Later
            </Button>
            <Button type="submit">
              Send Feedback
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Clock } from "lucide-react";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export const ImpersonationApprovalPopup = () => {
  const { pendingRequest, approveImpersonation, rejectImpersonation } = useImpersonation();
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isProcessing, setIsProcessing] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!pendingRequest) {
      setTimeLeft(300);
      return;
    }

    const requestTime = new Date(pendingRequest.requested_at).getTime();
    const expiryTime = requestTime + 5 * 60 * 1000; // 5 minutes

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingRequest]);

  const handleApprove = async () => {
    if (!pendingRequest) return;
    setIsProcessing(true);
    await approveImpersonation(pendingRequest.id);
    setIsProcessing(false);
  };

  const handleReject = async () => {
    if (!pendingRequest) return;
    setIsProcessing(true);
    await rejectImpersonation(pendingRequest.id);
    setIsProcessing(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!pendingRequest) return null;

  return (
    <AlertDialog open={!!pendingRequest}>
      <AlertDialogContent className="max-w-md border-yellow-500 border-2">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-6 h-6 text-yellow-500" />
            <AlertDialogTitle className="text-xl">
              Admin Support Request
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 text-base">
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                    An administrator wants to view your account
                  </p>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                    <p>
                      <strong>Admin:</strong> {pendingRequest.admin_email}
                    </p>
                    {pendingRequest.reason && (
                      <p>
                        <strong>Reason:</strong> {pendingRequest.reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">What this means:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>The admin will see your account exactly as you see it</li>
                <li>They can navigate and view your data to help resolve issues</li>
                <li>All actions will be logged for security</li>
                <li>The session will automatically end after 30 minutes</li>
                <li>You can see when they're viewing your account</li>
              </ul>
            </div>

            <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span>Request expires in:</span>
              </div>
              <Badge variant={timeLeft < 60 ? "destructive" : "secondary"} className="font-mono">
                {formatTime(timeLeft)}
              </Badge>
            </div>

            <p className="text-sm font-medium text-destructive">
              ⚠️ Only approve if you're expecting support or have contacted the admin team
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleReject}
            disabled={isProcessing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Reject
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApprove}
            disabled={isProcessing || timeLeft === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? "Processing..." : "Approve (30 min)"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

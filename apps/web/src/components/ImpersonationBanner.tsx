import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, X, AlertTriangle } from "lucide-react";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useEffect, useState } from "react";

export const ImpersonationBanner = () => {
  const { isImpersonating, isBeingImpersonated, currentSession, endImpersonation } = useImpersonation();
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Update countdown
  useEffect(() => {
    if (!currentSession?.expires_at) return;

    const updateTimer = () => {
      const expiryTime = new Date(currentSession.expires_at!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, expiryTime - now);

      if (remaining === 0) {
        setTimeLeft("Expired");
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [currentSession]);

  if (!isImpersonating && !isBeingImpersonated) return null;

  if (isImpersonating) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5" />
              <div className="flex items-center gap-2">
                <span className="font-semibold">Admin Mode:</span>
                <span>Viewing as</span>
                <Badge variant="secondary" className="bg-white text-purple-700 font-mono">
                  {currentSession?.target_email}
                </Badge>
              </div>
              {timeLeft && (
                <div className="flex items-center gap-2 text-sm opacity-90">
                  <span>•</span>
                  <span>Expires in: {timeLeft}</span>
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={endImpersonation}
              className="gap-2 bg-white text-purple-700 hover:bg-purple-50"
            >
              <X className="w-4 h-4" />
              End Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isBeingImpersonated) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <div className="flex items-center gap-2">
                <span className="font-semibold">Your session is being viewed by:</span>
                <Badge variant="secondary" className="bg-white text-yellow-700 font-mono">
                  {currentSession?.admin_email}
                </Badge>
                <span className="text-sm opacity-90">(Admin Support)</span>
              </div>
              {timeLeft && (
                <div className="flex items-center gap-2 text-sm opacity-90">
                  <span>•</span>
                  <span>Session ends in: {timeLeft}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-medium">They can see what you see</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, hasActiveSubscription } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Not logged in -> redirect to login
        navigate('/auth?tab=login', { replace: true });
      } else if (!hasActiveSubscription) {
        // Logged in but no active subscription -> redirect to pricing
        navigate('/pricing', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, hasActiveSubscription, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !hasActiveSubscription) {
    return null;
  }

  return <>{children}</>;
};
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/constants";

interface ImpersonationSession {
  id: string;
  admin_user_id: string;
  admin_email: string;
  target_user_id: string;
  target_email: string;
  status: "pending" | "approved" | "rejected" | "active" | "ended";
  requested_at: string;
  approved_at?: string;
  ended_at?: string;
  expires_at?: string;
  reason?: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  isBeingImpersonated: boolean;
  currentSession: ImpersonationSession | null;
  pendingRequest: ImpersonationSession | null;
  startImpersonation: (targetEmail: string, reason?: string) => Promise<boolean>;
  approveImpersonation: (sessionId: string) => Promise<boolean>;
  rejectImpersonation: (sessionId: string) => Promise<boolean>;
  endImpersonation: () => Promise<void>;
  logAction: (action: string, details?: any) => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const { user, supabaseUser } = useUser();
  const { toast } = useToast();
  const [currentSession, setCurrentSession] = useState<ImpersonationSession | null>(null);
  const [pendingRequest, setPendingRequest] = useState<ImpersonationSession | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  const isAdmin = isAdminEmail(user?.email);
  const isImpersonating = currentSession !== null && currentSession.status === "active" && currentSession.admin_user_id === supabaseUser?.id;
  const isBeingImpersonated = currentSession !== null && currentSession.status === "active" && currentSession.target_user_id === supabaseUser?.id;

  // Check for active sessions on mount
  useEffect(() => {
    if (!supabaseUser) return;

    const checkActiveSessions = async () => {
      try {
        // Check if user is admin with active impersonation
        const { data: adminSessions, error: adminError } = await supabase
          .from("impersonation_sessions")
          .select("*")
          .eq("admin_user_id", supabaseUser.id)
          .eq("status", "active")
          .maybeSingle();

        if (!adminError && adminSessions) {
          setCurrentSession(adminSessions);
        }

        // Check if user is being impersonated
        const { data: targetSessions, error: targetError } = await supabase
          .from("impersonation_sessions")
          .select("*")
          .eq("target_user_id", supabaseUser.id)
          .eq("status", "active")
          .maybeSingle();

        if (!targetError && targetSessions) {
          setCurrentSession(targetSessions);
        }

        // Check for pending requests (for target users)
        const { data: pending, error: pendingError } = await supabase
          .from("impersonation_sessions")
          .select("*")
          .eq("target_user_id", supabaseUser.id)
          .eq("status", "pending")
          .order("requested_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!pendingError && pending) {
          setPendingRequest(pending);
        }
      } catch (error) {
        // Silently fail if impersonation tables don't exist
        // TODO: Add proper error logging if this becomes a real issue
      }
    };

    checkActiveSessions();
  }, [supabaseUser]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!supabaseUser) return;

    const channel = supabase
      .channel("impersonation_sessions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "impersonation_sessions",
          filter: `target_user_id=eq.${supabaseUser.id}`,
        },
        (payload) => {
          const newSession = payload.new as ImpersonationSession;

          if (payload.eventType === "INSERT" && newSession.status === "pending") {
            setPendingRequest(newSession);
          } else if (payload.eventType === "UPDATE") {
            if (newSession.status === "active") {
              setCurrentSession(newSession);
              setPendingRequest(null);
            } else if (newSession.status === "ended" || newSession.status === "rejected") {
              setPendingRequest(null);
              setCurrentSession(null);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "impersonation_sessions",
          filter: `admin_user_id=eq.${supabaseUser.id}`,
        },
        (payload) => {
          const newSession = payload.new as ImpersonationSession;

          if (payload.eventType === "UPDATE") {
            if (newSession.status === "active") {
              setCurrentSession(newSession);
              toast({
                title: "Impersonation Started",
                description: `You are now viewing as ${newSession.target_email}`,
              });
            } else if (newSession.status === "rejected") {
              toast({
                title: "Request Rejected",
                description: `${newSession.target_email} declined your impersonation request`,
                variant: "destructive",
              });
              setCurrentSession(null);
            } else if (newSession.status === "ended") {
              setCurrentSession(null);
            }
          }
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [supabaseUser, toast]);

  // Start impersonation request
  const startImpersonation = async (targetEmail: string, reason?: string): Promise<boolean> => {
    if (!isAdmin || !supabaseUser) {
      toast({
        title: "Access Denied",
        description: "Only admins can impersonate users",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Use RPC function to create impersonation request (handles user lookup server-side)
      const { data: session, error } = await supabase.rpc("create_impersonation_request", {
        p_target_email: targetEmail,
        p_reason: reason || "Support request",
      });

      if (error) {
        // TODO: Replace with proper error logging service (e.g., Sentry)
        toast({
          title: "Error",
          description: "Failed to create impersonation request",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Request Sent",
        description: `Waiting for ${targetEmail} to approve...`,
      });

      // Log the request
      await logAction("impersonation_requested", { target_email: targetEmail, reason });

      return true;
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      return false;
    }
  };

  // Approve impersonation
  const approveImpersonation = async (sessionId: string): Promise<boolean> => {
    if (!supabaseUser) return false;

    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minute session

      const { error } = await supabase
        .from("impersonation_sessions")
        .update({
          status: "active",
          approved_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        // TODO: Replace with proper error logging service (e.g., Sentry)
        return false;
      }

      // Log the approval
      await supabase.rpc("log_impersonation_action", {
        p_session_id: sessionId,
        p_action: "session_approved",
        p_details: { approved_by: user?.email },
      });

      setPendingRequest(null);
      return true;
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      return false;
    }
  };

  // Reject impersonation
  const rejectImpersonation = async (sessionId: string): Promise<boolean> => {
    if (!supabaseUser) return false;

    try {
      const { error } = await supabase
        .from("impersonation_sessions")
        .update({
          status: "rejected",
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        // TODO: Replace with proper error logging service (e.g., Sentry)
        return false;
      }

      // Log the rejection
      await supabase.rpc("log_impersonation_action", {
        p_session_id: sessionId,
        p_action: "session_rejected",
        p_details: { rejected_by: user?.email },
      });

      setPendingRequest(null);
      return true;
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
      return false;
    }
  };

  // End impersonation
  const endImpersonation = async (): Promise<void> => {
    if (!currentSession) return;

    try {
      const { error } = await supabase
        .from("impersonation_sessions")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("id", currentSession.id);

      if (error) {
        // TODO: Replace with proper error logging service (e.g., Sentry)
        return;
      }

      // Log the end
      await supabase.rpc("log_impersonation_action", {
        p_session_id: currentSession.id,
        p_action: "session_ended",
        p_details: { ended_by: user?.email },
      });

      setCurrentSession(null);

      toast({
        title: "Impersonation Ended",
        description: "You are now viewing as yourself",
      });
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
    }
  };

  // Log action during impersonation
  const logAction = async (action: string, details?: any): Promise<void> => {
    if (!currentSession) return;

    try {
      await supabase.rpc("log_impersonation_action", {
        p_session_id: currentSession.id,
        p_action: action,
        p_details: details ? JSON.stringify(details) : null,
      });
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)
    }
  };

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating,
        isBeingImpersonated,
        currentSession,
        pendingRequest,
        startImpersonation,
        approveImpersonation,
        rejectImpersonation,
        endImpersonation,
        logAction,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
};

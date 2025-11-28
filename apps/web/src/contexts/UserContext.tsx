import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface PlanLimits {
  max_parses: number;
  max_scores: number;
  ai_scoring_enabled: boolean;
  max_ai_scores?: number; // Monthly AI scoring limit
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  subscriptionTier?: 'free' | 'basic' | 'professional' | 'enterprise';
  planLimits?: PlanLimits;
}

interface UserContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasActiveSubscription: boolean;
  login: (profile: UserProfile) => void;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => void;
  supabaseUser: User | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null && supabaseUser !== null;

  // Paid-only model: user must have a paid subscription (not 'free')
  const hasActiveSubscription = user?.subscriptionTier !== undefined &&
                                 user?.subscriptionTier !== 'free';

  useEffect(() => {
    // Check for active session on mount
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setSupabaseUser(session.user);
          const metadata = session.user.user_metadata;

          // Load subscription and plan limits (if exists)
          let subscriptionTier: 'free' | 'basic' | 'professional' | 'enterprise' = 'free';
          let planLimits: PlanLimits = {
            max_parses: 10,
            max_scores: 10,
            ai_scoring_enabled: false
          };

          try {
            const { data: subscription, error } = await supabase
              .from('subscriptions')
              .select(`
                id,
                status,
                pricing_plans!plan_id (
                  name,
                  slug,
                  limits
                )
              `)
              .eq('user_id', session.user.id)
              .eq('status', 'active')
              .maybeSingle();

            if (!error && subscription && subscription.pricing_plans) {
              const plan = subscription.pricing_plans as any;
              const limits = plan.limits || {};

              // Map plan name to tier
              subscriptionTier = plan.slug || plan.name?.toLowerCase() || 'free';

              // Extract limits from JSONB (-1 means unlimited, treat as 999999)
              const parsesLimit = limits.cvs_per_month || limits.max_parses || 10;
              const scoresLimit = limits.cvs_per_month || limits.max_scores || 10;
              const aiScoresLimit = limits.max_ai_scores;

              planLimits = {
                max_parses: parsesLimit === -1 ? 999999 : parsesLimit,
                max_scores: scoresLimit === -1 ? 999999 : scoresLimit,
                ai_scoring_enabled: limits.ai_scoring_enabled !== false, // Default to true for paid plans
                max_ai_scores: aiScoresLimit === -1 ? 999999 : aiScoresLimit
              };
            } else if (error) {
              console.error('Error loading subscription:', error);
            }
          } catch (err) {
            console.warn('Could not load subscription data, using free tier defaults', err);
          }

          setUser({
            firstName: metadata.firstName || "",
            lastName: metadata.lastName || "",
            email: session.user.email || "",
            company: metadata.company || "",
            subscriptionTier,
            planLimits
          });
        }
      } catch (error) {
        // TODO: Replace with proper error logging service (e.g., Sentry)
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const metadata = session.user.user_metadata;

        // Load subscription and plan limits (if exists)
        let subscriptionTier: 'free' | 'basic' | 'professional' | 'enterprise' = 'free';
        let planLimits: PlanLimits = {
          max_parses: 10,
          max_scores: 10,
          ai_scoring_enabled: false
        };

        try {
          const { data: subscriptionData, error } = await supabase
            .from('subscriptions')
            .select(`
              id,
              status,
              pricing_plans!plan_id (
                name,
                slug,
                limits
              )
            `)
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .maybeSingle();

          if (!error && subscriptionData && subscriptionData.pricing_plans) {
            const plan = subscriptionData.pricing_plans as any;
            const limits = plan.limits || {};

            // Map plan name to tier
            subscriptionTier = plan.slug || plan.name?.toLowerCase() || 'free';

            // Extract limits from JSONB (-1 means unlimited, treat as 999999)
            const parsesLimit = limits.cvs_per_month || limits.max_parses || 10;
            const scoresLimit = limits.cvs_per_month || limits.max_scores || 10;

            planLimits = {
              max_parses: parsesLimit === -1 ? 999999 : parsesLimit,
              max_scores: scoresLimit === -1 ? 999999 : scoresLimit,
              ai_scoring_enabled: limits.ai_scoring_enabled !== false // Default to true for paid plans
            };
          } else if (error) {
            console.error('Error loading subscription:', error);
          }
        } catch (err) {
          console.warn('Could not load subscription data, using free tier defaults', err);
        }

        setUser({
          firstName: metadata.firstName || "",
          lastName: metadata.lastName || "",
          email: session.user.email || "",
          company: metadata.company || "",
          subscriptionTier,
          planLimits
        });
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = (profile: UserProfile) => {
    setUser(profile);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      hasActiveSubscription,
      login,
      logout,
      updateProfile,
      supabaseUser
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

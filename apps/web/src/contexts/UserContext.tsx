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
  subscriptionChecked: boolean;
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
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);

  const isAuthenticated = user !== null && supabaseUser !== null;

  // Paid-only model: user must have a paid subscription (not 'free')
  const hasActiveSubscription = user?.subscriptionTier !== undefined &&
                                 user?.subscriptionTier !== 'free';

  useEffect(() => {
    // Check for active session on mount
    const initializeAuth = async () => {
      try {
        // WORKAROUND: getSession() is hanging, so read directly from localStorage
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const projectRef = supabaseUrl?.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown';
        const storageKey = `sb-${projectRef}-auth-token`;
        const storedSession = localStorage.getItem(storageKey);
        
        let session: any = null;
        
        if (storedSession) {
          try {
            const sessionData = JSON.parse(storedSession);
            if (sessionData.access_token && sessionData.user) {
              session = {
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token,
                expires_at: sessionData.expires_at,
                expires_in: sessionData.expires_in,
                token_type: sessionData.token_type,
                user: sessionData.user,
              };
              console.log('Session loaded from localStorage');
            }
          } catch (e) {
            console.warn('Failed to parse stored session:', e);
          }
        }
        
        // Try getSession with timeout as fallback
        if (!session) {
          try {
            const getSessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('getSession timeout')), 2000)
            );
            const result = await Promise.race([getSessionPromise, timeoutPromise]) as any;
            if (result?.data?.session) {
              session = result.data.session;
              console.log('Session loaded from getSession()');
            }
          } catch (err: any) {
            console.warn('getSession() timed out or failed, using localStorage:', err.message);
          }
        }

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
            // Add timeout to subscription query - skip if it hangs
            const subscriptionPromise = supabase
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
            
            const subscriptionTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Subscription query timeout')), 2000)
            );
            
            let subscription: any = null;
            let subscriptionError: any = null;
            
            try {
              const result = await Promise.race([
                subscriptionPromise,
                subscriptionTimeout
              ]) as any;
              subscription = result?.data;
              subscriptionError = result?.error;
            } catch (err: any) {
              console.warn('Subscription query timed out, using free tier defaults:', err.message);
              subscriptionError = err;
            }
            
            const { data: subscriptionData, error } = { data: subscription, error: subscriptionError };

            if (!error && subscriptionData && subscriptionData.pricing_plans) {
              const plan = subscriptionData.pricing_plans as any;
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
              console.warn('Error loading subscription (using free tier):', error?.message || error);
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
          setSubscriptionChecked(true);
        } else {
          // No session - ensure loading completes
          console.log('No session found, setting loading to false');
          setSubscriptionChecked(true);
        }
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        setSubscriptionChecked(true);
      } finally {
        console.log('Setting isLoading to false');
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
          // Add timeout to subscription query in onAuthStateChange too
          const subscriptionPromise = supabase
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
          
          const subscriptionTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Subscription query timeout')), 2000)
          );
          
          let subscriptionData: any = null;
          let subscriptionError: any = null;
          
          try {
            const result = await Promise.race([
              subscriptionPromise,
              subscriptionTimeout
            ]) as any;
            subscriptionData = result?.data;
            subscriptionError = result?.error;
          } catch (err: any) {
            console.warn('Subscription query timed out in onAuthStateChange:', err.message);
            subscriptionError = err;
          }
          
          const { data: subscription, error } = { data: subscriptionData, error: subscriptionError };

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
        setSubscriptionChecked(true);
      } else {
        setSupabaseUser(null);
        setUser(null);
        setSubscriptionChecked(true);
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
      isLoading: isLoading || !subscriptionChecked,
      hasActiveSubscription,
      subscriptionChecked,
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

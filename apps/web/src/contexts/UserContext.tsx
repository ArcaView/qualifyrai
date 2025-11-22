import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface PlanLimits {
  max_parses: number;
  max_scores: number;
  ai_scoring_enabled: boolean;
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
                *,
                pricing_plans!inner (
                  name,
                  max_parses_per_month,
                  max_scores_per_month,
                  ai_scoring_enabled
                )
              `)
              .eq('user_id', session.user.id)
              .eq('status', 'active')
              .maybeSingle();

            if (!error && subscription) {
              subscriptionTier = subscription.pricing_plans?.name?.toLowerCase() as any || 'free';
              planLimits = {
                max_parses: subscription.pricing_plans?.max_parses_per_month || 10,
                max_scores: subscription.pricing_plans?.max_scores_per_month || 10,
                ai_scoring_enabled: subscription.pricing_plans?.ai_scoring_enabled || false
              };
            }
          } catch (err) {
            console.warn('Could not load subscription data, using free tier defaults');
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
              *,
              pricing_plans!inner (
                name,
                max_parses_per_month,
                max_scores_per_month,
                ai_scoring_enabled
              )
            `)
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .maybeSingle();

          if (!error && subscriptionData) {
            subscriptionTier = subscriptionData.pricing_plans?.name?.toLowerCase() as any || 'free';
            planLimits = {
              max_parses: subscriptionData.pricing_plans?.max_parses_per_month || 10,
              max_scores: subscriptionData.pricing_plans?.max_scores_per_month || 10,
              ai_scoring_enabled: subscriptionData.pricing_plans?.ai_scoring_enabled || false
            };
          }
        } catch (err) {
          console.warn('Could not load subscription data, using free tier defaults');
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
    <UserContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, updateProfile, supabaseUser }}>
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

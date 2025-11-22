import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
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
          setUser({
            firstName: metadata.firstName || "",
            lastName: metadata.lastName || "",
            email: session.user.email || "",
            company: metadata.company || "",
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
        setUser({
          firstName: metadata.firstName || "",
          lastName: metadata.lastName || "",
          email: session.user.email || "",
          company: metadata.company || "",
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

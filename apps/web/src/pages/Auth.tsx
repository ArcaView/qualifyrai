import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { AuthError } from "@supabase/supabase-js";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("signup");

  // Sign Up state
  const [signUpData, setSignUpData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
  });

  // Log In state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "login" || tab === "signup") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleSignUpChange = (field: string, value: string) => {
    setSignUpData(prev => ({ ...prev, [field]: value }));
  };

  const handleLoginChange = (field: string, value: string) => {
    setLoginData(prev => ({ ...prev, [field]: value }));
  };

  // Password validation function
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("One uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("One lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("One number");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("One special character");
    }
    
    return errors;
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate passwords match
    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate password strength
    const passwordErrors = validatePassword(signUpData.password);
    if (passwordErrors.length > 0) {
      toast({
        title: "Weak Password",
        description: `Password must contain: ${passwordErrors.join(", ")}`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            firstName: signUpData.firstName,
            lastName: signUpData.lastName,
            company: signUpData.company,
          },
          emailRedirectTo: `${window.location.origin}/complete-signup`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.session) {
          // User is auto-confirmed (no email verification needed)
          // Redirect immediately to complete signup
          toast({
            title: "Account Created!",
            description: "Complete your payment to access the dashboard.",
          });
          navigate('/complete-signup');
        } else {
          // Email verification required
          toast({
            title: "Verification Email Sent!",
            description: "Please check your email to verify your account before logging in.",
          });

          // Clear the form
          setSignUpData({
            firstName: "",
            lastName: "",
            email: "",
            company: "",
            password: "",
            confirmPassword: "",
          });
        }
      }
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Error",
        description: authError.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('=== LOGIN DEBUG START ===');
      console.log('Attempting login for:', loginData.email);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Supabase key present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // WORKAROUND: Use direct fetch since Supabase client is timing out
      // The direct fetch works, so we'll use it and manually set the session
      const authUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
      console.log('Using direct fetch workaround to:', authUrl);
      
      let authData: any = null;
      let authError: any = null;
      
      try {
        const response = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey || '',
          },
          body: JSON.stringify({
            email: loginData.email,
            password: loginData.password,
          }),
        });
        
        console.log('Direct fetch response status:', response.status);
        console.log('Direct fetch response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseData = await response.json();
        console.log('Direct fetch response data keys:', Object.keys(responseData));
        console.log('Direct fetch response (sanitized):', {
          hasAccessToken: !!responseData.access_token,
          hasRefreshToken: !!responseData.refresh_token,
          hasUser: !!responseData.user,
          tokenType: responseData.token_type,
          expiresIn: responseData.expires_in,
        });
        
        if (response.ok && responseData.access_token) {
          // Success! Direct fetch worked, now we need to set the session
          console.log('Direct fetch succeeded, setting session...');
          
          // Construct session object
          const session = {
            access_token: responseData.access_token,
            refresh_token: responseData.refresh_token,
            expires_in: responseData.expires_in,
            expires_at: responseData.expires_at || Math.floor(Date.now() / 1000) + responseData.expires_in,
            token_type: responseData.token_type || 'bearer',
            user: responseData.user,
          };
          
          // Store session directly - Supabase will read from localStorage
          // Format: sb-{project-ref}-auth-token
          const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown';
          const storageKey = `sb-${projectRef}-auth-token`;
          
          const sessionData = {
            access_token: responseData.access_token,
            refresh_token: responseData.refresh_token,
            expires_at: responseData.expires_at || Math.floor(Date.now() / 1000) + responseData.expires_in,
            expires_in: responseData.expires_in,
            token_type: responseData.token_type || 'bearer',
            user: responseData.user,
          };
          
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
          console.log('Session stored in localStorage with key:', storageKey);
          
          // Check subscription status immediately to avoid redirect flash
          let hasSubscription = false;
          try {
            const subscriptionCheckUrl = `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${responseData.user.id}&status=eq.active&select=id,status,pricing_plans!plan_id(name,slug,limits)`;
            const subscriptionResponse = await fetch(subscriptionCheckUrl, {
              headers: {
                'apikey': supabaseAnonKey || '',
                'Authorization': `Bearer ${responseData.access_token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (subscriptionResponse.ok) {
              const subscriptionData = await subscriptionResponse.json();
              if (subscriptionData && subscriptionData.length > 0 && subscriptionData[0].pricing_plans) {
                hasSubscription = true;
                console.log('User has active subscription, will skip pricing page');
              }
            }
          } catch (subError) {
            console.warn('Could not check subscription status:', subError);
          }
          
          // Store subscription status in session metadata for quick access
          if (hasSubscription) {
            const sessionWithSub = {
              ...sessionData,
              hasSubscription: true,
            };
            localStorage.setItem(storageKey, JSON.stringify(sessionWithSub));
          }
          
          // SKIP getSession() - it's also hanging!
          // The session is in localStorage, UserContext will read it on next check
          // Manually trigger a storage event to wake up onAuthStateChange
          window.dispatchEvent(new StorageEvent('storage', {
            key: storageKey,
            newValue: JSON.stringify(sessionData),
            storageArea: localStorage,
          }));
          console.log('Storage event dispatched');
          
          // Use the session data we have directly
          authData = {
            user: responseData.user,
            session: session,
          };
        } else {
          // Handle error response
          authError = {
            message: responseData.error_description || responseData.error || 'Login failed',
            status: response.status,
          };
          console.error('Direct fetch returned error:', authError);
        }
      } catch (fetchError: any) {
        console.error('Direct fetch exception:', {
          message: fetchError.message,
          name: fetchError.name,
          stack: fetchError.stack,
        });
        authError = fetchError;
      }
      
      // Fallback: Try Supabase client if direct fetch didn't work
      if (!authData && !authError) {
        console.log('Falling back to Supabase client...');
        const loginPromise = supabase.auth.signInWithPassword({
          email: loginData.email,
          password: loginData.password,
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Login request timed out after 5 seconds')), 5000)
        );
        
        try {
          const result = await Promise.race([loginPromise, timeoutPromise]) as any;
          authData = result.data;
          authError = result.error;
        } catch (timeoutError) {
          console.error('Supabase client timeout:', timeoutError);
          authError = timeoutError;
        }
      }
      
      const { data, error } = { data: authData, error: authError };

      console.log('=== LOGIN RESPONSE ===');
      console.log('Login response received:', { 
        hasUser: !!data?.user, 
        hasSession: !!data?.session, 
        userId: data?.user?.id,
        userEmail: data?.user?.email,
        sessionExpiresAt: data?.session?.expires_at,
        error: error?.message,
        errorCode: error?.status,
      });
      console.log('=== LOGIN DEBUG END ===');

      if (error) {
        console.error('Login error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack
        });
        throw error;
      }

      if (data?.user && data?.session) {
        console.log('Login successful, user:', data.user.id);
        
        toast({
          title: "Welcome back!",
          description: "You've been logged in successfully.",
        });

        // Wait for subscription check to complete before navigating
        // This prevents the flash of the pricing page
        console.log('Waiting for subscription check...');
        
        // Poll for subscription check to complete
        const checkSubscription = async () => {
          let attempts = 0;
          const maxAttempts = 20; // 2 seconds max wait
          
          while (attempts < maxAttempts) {
            // Check if subscription has been checked by reading from UserContext
            // We'll use a custom event to signal when it's done
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
            
            // Check localStorage for a flag or check if we can read the session
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const projectRef = supabaseUrl?.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown';
            const storageKey = `sb-${projectRef}-auth-token`;
            const storedSession = localStorage.getItem(storageKey);
            
            if (storedSession) {
              try {
                const sessionData = JSON.parse(storedSession);
                // If we have subscription info cached, we can proceed
                // Otherwise wait a bit more for the query to complete
                if (attempts > 5) {
                  // After 500ms, proceed anyway - the query will complete in background
                  break;
                }
              } catch (e) {
                // Continue waiting
              }
            }
          }
        };
        
        await checkSubscription();
        
        // Force a page reload to let UserContext read from localStorage
        console.log('Reloading page to initialize auth state...');
        window.location.href = '/dashboard';
      } else if (data?.user && !data?.session) {
        // User exists but no session - might need email verification
        console.warn('User exists but no session');
        toast({
          title: "Email Not Verified",
          description: "Please verify your email before logging in. Check your inbox for the verification link.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
      } else {
        // No user or session returned
        console.error('No user or session returned from login', { data, error });
        toast({
          title: "Login Failed",
          description: "Unable to complete login. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Login exception caught:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        fullError: error
      });
      
      const authError = error as AuthError;
      toast({
        title: "Error",
        description: authError.message || error?.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-primary/5 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">Q</span>
            </div>
            <span className="font-bold text-2xl">Qualifyr.AI</span>
          </div>
          <p className="text-muted-foreground">
            AI-Powered CV Parsing & Scoring
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="login">Log In</TabsTrigger>
          </TabsList>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>
                  Enter your information to get started with Qualifyr.AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUpSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstName">First Name</Label>
                      <Input
                        id="signup-firstName"
                        placeholder="John"
                        value={signUpData.firstName}
                        onChange={(e) => handleSignUpChange('firstName', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastName">Last Name</Label>
                      <Input
                        id="signup-lastName"
                        placeholder="Doe"
                        value={signUpData.lastName}
                        onChange={(e) => handleSignUpChange('lastName', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="john@example.com"
                      value={signUpData.email}
                      onChange={(e) => handleSignUpChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-company">Company</Label>
                    <Input
                      id="signup-company"
                      placeholder="Acme Inc."
                      value={signUpData.company}
                      onChange={(e) => handleSignUpChange('company', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.password}
                      onChange={(e) => handleSignUpChange('password', e.target.value)}
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must contain: 8+ characters, uppercase, lowercase, number, special character
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirmPassword">Confirm Password</Label>
                    <Input
                      id="signup-confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.confirmPassword}
                      onChange={(e) => handleSignUpChange('confirmPassword', e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="john@example.com"
                      value={loginData.email}
                      onChange={(e) => handleLoginChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => handleLoginChange('password', e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging In..." : "Log In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
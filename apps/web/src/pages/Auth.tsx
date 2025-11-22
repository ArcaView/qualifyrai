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
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
          toast({
            title: "Email Not Verified",
            description: "Please verify your email before logging in. Check your inbox for the verification link.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        toast({
          title: "Welcome back!",
          description: "You've been logged in successfully.",
        });

        navigate("/dashboard");
      }
    } catch (error) {
      const authError = error as AuthError;
      toast({
        title: "Error",
        description: authError.message || "Invalid credentials. Please try again.",
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
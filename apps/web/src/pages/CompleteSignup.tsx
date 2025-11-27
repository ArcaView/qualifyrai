import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

const CompleteSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, hasActiveSubscription, isLoading: userLoading } = useUser();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Check if user already has a subscription
  useEffect(() => {
    if (!userLoading && hasActiveSubscription) {
      // User already paid, redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [hasActiveSubscription, userLoading, navigate]);

  // Check for successful payment redirect
  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      const success = params.get('success');

      if (success === 'true' && sessionId) {
        setVerifyingPayment(true);

        try {
          // Verify the Stripe session and create subscription
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { sessionId }
          });

          if (error) throw error;

          if (data?.success) {
            toast({
              title: "Payment Successful!",
              description: "Your account is now active. Redirecting to dashboard...",
            });

            // Wait 2 seconds then redirect
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
          } else {
            throw new Error(data?.error || 'Payment verification failed');
          }
        } catch (err: any) {
          console.error('Payment verification error:', err);
          toast({
            title: "Payment Verification Failed",
            description: err.message || "Please contact support if payment was completed.",
            variant: "destructive",
          });
          setVerifyingPayment(false);
        }
      }
    };

    verifyPayment();
  }, [toast]);

  const handleCompletePayment = async () => {
    setCheckoutLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Get the Starter plan price ID
      const priceId = 'price_1SRXkyHR4O1dB10VVNfWQVsr';

      // Create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast({
        title: "Checkout Failed",
        description: err.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
      setCheckoutLoading(false);
    }
  };

  if (verifyingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verifying Payment...</h2>
            <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">One More Step</Badge>
          <h1 className="text-4xl font-bold mb-4">
            Complete Your Account Setup
          </h1>
          <p className="text-xl text-muted-foreground">
            Get instant access to AI-powered candidate screening
          </p>
        </div>

        <Card className="border-primary shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl">Starter Plan</CardTitle>
                <CardDescription className="text-lg mt-2">
                  Perfect for getting started with AI recruitment
                </CardDescription>
              </div>
              <Badge className="bg-accent text-accent-foreground">Most Popular</Badge>
            </div>
            <div className="mt-6">
              <span className="text-5xl font-bold">£49.99</span>
              <span className="text-muted-foreground text-xl">/month</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Button
              onClick={handleCompletePayment}
              disabled={checkoutLoading}
              variant="hero"
              className="w-full"
              size="lg"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Redirecting to payment...
                </>
              ) : (
                <>
                  Complete Payment
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <div className="pt-4">
              <h3 className="font-semibold mb-4 text-lg">What's included:</h3>
              <ul className="space-y-3">
                {[
                  "100 CV parses per month",
                  "AI-powered candidate matching",
                  "Advanced scoring algorithms",
                  "Role-based filtering",
                  "Email support",
                  "Basic analytics dashboard"
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Secure payment powered by Stripe • Cancel anytime
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="text-muted-foreground"
          >
            Back to login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompleteSignup;

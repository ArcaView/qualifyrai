import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { usePricing } from "@/contexts/PricingContext";

const CompleteSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, hasActiveSubscription, isLoading: userLoading, subscriptionChecked } = useUser();
  const { plans, isLoading: plansLoading } = usePricing();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Check if user already has a subscription - redirect IMMEDIATELY before rendering
  useEffect(() => {
    if (subscriptionChecked && hasActiveSubscription) {
      // User already paid, redirect to dashboard immediately
      // Use replace to avoid adding to history
      window.location.replace('/dashboard');
    }
  }, [hasActiveSubscription, subscriptionChecked]);

  // Don't render anything until subscription check is complete
  // This prevents the flash
  if (!subscriptionChecked || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user has subscription, show loading while redirect happens
  if (hasActiveSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  const handleCompletePayment = async (priceId: string | null, planName: string) => {
    if (!priceId) {
      toast({
        title: "Configuration Error",
        description: "This plan is not yet configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setCheckoutLoading(priceId);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

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
      setCheckoutLoading(null);
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
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 py-12">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">One More Step</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Complete Your Account Setup
          </h1>
          <p className="text-xl text-muted-foreground">
            Choose your plan and get instant access to AI-powered candidate screening
          </p>
        </div>

        {plansLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.is_popular
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-border'
                }`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground">Most Popular</Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      £{plan.price_monthly.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Button
                    onClick={() => handleCompletePayment(plan.stripe_price_id_monthly, plan.name)}
                    disabled={checkoutLoading !== null}
                    variant={plan.is_popular ? "hero" : "default"}
                    className="w-full"
                    size="lg"
                  >
                    {checkoutLoading === plan.stripe_price_id_monthly ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <ul className="space-y-3 pt-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground mb-4">
            Secure payment powered by Stripe • Cancel anytime
          </p>
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

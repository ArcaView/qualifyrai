import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { usePricing } from "@/contexts/PricingContext";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const PricingPage = () => {
  const { plans, isLoading, error } = usePricing();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleGetStarted = async (priceId: string | null, planName: string) => {
    if (!priceId) {
      toast({
        title: "Configuration Error",
        description: "This plan is not yet configured. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCheckoutLoading(priceId);

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // User not logged in - redirect to auth
        window.location.href = '/auth?tab=signup';
        return;
      }

      // Call the create-checkout-session edge function
      const { data, error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId }
      });

      if (checkoutError) throw checkoutError;

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
        description: err.message || "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Pricing</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Choose your plan. Scale as you grow. No hidden fees.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-destructive">Failed to load pricing plans. Please try again later.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {plans.map((plan, index) => (
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
                        onClick={() => handleGetStarted(plan.stripe_price_id_monthly, plan.name)}
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
                          'Get Started'
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
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-12 text-center">
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">How does the candidate limit work?</h3>
                  <p className="text-muted-foreground">
                    Each plan includes a monthly limit of candidates you can process. A candidate is counted when you upload and analyse their CV. You can review and compare candidates unlimited times once they're in your system.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">Can I upgrade or downgrade anytime?</h3>
                  <p className="text-muted-foreground">
                    Yes! You can change plans at any time. Upgrades take effect immediately with prorated billing, and downgrades apply at the end of your current billing period.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">What happens if I exceed my candidate limit?</h3>
                  <p className="text-muted-foreground">
                    We'll notify you when you're approaching your limit. You can either upgrade to a higher plan or purchase additional candidates as a one-time add-on. Your existing candidate data remains accessible regardless.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">Do you offer volume discounts?</h3>
                  <p className="text-muted-foreground">
                    Yes! Enterprise plans include custom pricing based on your hiring volume and needs. Contact our sales team for a personalized quote and to discuss volume discounts.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2">Is my candidate data secure and private?</h3>
                  <p className="text-muted-foreground">
                    Absolutely. We use bank-level encryption, secure authentication, and are fully GDPR-compliant. Your candidate data is stored securely with regional storage options and can be deleted at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;

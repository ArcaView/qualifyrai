import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { usePricing } from "@/contexts/PricingContext";

const UpgradePlan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { plans, isLoading: plansLoading, error: plansError } = usePricing();
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Exclude current plan (Starter) - filter out the "starter" slug
  const upgradePlans = plans.filter(plan => plan.slug !== 'starter');

  const handleUpgrade = async (planName: string) => {
    setIsUpgrading(true);
    try {
      // In production, this would redirect to Stripe Customer Portal
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upgrade', plan: planName }),
      });

      if (!response.ok) throw new Error('Failed to create portal session');

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      // Demo mode - show toast instead
      const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
      if (isDev) {
        toast({
          title: "Demo Mode - Backend Required",
          description: `In production, this would redirect to Stripe Customer Portal to upgrade to ${planName}.`,
          duration: 5000,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to redirect to billing portal. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Upgrade Your Plan</h1>
            <p className="text-muted-foreground">
              Currently on <Badge variant="secondary" className="mx-1">Starter</Badge> • Up to 100 candidates/month
            </p>
          </div>
        </div>

        {/* Upgrade Plans */}
        {plansLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : plansError ? (
          <div className="text-center py-20">
            <p className="text-destructive">Failed to load pricing plans. Please try again later.</p>
          </div>
        ) : upgradePlans.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No upgrade plans available.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {upgradePlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.is_popular
                    ? 'border-primary shadow-lg'
                    : 'border-border'
                }`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-accent text-accent-foreground">Most Popular</Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                  <div className="mt-3">
                    <span className="text-3xl font-bold">
                      {plan.price_currency === 'GBP' ? '£' : '$'}
                      {plan.price_monthly.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground text-sm ml-1">/month</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.is_popular ? "default" : "outline"}
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? "Loading..." : `Upgrade to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Questions? <a href="mailto:sales@qualifyr.ai" className="text-primary hover:underline">Contact sales</a>
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UpgradePlan;

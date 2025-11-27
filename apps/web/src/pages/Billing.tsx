import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Loader2, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";

interface SubscriptionData {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  pricing_plans: {
    name: string;
    slug: string;
    price_monthly: number;
    limits: any;
  };
}

const Billing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const { toast } = useToast();
  const { user, supabaseUser } = useUser();

  // Load subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      if (!supabaseUser?.id) return;

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select(`
            id,
            status,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            canceled_at,
            stripe_customer_id,
            stripe_subscription_id,
            pricing_plans!plan_id (
              name,
              slug,
              price_monthly,
              limits
            )
          `)
          .eq('user_id', supabaseUser.id)
          .eq('status', 'active')
          .single();

        if (error) {
          console.error('Error loading subscription:', error);
          return;
        }

        setSubscription(data as any);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingSubscription(false);
      }
    };

    loadSubscription();
  }, [supabaseUser?.id]);

  // Open Stripe Customer Portal
  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {}
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get status badge variant
  const getStatusVariant = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) return "destructive";
    if (status === 'active') return "default";
    if (status === 'past_due') return "warning";
    return "secondary";
  };

  // Get status text
  const getStatusText = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) return "Canceling";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loadingSubscription) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!subscription) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Active Subscription</CardTitle>
              <CardDescription>
                You don't have an active subscription. Please subscribe to access the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.href = '/pricing'}>
                View Pricing Plans
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const plan = subscription.pricing_plans;
  const limits = plan.limits || {};
  const maxParses = limits.cvs_per_month || 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and payment details
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Your active subscription details</CardDescription>
                </div>
                <Badge variant={getStatusVariant(subscription.status, subscription.cancel_at_period_end) as any}>
                  {getStatusText(subscription.status, subscription.cancel_at_period_end)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{plan.name}</span>
                  <span className="text-muted-foreground">
                    £{plan.price_monthly.toFixed(2)}/month
                  </span>
                </div>

                {subscription.cancel_at_period_end && subscription.current_period_end && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      Your subscription will be canceled on {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Plan Limit</p>
                    <p className="text-2xl font-semibold">
                      {maxParses === -1 ? 'Unlimited' : maxParses.toLocaleString()}
                      <span className="text-sm text-muted-foreground ml-1">CV parses/month</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Next billing date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-lg font-semibold">
                        {subscription.current_period_end ? formatDate(subscription.current_period_end) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage your subscription, payment method, and billing history
                  </p>
                  <Button
                    onClick={handleManageBilling}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Opening Portal...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Manage Billing
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing Portal</CardTitle>
              <CardDescription>Powered by Stripe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The Stripe Customer Portal allows you to:
                </p>
                <ul className="text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>Update payment method</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>View billing history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>Download invoices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>Cancel subscription</span>
                  </li>
                </ul>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    You'll be redirected to a secure Stripe portal to manage your billing
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
            <CardDescription>Technical information about your subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Subscription ID</p>
                <p className="font-mono text-xs">{subscription.stripe_subscription_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Customer ID</p>
                <p className="font-mono text-xs">{subscription.stripe_customer_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Period Start</p>
                <p className="font-medium">
                  {subscription.current_period_start ? formatDate(subscription.current_period_start) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Period End</p>
                <p className="font-medium">
                  {subscription.current_period_end ? formatDate(subscription.current_period_end) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Billing;

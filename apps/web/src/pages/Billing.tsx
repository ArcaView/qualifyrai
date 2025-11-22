/**
 * Billing Page - Manages subscriptions via Stripe Customer Portal
 *
 * BACKEND REQUIREMENTS:
 *
 * 1. POST /api/create-portal-session
 *    - Creates a Stripe Customer Portal session
 *    - Returns: { url: string } - The portal URL to redirect to
 *    - Example:
 *      ```
 *      const session = await stripe.billingPortal.sessions.create({
 *        customer: customerId,
 *        return_url: 'https://yourdomain.com/billing',
 *      });
 *      return { url: session.url };
 *      ```
 *
 * 2. GET /api/invoices/:invoiceId/pdf
 *    - Retrieves Stripe invoice PDF URL
 *    - Returns: { pdfUrl: string } - Direct link to Stripe's invoice PDF
 *    - Example:
 *      ```
 *      const invoice = await stripe.invoices.retrieve(invoiceId);
 *      return { pdfUrl: invoice.invoice_pdf };
 *      ```
 *
 * Stripe Docs:
 * - Customer Portal: https://stripe.com/docs/billing/subscriptions/integrating-customer-portal
 * - Invoice PDFs: https://stripe.com/docs/invoicing/integration#invoice-pdf
 */

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDF } from "@/lib/invoicePDF";

const Billing = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const { toast } = useToast();

  // Redirect to Stripe Customer Portal
  const handleStripePortal = async (action?: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with your actual API endpoint
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Optional: pass action type to pre-configure portal
          action: action, // 'update_subscription', 'cancel_subscription', 'update_payment_method'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Customer Portal
      window.location.href = url;
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)

      // Development mode: Show helpful message instead of error
      const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

      if (isDev) {
        const actionMessages: Record<string, string> = {
          'update_subscription': 'change your plan',
          'cancel_subscription': 'cancel your subscription',
          'update_payment_method': 'update your payment method',
        };

        toast({
          title: "Demo Mode - Backend Required",
          description: `In production, this would redirect to Stripe Customer Portal to ${actionMessages[action || ''] || 'manage billing'}. Implement POST /api/create-portal-session to enable.`,
          duration: 5000,
        });
        setIsLoading(false);
      } else {
        // Production mode: Show error
        toast({
          title: "Error",
          description: "Failed to redirect to billing portal. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    }
  };

  // Download invoice PDF from Stripe
  const handleDownloadInvoice = async (invoiceId: string, invoiceData: any) => {
    setDownloadingInvoice(invoiceId);
    try {
      // PRODUCTION: Fetch Stripe invoice PDF URL from backend
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        method: 'GET',
      });

      if (response.ok) {
        const { pdfUrl } = await response.json();
        // Open Stripe's invoice PDF in a new tab
        window.open(pdfUrl, '_blank');
      } else {
        throw new Error('Failed to fetch invoice');
      }
    } catch (error) {
      // TODO: Replace with proper error logging service (e.g., Sentry)

      // DEVELOPMENT MODE: Generate demo PDF client-side
      if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
        toast({
          title: "Generating Demo Invoice",
          description: "In production, this would download the official Stripe invoice PDF.",
          duration: 3000,
        });

        // Generate demo PDF using client-side library
        generateInvoicePDF({
          id: invoiceData.id,
          date: invoiceData.date,
          amount: invoiceData.amount,
          status: invoiceData.status,
          customerName: "Demo Customer",
          customerEmail: "demo@example.com",
          plan: currentPlan.name,
          billingPeriod: `${invoiceData.date} - Monthly`,
        });
      } else {
        // Production error
        toast({
          title: "Error",
          description: "Failed to download invoice. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const currentPlan = {
    name: "Professional",
    price: "$99",
    period: "month",
    status: "Active",
    renewalDate: "December 14, 2025",
    usage: "8,234",
    limit: "50,000",
  };

  const invoices = [
    { id: "INV-2024-001", date: "Nov 14, 2025", amount: "$99.00", status: "Paid" },
    { id: "INV-2024-002", date: "Oct 14, 2025", amount: "$99.00", status: "Paid" },
    { id: "INV-2024-003", date: "Sep 14, 2025", amount: "$99.00", status: "Paid" },
    { id: "INV-2024-004", date: "Aug 14, 2025", amount: "$99.00", status: "Paid" },
  ];

  const paymentMethod = {
    type: "Visa",
    last4: "4242",
    expiry: "12/2026",
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Billing & Payments</h1>
          <p className="text-muted-foreground">
            Manage your subscription, payment methods, and invoices
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
                  <Badge variant="default">{currentPlan.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{currentPlan.name}</span>
                    <span className="text-muted-foreground">
                      {currentPlan.price}/{currentPlan.period}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Usage this month</p>
                      <p className="text-2xl font-semibold">
                        {currentPlan.usage} <span className="text-sm text-muted-foreground">/ {currentPlan.limit}</span>
                      </p>
                      <div className="w-full bg-secondary h-2 rounded-full mt-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${(parseInt(currentPlan.usage.replace(',', '')) / parseInt(currentPlan.limit.replace(',', ''))) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Next billing date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-lg font-semibold">{currentPlan.renewalDate}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/upgrade')}
                    >
                      Change Plan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStripePortal('cancel_subscription')}
                      disabled={isLoading}
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Manage your payment details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-semibold">{paymentMethod.type} •••• {paymentMethod.last4}</p>
                      <p className="text-sm text-muted-foreground">Expires {paymentMethod.expiry}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleStripePortal('update_payment_method')}
                    disabled={isLoading}
                  >
                    Update Payment Method
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>Download and view your past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{invoice.id}</p>
                        <p className="text-sm text-muted-foreground">{invoice.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{invoice.amount}</p>
                        <Badge variant="secondary" className="text-xs">
                          {invoice.status}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadInvoice(invoice.id, invoice)}
                        disabled={downloadingInvoice === invoice.id}
                      >
                        <Download className={`h-4 w-4 ${downloadingInvoice === invoice.id ? 'animate-bounce' : ''}`} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
      </div>
    </DashboardLayout>
  );
};

export default Billing;

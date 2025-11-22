// Stripe Billing Client Library
// Handles all Stripe-related operations for subscriptions and invoices

import { supabase } from "@/lib/supabase";

// TypeScript Interfaces
export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan_id: string | null;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  stripe_invoice_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  billing_reason: string | null;
  created_at: string;
}

export interface CheckoutSessionResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export interface PortalSessionResponse {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Fetch the current user's subscription from the database
 */
export async function fetchCurrentSubscription(): Promise<Subscription | null> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User not authenticated:", userError);
      return null;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no subscription found, return null (not an error)
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching subscription:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error fetching subscription:", error);
    return null;
  }
}

/**
 * Fetch all invoices for the current user
 */
export async function fetchInvoices(): Promise<Invoice[]> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User not authenticated:", userError);
      return [];
    }

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Unexpected error fetching invoices:", error);
    return [];
  }
}

/**
 * Create a Stripe Checkout Session for a new subscription
 */
export async function createCheckoutSession(
  priceId: string
): Promise<CheckoutSessionResponse> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      return {
        success: false,
        error: "Supabase URL not configured",
      };
    }

    const functionUrl = `${supabaseUrl}/functions/v1/create-checkout-session`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        priceId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || "Failed to create checkout session",
      };
    }

    const data = await response.json();

    return {
      success: true,
      sessionId: data.sessionId,
      url: data.url,
    };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a Stripe Customer Portal Session for managing subscription
 */
export async function createPortalSession(): Promise<PortalSessionResponse> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      return {
        success: false,
        error: "Supabase URL not configured",
      };
    }

    const functionUrl = `${supabaseUrl}/functions/v1/create-portal-session`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || "Failed to create portal session",
      };
    }

    const data = await response.json();

    return {
      success: true,
      url: data.url,
    };
  } catch (error) {
    console.error("Error creating portal session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get invoice PDF URL
 */
export async function getInvoicePDF(invoiceId: string): Promise<string | null> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User not authenticated:", userError);
      return null;
    }

    const { data, error } = await supabase
      .from("invoices")
      .select("invoice_pdf, hosted_invoice_url")
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      console.error("Error fetching invoice PDF:", error);
      return null;
    }

    return data.invoice_pdf || data.hosted_invoice_url || null;
  } catch (error) {
    console.error("Unexpected error fetching invoice PDF:", error);
    return null;
  }
}

/**
 * Format currency amount (cents to dollars)
 */
export function formatAmount(
  amountInCents: number,
  currency: string = "usd"
): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Format date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

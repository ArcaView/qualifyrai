// Supabase Edge Function: Stripe Webhook Handler
// Purpose: Handle Stripe webhook events and update database
// Deploy: supabase functions deploy stripe-webhook

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Verify webhook signature
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object, supabaseAdmin);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabaseAdmin);
        break;

      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object, supabaseAdmin);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object, supabaseAdmin);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, supabaseAdmin, stripe);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Handle subscription creation/update
async function handleSubscriptionUpdate(subscription: any, supabase: any) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }

  // Get the price ID from the subscription
  const priceId = subscription.items?.data?.[0]?.price?.id;

  let planId = null;

  if (priceId) {
    // Look up the pricing plan by stripe_price_id_monthly
    const { data: pricingPlan } = await supabase
      .from('pricing_plans')
      .select('id')
      .eq('stripe_price_id_monthly', priceId)
      .single();

    planId = pricingPlan?.id;
  }

  // Upsert subscription data
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    plan_id: planId,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'stripe_subscription_id',
  });

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  console.log(`Subscription ${subscription.id} updated for user ${userId}, plan ${planId}`);
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error deleting subscription:', error);
    throw error;
  }

  console.log(`Subscription ${subscription.id} marked as canceled`);
}

// Handle successful invoice payment
async function handleInvoicePaid(invoice: any, supabase: any) {
  // Get user_id from customer
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (!subscription?.user_id) {
    console.error('No user found for customer:', invoice.customer);
    return;
  }

  // Upsert invoice record
  const { error } = await supabase.from('invoices').upsert({
    user_id: subscription.user_id,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: invoice.subscription,
    stripe_customer_id: invoice.customer,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status,
    invoice_pdf: invoice.invoice_pdf,
    hosted_invoice_url: invoice.hosted_invoice_url,
    billing_reason: invoice.billing_reason,
  }, {
    onConflict: 'stripe_invoice_id',
  });

  if (error) {
    console.error('Error upserting invoice:', error);
    throw error;
  }

  console.log(`Invoice ${invoice.id} recorded for user ${subscription.user_id}`);
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(invoice: any, supabase: any) {
  // Update subscription status to past_due if payment failed
  if (invoice.subscription) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', invoice.subscription);

    if (error) {
      console.error('Error updating subscription to past_due:', error);
    }
  }

  console.log(`Invoice payment failed: ${invoice.id}`);
}

// Handle checkout session completion
async function handleCheckoutCompleted(session: any, supabase: any, stripe: any) {
  const userId = session.metadata?.user_id;

  if (!userId) {
    console.error('No user_id in checkout session metadata');
    return;
  }

  console.log(`Processing checkout completion for user ${userId}`);

  // Get the subscription ID from the session
  const subscriptionId = session.subscription;

  if (!subscriptionId) {
    console.error('No subscription ID in checkout session');
    return;
  }

  // Fetch the full subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (!subscription) {
    console.error('Could not retrieve subscription from Stripe:', subscriptionId);
    return;
  }

  // Get the price ID from the subscription
  const priceId = subscription.items?.data?.[0]?.price?.id;

  if (!priceId) {
    console.error('No price ID found in subscription');
    return;
  }

  console.log(`Subscription ${subscriptionId} has price ${priceId}`);

  // Look up the pricing plan by stripe_price_id_monthly
  const { data: pricingPlan, error: planError } = await supabase
    .from('pricing_plans')
    .select('id')
    .eq('stripe_price_id_monthly', priceId)
    .single();

  if (planError || !pricingPlan) {
    console.error('Could not find pricing plan for price ID:', priceId, planError);
    return;
  }

  console.log(`Found pricing plan ${pricingPlan.id} for price ${priceId}`);

  // Create the full subscription record
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: session.customer,
      stripe_subscription_id: subscription.id,
      plan_id: pricingPlan.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error creating subscription record:', error);
    throw error;
  }

  console.log(`Successfully created subscription record for user ${userId}, plan ${pricingPlan.id}`);
}

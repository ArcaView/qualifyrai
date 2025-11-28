// Supabase Edge Function: Verify Payment Session
// Purpose: Verify Stripe checkout session and create subscription record
// Deploy: supabase functions deploy verify-payment

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno';
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Get authorization header and extract JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Extract the JWT token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user - IMPORTANT: Pass the token explicitly
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Parse request body
    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify session is completed
    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    // Verify session belongs to this user (check metadata)
    if (session.metadata?.user_id !== user.id) {
      throw new Error('Session does not belong to this user');
    }

    // Get subscription ID from session
    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      throw new Error('No subscription found in session');
    }

    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Get the price ID
    const priceId = subscription.items?.data?.[0]?.price?.id;
    if (!priceId) {
      throw new Error('No price ID found in subscription');
    }

    console.log(`Verified payment for user ${user.id}, subscription ${subscriptionId}, price ${priceId}`);

    // Look up the pricing plan by stripe_price_id_monthly
    const { data: pricingPlan, error: planError } = await supabaseClient
      .from('pricing_plans')
      .select('id, name, slug')
      .eq('stripe_price_id_monthly', priceId)
      .single();

    if (planError || !pricingPlan) {
      console.error('Could not find pricing plan for price ID:', priceId, planError);
      throw new Error('Pricing plan not found for this subscription');
    }

    console.log(`Found pricing plan: ${pricingPlan.slug} (${pricingPlan.id})`);

    // Create the subscription record (or update if customer already exists)
    const { error: insertError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        stripe_customer_id: session.customer as string,
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
        onConflict: 'stripe_customer_id',
        ignoreDuplicates: false,
      });

    if (insertError) {
      console.error('Error creating subscription record:', insertError);
      throw insertError;
    }

    console.log(`Successfully created subscription record for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified and subscription created',
        plan: pricingPlan.slug,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

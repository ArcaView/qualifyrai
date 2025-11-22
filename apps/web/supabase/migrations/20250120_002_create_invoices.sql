-- Migration: Create invoices table for payment history
-- Created: 2025-01-20
-- Purpose: Track Stripe invoice data for billing history

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  amount_due INTEGER NOT NULL, -- in cents
  amount_paid INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_pdf TEXT, -- URL to PDF
  hosted_invoice_url TEXT, -- Stripe-hosted invoice page
  billing_reason TEXT, -- subscription_create, subscription_cycle, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_subscription_id ON invoices(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own invoices
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
CREATE POLICY "Users can view their own invoices"
  ON invoices
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert invoices (webhook handler)
DROP POLICY IF EXISTS "Service role can insert invoices" ON invoices;
CREATE POLICY "Service role can insert invoices"
  ON invoices
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Service role can update invoices (webhook handler)
DROP POLICY IF EXISTS "Service role can update invoices" ON invoices;
CREATE POLICY "Service role can update invoices"
  ON invoices
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE invoices IS 'Stores Stripe invoice data. Populated via Stripe webhooks when invoices are created or updated.';
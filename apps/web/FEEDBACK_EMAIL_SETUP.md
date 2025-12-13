# Feedback Email Notification Setup Guide

This guide will help you set up automatic email notifications for feedback and feature requests submitted through your Qualifyr.AI application.

## Overview

When users submit feedback or feature requests, the system will automatically send an email notification to `info@qualifyrai.com` (or your configured email address) with the submission details.

## Prerequisites

1. A Resend account (free tier available at https://resend.com)
2. Access to your Supabase project dashboard
3. Supabase CLI installed (for deploying Edge Functions)

## Step 1: Set Up Resend Account

1. Go to https://resend.com and sign up for a free account
2. Verify your domain (or use Resend's test domain for development)
3. Navigate to **API Keys** in your Resend dashboard
4. Create a new API key with "Sending access"
5. Copy the API key (starts with `re_`)

## Step 2: Deploy the Edge Function

1. Open your terminal and navigate to the project:
   ```bash
   cd apps/web
   ```

2. Make sure you're logged into Supabase CLI:
   ```bash
   supabase login
   ```

3. Link to your project (if not already linked):
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy the Edge Function:
   ```bash
   supabase functions deploy send-feedback-email
   ```

5. Set the required environment variables:
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_api_key_here
   supabase secrets set FEEDBACK_EMAIL=info@qualifyrai.com
   ```

   **Note:** If you want to use a different email address, change `FEEDBACK_EMAIL` accordingly.

## Step 3: Run the Database Migration

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `apps/web/supabase/migrations/20250122_002_create_feedback_email_trigger.sql`
5. **IMPORTANT:** Before running, you need to update the Supabase URL in the migration:
   - Find the line with `'https://your-project-ref.supabase.co'`
   - Replace `your-project-ref` with your actual Supabase project reference
   - You can find your project URL in: **Settings** → **API** → **Project URL**

6. Click **Run** to execute the migration

## Step 4: Configure Database Settings (Alternative Method)

Instead of hardcoding the URL in the function, you can set it as a database configuration:

1. In Supabase SQL Editor, run:
   ```sql
   -- Set your Supabase project URL
   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project-ref.supabase.co';
   
   -- Set your service role key (get from Settings → API → service_role key)
   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';
   ```

   **Security Note:** The service role key has admin access. Keep it secure and never expose it in frontend code.

2. After setting these, you can update the migration function to remove the hardcoded URL fallback.

## Step 5: Verify the Setup

### Test the Edge Function Directly

1. Go to **Supabase Dashboard** → **Edge Functions** → **send-feedback-email**
2. Click **Invoke Function**
3. Use this test payload:
   ```json
   {
     "id": "test-123",
     "title": "Feedback: Test submission",
     "description": "This is a test feedback submission",
     "user_id": null,
     "created_at": "2025-01-22T12:00:00Z"
   }
   ```
4. Check that you receive an email at `info@qualifyrai.com`

### Test via Application

1. Go to your application
2. Submit feedback through either:
   - The feedback popup (after 3 hours of usage)
   - The feedback form on the Feature Requests page
3. Check that:
   - The feedback is saved in the database
   - You receive an email notification

## Troubleshooting

### Email Not Sending

1. **Check Resend API Key:**
   ```bash
   supabase secrets list
   ```
   Verify `RESEND_API_KEY` is set correctly.

2. **Check Edge Function Logs:**
   - Go to **Supabase Dashboard** → **Edge Functions** → **send-feedback-email** → **Logs**
   - Look for error messages

3. **Check Database Trigger:**
   - In SQL Editor, run:
     ```sql
     SELECT * FROM pg_trigger WHERE tgname = 'trigger_send_feedback_email';
     ```
   - Verify the trigger exists

4. **Check pg_net Extension:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_net';
   ```
   If it doesn't exist, run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_net;
   ```

### Database Trigger Not Firing

1. **Verify Trigger Exists:**
   ```sql
   SELECT 
     tgname as trigger_name,
     tgrelid::regclass as table_name,
     tgenabled as enabled
   FROM pg_trigger
   WHERE tgname = 'trigger_send_feedback_email';
   ```

2. **Check Function:**
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname = 'send_feedback_email';
   ```

3. **Test Trigger Manually:**
   ```sql
   -- Insert a test record
   INSERT INTO feature_requests (title, description, status)
   VALUES ('Test', 'Test description', 'pending');
   
   -- Check if email was sent
   ```

### Resend API Errors

1. **Verify Domain:**
   - Make sure your domain is verified in Resend
   - For testing, you can use Resend's test domain: `onboarding@resend.dev`

2. **Check API Limits:**
   - Free tier: 3,000 emails/month
   - Check your usage in Resend dashboard

3. **Verify Sender Email:**
   - The function uses `noreply@qualifyrai.com` as the sender
   - Make sure this domain is verified in Resend, or update it in the Edge Function

## Customization

### Change Email Recipient

Update the `FEEDBACK_EMAIL` secret:
```bash
supabase secrets set FEEDBACK_EMAIL=your-email@example.com
```

### Change Sender Email

Edit `apps/web/supabase/functions/send-feedback-email/index.ts`:
```typescript
from: 'Your Name <noreply@yourdomain.com>',
```

### Customize Email Template

Edit the `formatFeedbackEmail` function in the Edge Function to customize the email HTML.

## Security Considerations

1. **Service Role Key:** Never expose the service role key in frontend code or client-side JavaScript
2. **Resend API Key:** Keep it secure and only set it as a Supabase secret
3. **Email Addresses:** The recipient email is configurable via environment variable

## Monitoring

- **Edge Function Logs:** Check Supabase Dashboard → Edge Functions → Logs
- **Database Logs:** Check PostgreSQL logs for trigger execution
- **Resend Dashboard:** Monitor email delivery and failures

## Support

If you encounter issues:
1. Check the Supabase Edge Function logs
2. Verify all environment variables are set correctly
3. Test the Edge Function directly via the Supabase dashboard
4. Check Resend dashboard for delivery status


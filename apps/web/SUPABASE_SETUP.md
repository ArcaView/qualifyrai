# Supabase Authentication Setup

This guide will help you set up Supabase authentication with email verification for Qualifyr.AI.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in your project details:
   - **Name**: qualifyr-ai (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project"
5. Wait for the project to finish setting up (this takes about 2 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, click on the "Settings" icon (gear) in the sidebar
2. Navigate to "API" under "Project Settings"
3. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (under "Project API keys")

## Step 3: Configure Environment Variables

1. Open the `.env.local` file in the project root
2. Replace the placeholder values with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Configure Email Authentication

By default, Supabase requires email verification. To customise the email settings:

1. In your Supabase dashboard, go to "Authentication" in the sidebar
2. Click on "Providers"
3. Make sure "Email" is enabled
4. Click on "Email" to configure it

### Email Verification Settings

Under "Authentication" > "Providers" > "Email":

- **Enable Email Confirmations**: This should be ON by default (recommended)
- **Secure Email Change**: ON (recommended)
- **Double Confirm Email Changes**: ON (recommended)

### Customise Email Templates (Optional)

1. Go to "Authentication" > "Email Templates"
2. You can customise the following templates:
   - **Confirm signup**: Sent when users sign up
   - **Magic Link**: For passwordless login
   - **Change Email Address**: When users change their email
   - **Reset Password**: For password resets

Example customisation for "Confirm signup":
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email address</a></p>
```

## Step 5: Configure URL Settings

1. Go to "Authentication" > "URL Configuration"
2. Set the **Site URL** to your production domain (e.g., `https://yourdomain.com`)
3. For local development, add `http://localhost:5173` to **Redirect URLs**
4. For production, add your production URL to **Redirect URLs**

## Step 6: Test the Authentication Flow

1. Start your development server:
```bash
npm run dev
```

2. Navigate to http://localhost:5173
3. Click "Sign Up" in the navigation
4. Fill out the registration form
5. Check your email for the verification link
6. Click the verification link
7. Try logging in with your credentials

## Email Verification Flow

Here's how the email verification works:

1. **User signs up** → Account is created but not yet verified
2. **Verification email sent** → User receives an email with a confirmation link
3. **User clicks link** → Email is verified, `email_confirmed_at` is set
4. **User can log in** → Only verified users can successfully log in

## Troubleshooting

### Emails not being sent?

1. Check your Supabase project's email rate limits (Authentication > Rate Limits)
2. For production, consider setting up a custom SMTP provider:
   - Go to "Project Settings" > "Auth" > "SMTP Settings"
   - Configure your SMTP server (e.g., SendGrid, AWS SES, etc.)

### Users can't log in after verification?

- Make sure the redirect URL matches your application URL
- Check that `email_confirmed_at` is set in the Supabase dashboard (Authentication > Users)

### Development with local emails?

For development, you can disable email confirmation:
1. Go to "Authentication" > "Providers" > "Email"
2. Turn off "Enable Email Confirmations"
3. **Remember to turn this back on for production!**

## Security Best Practices

1. **Never commit** your `.env.local` file to version control
2. **Use Row Level Security (RLS)** on your database tables
3. **Enable MFA** for admin accounts in production
4. **Monitor** authentication logs in the Supabase dashboard
5. **Set up** proper password policies in Authentication settings

## Additional Features

### Password Reset

Password reset is automatically handled by Supabase. Users can:
1. Click "Forgot Password" (you'll need to add this UI)
2. Receive a reset email
3. Click the link and set a new password

To implement this in your UI, use:
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/update-password`,
})
```

### Social Authentication (Optional)

You can add OAuth providers like Google, GitHub, etc.:
1. Go to "Authentication" > "Providers"
2. Enable the provider you want
3. Follow the setup instructions for each provider
4. Update your code to include social login buttons

## Support

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase/issues

# Environment Variables Guide

Complete reference for all environment variables required to run CV Overlay Web in different environments.

---

## 📋 Quick Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the required values below

3. Restart your development server

---

## 🔴 REQUIRED - Frontend Variables

These variables are **required** for the application to function. The app will fail to start without them.

### Supabase Configuration

```bash
# Your Supabase project URL
# Get this from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Your Supabase anonymous/public key
# Get this from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
# This key is safe to expose in frontend code
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find these values:**
1. Go to your Supabase dashboard
2. Select your project
3. Navigate to Settings → API
4. Copy the "Project URL" and "anon public" key

---

## ⚠️ IMPORTANT - Backend/API Variables

These should **ONLY** be set in backend environments (Supabase Edge Functions, server-side code). **Never** expose these in frontend code.

### ParseScore API (Optional)

```bash
# ParseScore API base URL
# If not set, defaults to http://localhost:8000
VITE_PARSESCORE_API_URL=https://api.parsescore.com

# ParseScore API authentication key
# Optional - only needed if your ParseScore instance requires auth
VITE_PARSESCORE_API_KEY=ps_live_your_api_key_here
```

**Note**: If you're running ParseScore locally for development, you can omit these variables.

### Stripe Payment Processing

```bash
# Stripe publishable key (safe for frontend)
# Get from: https://dashboard.stripe.com/apikeys
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stripe secret key (BACKEND ONLY - never expose in frontend!)
# Set this in Supabase Edge Functions environment or backend server
STRIPE_SECRET_KEY=sk_live_...

# Stripe webhook signing secret
# Get from: https://dashboard.stripe.com/webhooks
# Used to verify webhook authenticity
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Security Warning**:
- ✅ `VITE_STRIPE_PUBLISHABLE_KEY` - Safe to use in frontend (starts with `pk_`)
- ❌ `STRIPE_SECRET_KEY` - **NEVER** put in `.env` file. Only in backend!
- ❌ `STRIPE_WEBHOOK_SECRET` - Backend only

---

## 🔧 OPTIONAL - Development & Monitoring

These variables enhance functionality but aren't required for basic operation.

### Error Tracking (Sentry)

```bash
# Sentry DSN for error tracking
# Get from: https://sentry.io/settings/YOUR_ORG/projects/YOUR_PROJECT/keys/
VITE_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/7654321

# Environment name (development, staging, production)
# Helps filter errors in Sentry dashboard
VITE_ENVIRONMENT=production
```

### Analytics

```bash
# Google Analytics measurement ID
# Get from: https://analytics.google.com/
VITE_ANALYTICS_ID=G-XXXXXXXXXX

# Alternative: Plausible Analytics domain
VITE_PLAUSIBLE_DOMAIN=yoursite.com
```

### Feature Flags

```bash
# Enable/disable impersonation feature (default: true)
VITE_ENABLE_IMPERSONATION=true

# Enable/disable feature requests page (default: true)
VITE_ENABLE_FEATURE_REQUESTS=true

# Enable debug mode (default: false)
VITE_DEBUG_MODE=false
```

---

## 🏢 Environment-Specific Configuration

### Development (.env.development)

```bash
# Supabase
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# ParseScore (local)
VITE_PARSESCORE_API_URL=http://localhost:8000
# No API key needed for local development

# Stripe (test mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Environment
VITE_ENVIRONMENT=development
VITE_DEBUG_MODE=true
```

### Staging (.env.staging)

```bash
# Supabase (staging project)
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# ParseScore (staging)
VITE_PARSESCORE_API_URL=https://staging-api.parsescore.com
VITE_PARSESCORE_API_KEY=ps_test_...

# Stripe (test mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Monitoring
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_ENVIRONMENT=staging
```

### Production (.env.production)

```bash
# Supabase (production project)
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# ParseScore (production)
VITE_PARSESCORE_API_URL=https://api.parsescore.com
VITE_PARSESCORE_API_KEY=ps_live_...

# Stripe (live mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Monitoring (required in production!)
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_ANALYTICS_ID=G-...
VITE_ENVIRONMENT=production

# Feature flags
VITE_DEBUG_MODE=false
```

---

## 🔐 Backend Environment Variables

These are set in **Supabase Edge Functions** or your backend server, not in the frontend `.env` file.

### How to set Supabase Edge Function secrets:

```bash
# Using Supabase CLI
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set PARSESCORE_API_KEY=ps_live_...
```

### Required Backend Secrets:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...                    # Payment processing
STRIPE_WEBHOOK_SECRET=whsec_...                   # Webhook verification

# ParseScore API (if needed)
PARSESCORE_API_KEY=ps_live_...                    # API authentication

# Supabase (auto-available in Edge Functions)
SUPABASE_URL=https://...                          # Auto-injected
SUPABASE_SERVICE_ROLE_KEY=eyJ...                  # Auto-injected (use for admin tasks)
SUPABASE_ANON_KEY=eyJ...                          # Auto-injected

# Sentry (optional)
SENTRY_DSN=https://...@sentry.io/...              # Backend error tracking
```

---

## ✅ Validation Checklist

Before deploying, verify:

- [ ] All `VITE_SUPABASE_*` variables are set
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` starts with `pk_live_` (production) or `pk_test_` (development)
- [ ] No `sk_` (secret keys) in frontend `.env` file
- [ ] Sentry DSN is configured for production
- [ ] Environment name (`VITE_ENVIRONMENT`) is correct
- [ ] ParseScore URL is accessible from your hosting environment
- [ ] All Supabase secrets are set using `supabase secrets set`

---

## 🚨 Security Best Practices

### ✅ DO:
- ✅ Use different Supabase projects for dev/staging/prod
- ✅ Rotate API keys periodically
- ✅ Use Stripe test mode (`pk_test_`) in development
- ✅ Set backend secrets via `supabase secrets set`
- ✅ Add `.env` to `.gitignore` (already done)
- ✅ Use environment variables, never hardcode secrets

### ❌ DON'T:
- ❌ Commit `.env` files to git
- ❌ Share production `.env` files in Slack/email
- ❌ Use production keys in development
- ❌ Expose `sk_` or `whsec_` keys in frontend
- ❌ Hardcode API keys in source code

---

## 🐛 Troubleshooting

### "VITE_SUPABASE_URL is not defined"

**Solution**: Vite requires variables to start with `VITE_` to be exposed to the frontend. Make sure you've added `VITE_` prefix and restarted your dev server.

```bash
# Restart dev server after changing .env
npm run dev
```

### "Invalid Supabase URL"

**Solution**: Ensure the URL format is correct:
```
✅ https://your-project-id.supabase.co
❌ https://your-project-id.supabase.co/
❌ your-project-id.supabase.co
```

### "Stripe is not defined"

**Solution**: Make sure you've added the Stripe publishable key AND restarted the dev server.

### "ParseScore API connection failed"

**Solution**:
1. Check if ParseScore API is running (local: http://localhost:8000/docs)
2. Verify `VITE_PARSESCORE_API_URL` is correct
3. Check if API key is required and set

### Edge Functions can't access secrets

**Solution**: Set secrets using Supabase CLI:
```bash
supabase secrets set MY_SECRET=value
```

Not in `.env` file. Edge Functions read from Supabase Secrets Manager.

---

## 📚 Additional Resources

- [Supabase Environment Variables](https://supabase.com/docs/guides/cli/managing-environments)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [Sentry Configuration](https://docs.sentry.io/platforms/javascript/configuration/)

---

## 🔄 Migration from Old Setup

If upgrading from an old version:

1. **Backup your current `.env`**:
   ```bash
   cp .env .env.backup
   ```

2. **Check for new required variables**:
   ```bash
   diff .env.example .env
   ```

3. **Add missing variables** from this guide

4. **Test thoroughly** in development before deploying

---

*Last Updated: 2025-01-20*
*Version: 1.0.0*

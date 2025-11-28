# Quick Fix: Payment Verification 400 Error

## You've Already Done ✅
- Stripe Price IDs configured in database
- Edge Functions deployed (verify-payment, create-checkout-session)

## What's Still Missing ❌

Most likely: **STRIPE_SECRET_KEY not configured in Supabase**

## Fix It Now (2 minutes)

### Step 1: Get Your Stripe Secret Key
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Click "Reveal test key" on the **Secret key**
3. Copy the key (starts with `sk_test_...`)

### Step 2: Add to Supabase
1. Go to: https://supabase.com/dashboard/project/nxteuyzcxabqpelingje/settings/functions
2. Scroll down to **"Function secrets"**
3. Click **"Add a new secret"**
4. Enter:
   - **Name**: `STRIPE_SECRET_KEY`
   - **Value**: `sk_test_...` (paste your key from Step 1)
5. Click **"Add secret"**

### Step 3: Redeploy Functions (IMPORTANT!)
After adding the secret, you MUST redeploy:

```powershell
cd apps/web
supabase functions deploy verify-payment
supabase functions deploy create-checkout-session
```

**Why?** Functions only pick up new secrets after redeployment.

### Step 4: Test Again
1. Clear browser cache (Ctrl+Shift+Delete)
2. Go to: http://192.168.56.1:8080/complete-signup
3. Click "Get Started"
4. Use test card: `4242 4242 4242 4242`
5. Complete payment
6. Should work now! ✅

## Still Not Working?

### Check the Logs
See the ACTUAL error message:

```powershell
cd apps/web
supabase functions logs verify-payment --project-ref nxteuyzcxabqpelingje
```

Look for errors like:
- `"STRIPE_SECRET_KEY is undefined"` → Secret not configured
- `"Invalid API Key"` → Wrong key or wrong mode (test vs live)
- `"Session does not belong to this user"` → Different issue (see below)
- `"No subscription found"` → Checkout session issue

### Check Browser Network Tab
1. Open DevTools (F12)
2. Go to **Network** tab
3. Click "Get Started" button
4. Look for the failed `verify-payment` request
5. Click it → **Preview** or **Response** tab
6. Copy the error message and share it

## Common Issues

### "STRIPE_SECRET_KEY is undefined"
You forgot to add the secret to Supabase. Go to Step 2 above.

### "Invalid API Key provided"
- You're in test mode but used a live key (or vice versa)
- Check: Are you using test products (`price_1SR...`)? Use test key (`sk_test_...`)
- Check: Is Stripe dashboard in **Test Mode** (toggle in top-right)?

### "Session does not belong to this user"
The checkout session wasn't created with the right metadata. This means there's an issue with `create-checkout-session` function.

Check if it's setting metadata:
```typescript
metadata: {
  user_id: user.id
}
```

### Test Mode vs Live Mode Mismatch
Make sure EVERYTHING is in the same mode:
- Stripe dashboard: **Test Mode** toggle ON
- Products: Test products (price IDs start with `price_1SR...`)
- Secret key: `sk_test_...` (not `sk_live_...`)

## Checklist

- [ ] Got Stripe Secret Key from dashboard
- [ ] Added STRIPE_SECRET_KEY to Supabase secrets
- [ ] Redeployed verify-payment function
- [ ] Redeployed create-checkout-session function
- [ ] Cleared browser cache
- [ ] Tested payment flow
- [ ] If still failing: checked logs with command above

## Need the Exact Error?

Run this in PowerShell and share the output:

```powershell
cd apps/web
supabase functions logs verify-payment --project-ref nxteuyzcxabqpelingje --limit 20
```

This will show the last 20 log entries including the exact error message.

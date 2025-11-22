# User Impersonation - Complete Guide

## Overview

The User Impersonation system allows administrators to view the application exactly as another user sees it, **with the user's explicit approval**. This is essential for:

- Debugging user-specific issues
- Providing hands-on support
- Reproducing bugs in production
- Training and demonstrations

## Key Features

✅ **User Approval Required** - Users must explicitly approve every request
✅ **Time-Limited** - 5 minute approval window, 30 minute session max
✅ **Full Audit Trail** - Every action logged permanently
✅ **Realtime Notifications** - Instant updates via Supabase
✅ **Prominent Banners** - Both admin and user see clear indicators
✅ **Auto-Expiry** - Sessions automatically end after time limit
✅ **Secure** - Admin-only access with RLS policies

## Setup Instructions

### Step 1: Database Setup

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the file `IMPERSONATION_DB_SETUP.md` in this repository
4. Copy and run each SQL section in order:
   - Step 1: Create impersonation_sessions table
   - Step 2: Create impersonation_audit_log table
   - Step 3: Create helper functions
   - Step 4: Enable Realtime
   - Step 5: (Optional) Set up automatic cleanup

5. **IMPORTANT**: Update admin emails in the RLS policies:
   - Search for `'admin@qualifyr.ai', 'btjtownsend@outlook.com'`
   - Replace with your actual admin email addresses

### Step 2: Update Admin Emails in Code

Update the admin email list in these files:

1. `src/pages/AdminDashboard.tsx` (line 42)
2. `src/pages/FeatureRequests.tsx` (line 31)
3. `src/components/Navbar.tsx` (line 16)
4. `src/contexts/ImpersonationContext.tsx` (line 25)

```typescript
const ADMIN_EMAILS = ["admin@qualifyr.ai", "your@email.com"];
```

### Step 3: Pull Latest Code

```bash
git pull origin claude/add-auth-buttons-012gjAaBKQHPrd5HFKEqSaDk
npm install  # If there are any new dependencies
npm run dev
```

## How to Use

### As an Admin

1. **Navigate to Admin Dashboard**
   - Click your user dropdown in navbar
   - Select "Admin Dashboard"

2. **Request Impersonation**
   - Scroll to "User Impersonation" card
   - Enter the user's email address
   - Optionally add a reason (e.g., "Help with billing issue")
   - Click "Request Impersonation"

3. **Wait for Approval**
   - User receives a popup immediately
   - They have 5 minutes to approve or reject
   - You'll see a toast notification when they respond

4. **During Session**
   - Purple banner appears at top of screen
   - Shows user email and time remaining
   - You see exactly what the user sees
   - Click "End Session" in banner when done

5. **Session Auto-Ends**
   - After 30 minutes, session automatically terminates
   - Both you and user receive notifications

### As a User Being Impersonated

1. **Receive Request**
   - Popup appears immediately when admin requests
   - Shows admin email and reason
   - Countdown timer shows 5 minutes remaining

2. **Review Details**
   - See who is requesting (admin email)
   - See why they need access (reason)
   - Read what they can do during session

3. **Approve or Reject**
   - **Approve**: Click green "Approve (30 min)" button
   - **Reject**: Click red "Reject" button
   - Request expires after 5 minutes if no action

4. **During Session (if approved)**
   - Yellow banner appears at top
   - Shows admin email and time remaining
   - They can see what you see
   - Session ends after 30 minutes automatically

## User Experience

### Admin View During Impersonation

```
┌────────────────────────────────────────────────────────┐
│ 🛡️ Admin Mode: Viewing as user@example.com • 28:45    │
│                                      [End Session]      │
└────────────────────────────────────────────────────────┘
```

- **Purple banner** at top of screen
- Shows target user email
- Countdown timer
- "End Session" button

### User View During Impersonation

```
┌────────────────────────────────────────────────────────┐
│ ⚠️ Your session is being viewed by: admin@qualifyr.ai │
│ (Admin Support) • Session ends in: 28:45               │
│                            👁️ They can see what you see│
└────────────────────────────────────────────────────────┘
```

- **Yellow banner** at top of screen
- Shows admin email
- Countdown timer
- Animated eye icon

### Approval Popup

```
┌────────────────────────────────────────┐
│ 🛡️ Admin Support Request               │
│                                        │
│ ⚠️ An administrator wants to view your │
│    account                             │
│                                        │
│ Admin: admin@qualifyr.ai               │
│ Reason: Help with billing issue        │
│                                        │
│ What this means:                       │
│ • They'll see your account as you do   │
│ • Can navigate and view your data      │
│ • All actions are logged               │
│ • Auto-ends after 30 minutes           │
│                                        │
│ Request expires in: 4:23               │
│                                        │
│ ⚠️ Only approve if expecting support   │
│                                        │
│         [Reject]     [Approve (30 min)]│
└────────────────────────────────────────┘
```

## Security & Compliance

### Audit Logging

Every impersonation session is logged to `impersonation_audit_log`:

- Session created
- User approved/rejected
- Session started
- Pages viewed (optional)
- Actions taken (optional)
- Session ended

**View Audit Logs** (Admin only):
```sql
SELECT * FROM impersonation_audit_log
ORDER BY created_at DESC;
```

### Data Retention

- **Sessions**: Kept permanently for compliance
- **Audit Logs**: Kept permanently
- **Expired Requests**: Kept for reference

### User Privacy

- Users **must** approve every request
- Clear indicators when being viewed
- Sessions are time-limited
- All activity is logged
- Users can see who is viewing

### Admin Restrictions

- Only whitelisted emails can impersonate
- Cannot impersonate other admins (optional policy)
- All sessions logged and auditable
- Cannot hide from user

## Troubleshooting

### Issue: "User Not Found"

**Cause**: Email doesn't match any registered user
**Fix**:
- Check email spelling
- Ensure user has signed up
- User must have verified email

### Issue: Request Not Showing for User

**Cause**: Realtime not enabled or user not logged in
**Fix**:
- Enable Realtime on `impersonation_sessions` table
- User must be logged in to see request
- Check browser console for errors

### Issue: Status Changes Don't Work

**Cause**: RLS policies blocking updates
**Fix**:
- Run SQL from IMPERSONATION_DB_SETUP.md
- Check admin email in RLS policies
- Verify `create_impersonation_request` function exists

### Issue: "Failed to create impersonation request"

**Cause**: RLS policy or function missing
**Fix**:
```sql
-- Check if function exists
SELECT * FROM pg_proc WHERE proname = 'create_impersonation_request';

-- Check if admin email is whitelisted
SELECT auth.jwt()->>'email';
```

### Issue: Sessions Don't Auto-Expire

**Cause**: Cleanup functions not running
**Fix**:
- Set up cron jobs (Step 5 of database setup)
- Or manually call:
```sql
SELECT expire_impersonation_sessions();
```

## Technical Details

### Database Schema

**impersonation_sessions**
- Stores all impersonation requests and sessions
- Statuses: pending, approved, rejected, active, ended
- Auto-expires via PostgreSQL functions

**impersonation_audit_log**
- Immutable log of all actions
- Linked to session via foreign key
- Used for compliance and debugging

### Realtime Subscriptions

The system uses Supabase Realtime for instant notifications:

- **Admin**: Notified when user approves/rejects
- **User**: Notified when request is created
- **Both**: Notified when session ends

### RLS Policies

- Admins can only see their own requests
- Users can only see requests for them
- Users can only approve/reject their own requests
- Admins can only end their own sessions

## Best Practices

### For Admins

1. **Always provide a reason** - Helps users understand
2. **End sessions early** - Don't wait for timeout
3. **Respect privacy** - Only view what's necessary
4. **Document issues** - Take notes during session

### For Users

1. **Only approve expected support** - Don't approve random requests
2. **Watch the timer** - Know when session will end
3. **Ask questions** - Contact admin if unsure
4. **Report abuse** - Contact admin if suspicious

## Future Enhancements

Potential additions:
- [ ] Session recording/playback
- [ ] More granular permissions (view-only vs full access)
- [ ] User notification via email
- [ ] Admin comments/notes during session
- [ ] Page-level action logging
- [ ] Impersonation history dashboard
- [ ] User consent preferences

## Support

If you encounter issues:

1. Check this guide
2. Review `IMPERSONATION_DB_SETUP.md`
3. Check browser console for errors
4. Verify database setup
5. Check Supabase logs
6. Review audit logs for clues

## Summary

The User Impersonation system provides a **secure, auditable, user-approved** way for admins to help users by viewing their exact experience. It balances support needs with user privacy and security.

**Key Principle**: User consent is REQUIRED - no backdoor access.

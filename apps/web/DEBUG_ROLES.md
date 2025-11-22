# Debug Roles Issue

Run these commands in your browser console (F12) while on your app:

## 1. Check Authentication
```javascript
const { data } = await supabase.auth.getUser();
console.log('✅ User ID:', data.user?.id);
console.log('✅ User Email:', data.user?.email);
```

**Expected:** You should see your user ID and email.
**If you see null:** You're not logged in - that's the problem!

## 2. Try Manual Insert
```javascript
const { data, error } = await supabase
  .from('roles')
  .insert({
    user_id: (await supabase.auth.getUser()).data.user.id,
    title: 'Test Role',
    department: 'Engineering',
    location: 'Remote',
    employment_type: 'full-time',
    description: 'Test description',
    is_active: true
  })
  .select();

console.log('✅ Data:', data);
console.log('❌ Error:', error);
```

**Expected:** `data` should have your new role, `error` should be null.
**If error is not null:** That's your problem! Read the error message.

## 3. Try to Fetch Roles
```javascript
const { data, error } = await supabase
  .from('roles')
  .select('*');

console.log('✅ Roles found:', data);
console.log('❌ Error:', error);
```

**Expected:** Should show your roles (might be empty array if no roles yet).
**If error:** Read the error message - it will tell you what's wrong.

## 4. Check RLS Policies
```javascript
// This will try to fetch roles and show if RLS is blocking
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user ID:', user?.id);

const { data: roles, error } = await supabase
  .from('roles')
  .select('*')
  .eq('user_id', user?.id);

console.log('Your roles:', roles);
console.log('Error:', error);
```

## Common Error Messages:

### "new row violates row-level security policy"
**Problem:** RLS policies are blocking your insert.
**Fix:** Make sure you're logged in and the policies exist.

### "null value in column user_id violates not-null constraint"
**Problem:** `user_id` is not being set properly.
**Fix:** Check that `auth.uid()` returns a valid ID.

### "permission denied for table roles"
**Problem:** RLS is enabled but policies don't exist.
**Fix:** Re-run the DATABASE_SCHEMA.sql file.

## What to Report Back:

Send me:
1. The output of step 1 (authentication check)
2. Any error messages from steps 2-4
3. Screenshot of the Supabase **Logs** → **Postgres Logs** when you try to create a role

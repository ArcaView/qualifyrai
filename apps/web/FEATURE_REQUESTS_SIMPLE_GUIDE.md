# Feature Requests - Simple Setup Guide

Follow these steps to make your feature requests page work.

## Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com and log in
2. Click on your project (the one you created for Qualifyr.AI)
3. On the left sidebar, click the **SQL Editor** icon (looks like `</>`)
4. Click the **"+ New query"** button at the top

## Step 2: Create the Tables

Copy and paste this **entire code block** into the SQL editor, then click **RUN** (or press Ctrl+Enter):

```sql
-- Create feature_requests table
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0 NOT NULL,
  downvotes INTEGER DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON public.feature_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_requests_upvotes ON public.feature_requests(upvotes DESC);

-- Enable Row Level Security
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "Anyone can view feature requests"
  ON public.feature_requests
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to create (anonymous submissions)
CREATE POLICY "Anyone can create feature requests"
  ON public.feature_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Update timestamp automatically
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

You should see a green "Success" message.

## Step 3: Create the Votes Table

Click **"+ New query"** again, paste this code, and click **RUN**:

```sql
-- Create voting table
CREATE TABLE IF NOT EXISTS public.feature_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_fingerprint TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(feature_id, user_fingerprint)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_votes_feature_id ON public.feature_votes(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_votes_fingerprint ON public.feature_votes(user_fingerprint);

-- Enable Row Level Security
ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read, create, update, delete votes
CREATE POLICY "Anyone can view votes"
  ON public.feature_votes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create votes"
  ON public.feature_votes
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update votes"
  ON public.feature_votes
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Anyone can delete votes"
  ON public.feature_votes
  FOR DELETE
  TO public
  USING (true);
```

Again, you should see "Success".

## Step 4: Auto-Update Vote Counts

Click **"+ New query"** one more time, paste this, and click **RUN**:

```sql
-- Function to automatically update vote counts
CREATE OR REPLACE FUNCTION public.update_feature_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Adding a new vote
    IF NEW.vote_type = 'upvote' THEN
      UPDATE public.feature_requests SET upvotes = upvotes + 1 WHERE id = NEW.feature_id;
    ELSIF NEW.vote_type = 'downvote' THEN
      UPDATE public.feature_requests SET downvotes = downvotes + 1 WHERE id = NEW.feature_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- Removing a vote
    IF OLD.vote_type = 'upvote' THEN
      UPDATE public.feature_requests SET upvotes = upvotes - 1 WHERE id = OLD.feature_id;
    ELSIF OLD.vote_type = 'downvote' THEN
      UPDATE public.feature_requests SET downvotes = downvotes - 1 WHERE id = OLD.feature_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Changing vote from upvote to downvote or vice versa
    IF OLD.vote_type = 'upvote' THEN
      UPDATE public.feature_requests SET upvotes = upvotes - 1 WHERE id = OLD.feature_id;
    ELSIF OLD.vote_type = 'downvote' THEN
      UPDATE public.feature_requests SET downvotes = downvotes - 1 WHERE id = OLD.feature_id;
    END IF;

    IF NEW.vote_type = 'upvote' THEN
      UPDATE public.feature_requests SET upvotes = upvotes + 1 WHERE id = NEW.feature_id;
    ELSIF NEW.vote_type = 'downvote' THEN
      UPDATE public.feature_requests SET downvotes = downvotes + 1 WHERE id = NEW.feature_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run the function
CREATE TRIGGER update_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.feature_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feature_vote_counts();
```

## Step 5: Verify It Worked

1. In the left sidebar, click **"Table Editor"**
2. You should see two new tables:
   - `feature_requests`
   - `feature_votes`

If you see these tables, you're done! 🎉

## Step 6: Test It

1. Make sure your dev server is running:
   ```bash
   npm run dev
   ```

2. Open http://localhost:5173 in your browser

3. Click **"Feature Requests"** in the navigation

4. Click **"Submit Feature Request"**

5. Fill out the form and submit

6. You should see your request appear!

7. Try clicking the thumbs up/down buttons to vote

## Troubleshooting

**"Error loading feature requests"**
- Check your `.env.local` file has the correct Supabase URL and key
- Make sure you ran all 3 SQL queries above

**Can't submit a feature request**
- Refresh the page and try again
- Check the browser console (F12) for errors

**Votes not updating**
- Make sure you ran Step 4 (the trigger function)
- Refresh the page to see the updated counts

## What You Can Do Now

- ✅ Submit feature requests (anonymous or logged in)
- ✅ Upvote/downvote ideas
- ✅ Sort by popular, newest, or controversial
- ✅ Filter by status
- ✅ See vote counts in real-time

## Admin: Changing Status

To change a feature request status (e.g., from "pending" to "planned"):

1. Go to Supabase → **Table Editor** → `feature_requests`
2. Find the request you want to update
3. Click on the row
4. Change the **status** field to one of:
   - `pending`
   - `under_review`
   - `planned`
   - `in_progress`
   - `completed`
   - `declined`
5. Click **Save**

The status badge color will update automatically!

---

That's it! Your feature requests page is now fully functional. 🚀

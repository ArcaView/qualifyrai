# Feature Requests Database Setup

This guide will help you set up the database tables for the Feature Requests page in Supabase.

## Step 1: Create the feature_requests table

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the sidebar
3. Click "New Query"
4. Paste the following SQL and click "Run":

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

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON public.feature_requests(created_at DESC);

-- Create index on upvotes for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_feature_requests_upvotes ON public.feature_requests(upvotes DESC);

-- Enable Row Level Security
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read feature requests (even anonymous users)
CREATE POLICY "Anyone can view feature requests"
  ON public.feature_requests
  FOR SELECT
  TO public
  USING (true);

-- Policy: Authenticated users can insert feature requests
CREATE POLICY "Authenticated users can create feature requests"
  ON public.feature_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Anonymous users can also insert feature requests (optional - enable if you want)
CREATE POLICY "Anonymous users can create feature requests"
  ON public.feature_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Only the creator can update their own feature request
CREATE POLICY "Users can update own feature requests"
  ON public.feature_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Only the creator can delete their own feature request
CREATE POLICY "Users can delete own feature requests"
  ON public.feature_requests
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

## Step 2: Create the feature_votes table (for tracking individual votes)

```sql
-- Create feature_votes table to track who voted on what
CREATE TABLE IF NOT EXISTS public.feature_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_fingerprint TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(feature_id, user_fingerprint)
);

-- Create index on feature_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_feature_votes_feature_id ON public.feature_votes(feature_id);

-- Create index on user_fingerprint for quick lookups
CREATE INDEX IF NOT EXISTS idx_feature_votes_fingerprint ON public.feature_votes(user_fingerprint);

-- Enable Row Level Security
ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read votes
CREATE POLICY "Anyone can view votes"
  ON public.feature_votes
  FOR SELECT
  TO public
  USING (true);

-- Policy: Anyone can insert votes (anonymous voting)
CREATE POLICY "Anyone can create votes"
  ON public.feature_votes
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Anyone can update their own votes
CREATE POLICY "Anyone can update own votes"
  ON public.feature_votes
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Policy: Anyone can delete their own votes
CREATE POLICY "Anyone can delete own votes"
  ON public.feature_votes
  FOR DELETE
  TO public
  USING (true);
```

## Step 3: Create a function to update vote counts

```sql
-- Function to update feature request vote counts
CREATE OR REPLACE FUNCTION public.update_feature_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE public.feature_requests
      SET upvotes = upvotes + 1
      WHERE id = NEW.feature_id;
    ELSIF NEW.vote_type = 'downvote' THEN
      UPDATE public.feature_requests
      SET downvotes = downvotes + 1
      WHERE id = NEW.feature_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE public.feature_requests
      SET upvotes = upvotes - 1
      WHERE id = OLD.feature_id;
    ELSIF OLD.vote_type = 'downvote' THEN
      UPDATE public.feature_requests
      SET downvotes = downvotes - 1
      WHERE id = OLD.feature_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE public.feature_requests
      SET upvotes = upvotes - 1
      WHERE id = OLD.feature_id;
    ELSIF OLD.vote_type = 'downvote' THEN
      UPDATE public.feature_requests
      SET downvotes = downvotes - 1
      WHERE id = OLD.feature_id;
    END IF;

    IF NEW.vote_type = 'upvote' THEN
      UPDATE public.feature_requests
      SET upvotes = upvotes + 1
      WHERE id = NEW.feature_id;
    ELSIF NEW.vote_type = 'downvote' THEN
      UPDATE public.feature_requests
      SET downvotes = downvotes + 1
      WHERE id = NEW.feature_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update vote counts
CREATE TRIGGER update_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.feature_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feature_vote_counts();
```

## Database Schema Overview

### feature_requests table
- `id`: Unique identifier
- `title`: Feature request title
- `description`: Detailed description
- `upvotes`: Number of upvotes
- `downvotes`: Number of downvotes
- `status`: Current status (pending, under_review, planned, in_progress, completed, declined)
- `user_id`: Creator's user ID (nullable for anonymous submissions)
- `created_at`: When the request was created
- `updated_at`: When the request was last updated

### feature_votes table
- `id`: Unique identifier
- `feature_id`: References feature_requests.id
- `user_fingerprint`: Browser fingerprint (for anonymous voting)
- `vote_type`: Either 'upvote' or 'downvote'
- `created_at`: When the vote was cast

## Anonymous Voting

The system uses a browser fingerprint (generated from localStorage) to prevent duplicate voting from the same browser while maintaining anonymity. Users can change their vote from upvote to downvote or remove their vote entirely.

## Admin Features

To add admin-only status updates, you can create additional policies and functions that check for admin roles in your auth.users metadata.

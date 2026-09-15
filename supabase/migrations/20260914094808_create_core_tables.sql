/*
# Create core application tables

1. New Tables
- `profiles`: user profile info (id from auth.users, full_name, email, avatar_url, timestamps)
- `subscriptions`: plan info per user (plan, status, monthly limits, period dates)
- `searches`: search records (prompt, parsed_query, provider, status, limits, error info, timestamps)
- `usage`: usage tracking per user (type, amount, metadata, linked search)
- `businesses`: normalized business data from providers
- `search_results`: join table linking searches to businesses with scoring
- `provider_runs`: provider execution tracking

2. Security
- RLS enabled on ALL tables
- Owner-scoped policies: users can only access their own data
- businesses: scoped through search_results EXISTS subquery
- search_results: scoped through searches EXISTS subquery

3. Indexes on frequently queried columns

4. Trigger auto-creates profile + free subscription on signup
*/

-- Create all tables first
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  monthly_search_limit int NOT NULL DEFAULT 1,
  monthly_lead_limit int NOT NULL DEFAULT 20,
  period_start timestamptz DEFAULT now(),
  period_end timestamptz DEFAULT now() + interval '30 days',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  parsed_query jsonb,
  provider text NOT NULL DEFAULT 'apify',
  status text NOT NULL DEFAULT 'QUEUED',
  requested_result_limit int NOT NULL DEFAULT 25,
  result_count int NOT NULL DEFAULT 0,
  error_code text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  search_id uuid REFERENCES searches(id) ON DELETE SET NULL,
  type text NOT NULL,
  amount int NOT NULL DEFAULT 1,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_business_id text NOT NULL,
  name text NOT NULL,
  category text,
  address text,
  city text,
  state text,
  country text,
  latitude double precision,
  longitude double precision,
  phone text,
  email text,
  website text,
  rating double precision,
  review_count int,
  maps_url text,
  opening_hours jsonb,
  social_links jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider, provider_business_id)
);

CREATE TABLE IF NOT EXISTS search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  match_score int NOT NULL DEFAULT 0,
  qualified boolean NOT NULL DEFAULT false,
  qualification_reason text,
  opportunity_flags jsonb DEFAULT '[]',
  rank int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_run_id text,
  status text NOT NULL DEFAULT 'STARTED',
  requested_results int NOT NULL DEFAULT 0,
  received_results int NOT NULL DEFAULT 0,
  estimated_cost numeric(10,4),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_runs ENABLE ROW LEVEL SECURITY;

-- profiles policies
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- subscriptions policies
DROP POLICY IF EXISTS "select_own_subscription" ON subscriptions;
CREATE POLICY "select_own_subscription" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscription" ON subscriptions;
CREATE POLICY "insert_own_subscription" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_subscription" ON subscriptions;
CREATE POLICY "update_own_subscription" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- searches policies
DROP POLICY IF EXISTS "select_own_searches" ON searches;
CREATE POLICY "select_own_searches" ON searches FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_searches" ON searches;
CREATE POLICY "insert_own_searches" ON searches FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_searches" ON searches;
CREATE POLICY "update_own_searches" ON searches FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- usage policies
DROP POLICY IF EXISTS "select_own_usage" ON usage;
CREATE POLICY "select_own_usage" ON usage FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_usage" ON usage;
CREATE POLICY "insert_own_usage" ON usage FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_usage" ON usage;
CREATE POLICY "update_own_usage" ON usage FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- businesses policies (scoped through search_results)
DROP POLICY IF EXISTS "select_businesses_in_own_searches" ON businesses;
CREATE POLICY "select_businesses_in_own_searches" ON businesses FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM search_results
      JOIN searches ON searches.id = search_results.search_id
      WHERE search_results.business_id = businesses.id
      AND searches.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_businesses" ON businesses;
CREATE POLICY "insert_businesses" ON businesses FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_businesses" ON businesses;
CREATE POLICY "update_businesses" ON businesses FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- search_results policies (scoped through searches)
DROP POLICY IF EXISTS "select_own_search_results" ON search_results;
CREATE POLICY "select_own_search_results" ON search_results FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = search_results.search_id
      AND searches.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_search_results" ON search_results;
CREATE POLICY "insert_own_search_results" ON search_results FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = search_results.search_id
      AND searches.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_search_results" ON search_results;
CREATE POLICY "update_own_search_results" ON search_results FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = search_results.search_id
      AND searches.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches
      WHERE searches.id = search_results.search_id
      AND searches.user_id = auth.uid()
    )
  );

-- provider_runs policies
DROP POLICY IF EXISTS "select_own_provider_runs" ON provider_runs;
CREATE POLICY "select_own_provider_runs" ON provider_runs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_provider_runs" ON provider_runs;
CREATE POLICY "insert_own_provider_runs" ON provider_runs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_provider_runs" ON provider_runs;
CREATE POLICY "update_own_provider_runs" ON provider_runs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at);
CREATE INDEX IF NOT EXISTS idx_searches_status ON searches(status);
CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_created_at ON usage(created_at);
CREATE INDEX IF NOT EXISTS idx_businesses_provider_id ON businesses(provider, provider_business_id);
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_business_id ON search_results(business_id);
CREATE INDEX IF NOT EXISTS idx_provider_runs_external_run_id ON provider_runs(external_run_id);
CREATE INDEX IF NOT EXISTS idx_provider_runs_search_id ON provider_runs(search_id);

-- Trigger to auto-create profile + free subscription on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO subscriptions (user_id, plan, status, monthly_search_limit, monthly_lead_limit, period_start, period_end)
  VALUES (NEW.id, 'free', 'trial', 1, 20, now(), now() + interval '30 days')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

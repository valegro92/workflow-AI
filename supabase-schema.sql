-- ============================================
-- Workflow AI Analyzer - Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 2. COMPANIES TABLE
-- ============================================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  costo_orario NUMERIC,
  implementation_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_companies_user_id ON public.companies(user_id);

-- RLS Policies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own companies"
  ON public.companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies"
  ON public.companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies"
  ON public.companies FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. WORKFLOWS TABLE
-- ============================================
CREATE TABLE public.workflows (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fase TEXT NOT NULL,
  titolo TEXT NOT NULL,
  descrizione TEXT NOT NULL,
  tool TEXT[] DEFAULT '{}',
  input TEXT[] DEFAULT '{}',
  output TEXT[] DEFAULT '{}',
  tempo_medio INTEGER NOT NULL,
  frequenza INTEGER NOT NULL,
  tempo_totale INTEGER NOT NULL,
  pain_points TEXT DEFAULT '',
  pii BOOLEAN DEFAULT false,
  hitl BOOLEAN DEFAULT false,
  citazioni BOOLEAN DEFAULT false,
  owner TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflows_company_id ON public.workflows(company_id);

-- RLS Policies
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflows of own companies"
  ON public.workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = workflows.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workflows in own companies"
  ON public.workflows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = workflows.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update workflows in own companies"
  ON public.workflows FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = workflows.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete workflows in own companies"
  ON public.workflows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = workflows.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. EVALUATIONS TABLE
-- ============================================
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id TEXT NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  a1 INTEGER NOT NULL,
  a2 INTEGER NOT NULL,
  a3 INTEGER NOT NULL,
  a4 INTEGER NOT NULL,
  c1 INTEGER NOT NULL,
  c2 INTEGER NOT NULL,
  c3 INTEGER NOT NULL,
  c4 INTEGER NOT NULL,
  auto_score INTEGER NOT NULL,
  cog_score INTEGER NOT NULL,
  strategy_name TEXT NOT NULL,
  strategy_color TEXT NOT NULL,
  strategy_desc TEXT NOT NULL,
  impatto INTEGER NOT NULL,
  complessita INTEGER NOT NULL,
  priorita NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_evaluations_workflow_id ON public.evaluations(workflow_id);

-- RLS Policies
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evaluations of own workflows"
  ON public.evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows
      JOIN public.companies ON companies.id = workflows.company_id
      WHERE workflows.id = evaluations.workflow_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create evaluations for own workflows"
  ON public.evaluations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workflows
      JOIN public.companies ON companies.id = workflows.company_id
      WHERE workflows.id = evaluations.workflow_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update evaluations of own workflows"
  ON public.evaluations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows
      JOIN public.companies ON companies.id = workflows.company_id
      WHERE workflows.id = evaluations.workflow_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete evaluations of own workflows"
  ON public.evaluations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows
      JOIN public.companies ON companies.id = workflows.company_id
      WHERE workflows.id = evaluations.workflow_id
      AND companies.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. API USAGE TRACKING (for quota limits)
-- ============================================
CREATE TABLE public.api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at);

-- RLS Policies
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API usage"
  ON public.api_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage"
  ON public.api_usage FOR INSERT
  WITH CHECK (true); -- API functions will use service role

-- ============================================
-- 6. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. FUNCTION: Auto-create user profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, plan)
  VALUES (NEW.id, NEW.email, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 8. FUNCTION: Get usage counts for quota check
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_quota_usage(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plan TEXT;
  v_companies_count INTEGER;
  v_workflows_count INTEGER;
  v_audio_imports_count INTEGER;
  v_ai_compilations_count INTEGER;
BEGIN
  -- Get user plan
  SELECT plan INTO v_plan FROM public.users WHERE id = p_user_id;

  -- Count companies
  SELECT COUNT(*) INTO v_companies_count
  FROM public.companies
  WHERE user_id = p_user_id;

  -- Count total workflows across all companies
  SELECT COUNT(*) INTO v_workflows_count
  FROM public.workflows w
  JOIN public.companies c ON c.id = w.company_id
  WHERE c.user_id = p_user_id;

  -- Count audio imports this month
  SELECT COUNT(*) INTO v_audio_imports_count
  FROM public.api_usage
  WHERE user_id = p_user_id
    AND endpoint = 'process-audio'
    AND created_at >= DATE_TRUNC('month', NOW());

  -- Count AI compilations this month
  SELECT COUNT(*) INTO v_ai_compilations_count
  FROM public.api_usage
  WHERE user_id = p_user_id
    AND endpoint = 'ai-workflow-extract'
    AND created_at >= DATE_TRUNC('month', NOW());

  RETURN json_build_object(
    'plan', v_plan,
    'companies_count', v_companies_count,
    'workflows_count', v_workflows_count,
    'audio_imports_count', v_audio_imports_count,
    'ai_compilations_count', v_ai_compilations_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE! Schema ready for use
-- ============================================

-- Grant usage permissions (important!)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

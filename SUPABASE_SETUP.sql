-- ===================================
-- Workflow AI Analyzer - Supabase Schema
-- ===================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- 1. USERS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  plan VARCHAR(10) DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ===================================
-- 2. COMPANIES TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  costo_orario DECIMAL(10, 2),
  implementation_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

-- ===================================
-- 3. WORKFLOWS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fase VARCHAR(255) NOT NULL,
  titolo VARCHAR(255) NOT NULL,
  descrizione TEXT,
  tool TEXT[] DEFAULT '{}',
  input TEXT[] DEFAULT '{}',
  output TEXT[] DEFAULT '{}',
  tempo_medio INTEGER DEFAULT 0,
  frequenza INTEGER DEFAULT 0,
  tempo_totale INTEGER DEFAULT 0,
  pain_points TEXT,
  pii BOOLEAN DEFAULT FALSE,
  hitl BOOLEAN DEFAULT FALSE,
  citazioni BOOLEAN DEFAULT FALSE,
  owner VARCHAR(255),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on company_id for faster queries
CREATE INDEX IF NOT EXISTS idx_workflows_company_id ON workflows(company_id);

-- ===================================
-- 4. EVALUATIONS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  a1 INTEGER DEFAULT 0 CHECK (a1 BETWEEN 0 AND 10),
  a2 INTEGER DEFAULT 0 CHECK (a2 BETWEEN 0 AND 10),
  a3 INTEGER DEFAULT 0 CHECK (a3 BETWEEN 0 AND 10),
  a4 INTEGER DEFAULT 0 CHECK (a4 BETWEEN 0 AND 10),
  c1 INTEGER DEFAULT 0 CHECK (c1 BETWEEN 0 AND 10),
  c2 INTEGER DEFAULT 0 CHECK (c2 BETWEEN 0 AND 10),
  c3 INTEGER DEFAULT 0 CHECK (c3 BETWEEN 0 AND 10),
  c4 INTEGER DEFAULT 0 CHECK (c4 BETWEEN 0 AND 10),
  auto_score DECIMAL(5, 2) DEFAULT 0,
  cog_score DECIMAL(5, 2) DEFAULT 0,
  strategy_name VARCHAR(255),
  strategy_color VARCHAR(50),
  strategy_desc TEXT,
  impatto DECIMAL(5, 2) DEFAULT 0,
  complessita DECIMAL(5, 2) DEFAULT 0,
  priorita DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index to ensure one evaluation per workflow
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluations_workflow_id ON evaluations(workflow_id);

-- ===================================
-- 5. API_USAGE TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id and created_at for analytics
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id_created_at ON api_usage(user_id, created_at);

-- ===================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ===================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own user record
CREATE POLICY "Users can view own user data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own user data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can only access their own companies
CREATE POLICY "Users can view own companies" ON companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own companies" ON companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies" ON companies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies" ON companies
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only access workflows belonging to their companies
CREATE POLICY "Users can view own workflows" ON workflows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = workflows.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own workflows" ON workflows
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = workflows.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workflows" ON workflows
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = workflows.company_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own workflows" ON workflows
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = workflows.company_id
      AND companies.user_id = auth.uid()
    )
  );

-- Users can only access evaluations for their workflows
CREATE POLICY "Users can view own evaluations" ON evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN companies ON companies.id = workflows.company_id
      WHERE workflows.id = evaluations.workflow_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own evaluations" ON evaluations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN companies ON companies.id = workflows.company_id
      WHERE workflows.id = evaluations.workflow_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own evaluations" ON evaluations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN companies ON companies.id = workflows.company_id
      WHERE workflows.id = evaluations.workflow_id
      AND companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own evaluations" ON evaluations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workflows
      JOIN companies ON companies.id = workflows.company_id
      WHERE workflows.id = evaluations.workflow_id
      AND companies.user_id = auth.uid()
    )
  );

-- Users can only view their own API usage
CREATE POLICY "Users can view own api_usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_usage" ON api_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===================================
-- 7. FUNCTIONS AND TRIGGERS
-- ===================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- SETUP COMPLETE
-- ===================================

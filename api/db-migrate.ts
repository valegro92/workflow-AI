import { sql } from '../src/lib/db';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Database Migration Endpoint
 *
 * This endpoint creates all necessary tables for the application.
 * Run this ONCE after setting up Neon database.
 *
 * To run: POST to /api/db-migrate with header X-Migration-Secret
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Protect this endpoint
  const secret = req.headers['x-migration-secret'];
  if (secret !== process.env.MIGRATION_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        subscription_status TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // 2. Create companies table
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        costo_orario NUMERIC,
        implementation_plan TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Create index on user_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id)
    `;

    // 3. Create workflows table
    await sql`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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
      )
    `;

    // Create index on company_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_workflows_company_id ON workflows(company_id)
    `;

    // 4. Create evaluations table
    await sql`
      CREATE TABLE IF NOT EXISTS evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
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
      )
    `;

    // Create index on workflow_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_evaluations_workflow_id ON evaluations(workflow_id)
    `;

    // 5. Create api_usage table (for quota tracking)
    await sql`
      CREATE TABLE IF NOT EXISTS api_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Create indexes for quota queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at)
    `;

    // 6. Create trigger function for updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // 7. Create triggers for all tables
    await sql`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;

    await sql`
      DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
      CREATE TRIGGER update_companies_updated_at
      BEFORE UPDATE ON companies
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;

    await sql`
      DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
      CREATE TRIGGER update_workflows_updated_at
      BEFORE UPDATE ON workflows
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;

    await sql`
      DROP TRIGGER IF EXISTS update_evaluations_updated_at ON evaluations;
      CREATE TRIGGER update_evaluations_updated_at
      BEFORE UPDATE ON evaluations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;

    return res.status(200).json({
      success: true,
      message: 'Database migration completed successfully!',
      tables: ['users', 'companies', 'workflows', 'evaluations', 'api_usage']
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
}

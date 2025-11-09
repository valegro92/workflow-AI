import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
// NOTE: This file is used by backend API routes only, so we use SERVICE_ROLE_KEY
// for full database access. Frontend should use ANON_KEY with RLS policies.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set');
}

// Create Supabase client with service role key for backend operations
// This bypasses Row Level Security (RLS) policies - use with caution
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false, // Don't persist sessions in serverless functions
    autoRefreshToken: false,
  }
});

// Database Types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  plan: 'free' | 'pro';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Company {
  id: string;
  name: string;
  user_id: string;
  costo_orario?: number;
  implementation_plan?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbWorkflow {
  id: string;
  company_id: string;
  fase: string;
  titolo: string;
  descrizione: string;
  tool: string[];
  input: string[];
  output: string[];
  tempo_medio: number;
  frequenza: number;
  tempo_totale: number;
  pain_points: string;
  pii: boolean;
  hitl: boolean;
  citazioni: boolean;
  owner: string;
  note: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbEvaluation {
  id: string;
  workflow_id: string;
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  auto_score: number;
  cog_score: number;
  strategy_name: string;
  strategy_color: string;
  strategy_desc: string;
  impatto: number;
  complessita: number;
  priorita: number;
  created_at: Date;
  updated_at: Date;
}

export interface ApiUsage {
  id: string;
  user_id: string;
  endpoint: string;
  created_at: Date;
}

// Helper to check if tables exist
export async function tablesExist(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    return !error;
  } catch (error) {
    return false;
  }
}

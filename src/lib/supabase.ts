import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check .env.local file.'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types (will be auto-generated later from Supabase)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          plan: 'free' | 'pro';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          plan?: 'free' | 'pro';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          plan?: 'free' | 'pro';
          created_at?: string;
          updated_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      workflows: {
        Row: {
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          fase: string;
          titolo: string;
          descrizione: string;
          tool?: string[];
          input?: string[];
          output?: string[];
          tempo_medio: number;
          frequenza: number;
          tempo_totale: number;
          pain_points?: string;
          pii?: boolean;
          hitl?: boolean;
          citazioni?: boolean;
          owner?: string;
          note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          fase?: string;
          titolo?: string;
          descrizione?: string;
          tool?: string[];
          input?: string[];
          output?: string[];
          tempo_medio?: number;
          frequenza?: number;
          tempo_totale?: number;
          pain_points?: string;
          pii?: boolean;
          hitl?: boolean;
          citazioni?: boolean;
          owner?: string;
          note?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      evaluations: {
        Row: {
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          a1?: number;
          a2?: number;
          a3?: number;
          a4?: number;
          c1?: number;
          c2?: number;
          c3?: number;
          c4?: number;
          auto_score?: number;
          cog_score?: number;
          strategy_name?: string;
          strategy_color?: string;
          strategy_desc?: string;
          impatto?: number;
          complessita?: number;
          priorita?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

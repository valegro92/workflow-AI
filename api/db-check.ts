import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../src/lib/db';

/**
 * Database Health Check Endpoint
 * GET /api/db-check
 *
 * Verifica che il database sia configurato e accessibile
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Test database connection
    const result = await sql`SELECT NOW() as current_time`;

    // Check if tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const tableNames = tables.map((t: any) => t.table_name);
    const expectedTables = ['users', 'companies', 'workflows', 'evaluations', 'api_usage'];
    const missingTables = expectedTables.filter(t => !tableNames.includes(t));

    return res.status(200).json({
      success: true,
      message: 'Database connesso con successo!',
      connection: {
        status: 'connected',
        currentTime: result[0].current_time
      },
      tables: {
        found: tableNames,
        missing: missingTables,
        allPresent: missingTables.length === 0
      }
    });

  } catch (error: any) {
    console.error('Database check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Errore connessione database',
      details: error.message,
      hint: missingTablesHint(error.message)
    });
  }
}

function missingTablesHint(errorMessage: string): string {
  if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
    return 'Le tabelle non esistono ancora. Esegui POST /api/db-migrate per crearle.';
  }
  if (errorMessage.includes('DATABASE_URL')) {
    return 'Verifica che DATABASE_URL sia configurato in .env.local';
  }
  if (errorMessage.includes('connect')) {
    return 'Verifica che la connection string di Neon sia corretta';
  }
  return 'Controlla i log per maggiori dettagli';
}

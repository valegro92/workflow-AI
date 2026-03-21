import { sql } from '@vercel/postgres';

/**
 * Inizializza lo schema del database.
 * Crea la tabella user_data se non esiste.
 * Chiamata automaticamente al primo request.
 */
let schemaInitialized = false;

export async function initSchema(): Promise<void> {
  if (schemaInitialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS user_data (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      app_state JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Indice per ricerche per email
  await sql`
    CREATE INDEX IF NOT EXISTS idx_user_data_email ON user_data(email)
  `;

  schemaInitialized = true;
}

/**
 * Carica lo stato dell'app per un utente
 */
export async function getUserData(email: string): Promise<any | null> {
  await initSchema();

  const result = await sql`
    SELECT app_state FROM user_data WHERE email = ${email}
  `;

  if (result.rows.length === 0) return null;
  return result.rows[0].app_state;
}

/**
 * Salva lo stato dell'app per un utente (upsert)
 */
export async function saveUserData(email: string, appState: any): Promise<void> {
  await initSchema();

  await sql`
    INSERT INTO user_data (email, app_state, updated_at)
    VALUES (${email}, ${JSON.stringify(appState)}::jsonb, NOW())
    ON CONFLICT (email)
    DO UPDATE SET app_state = ${JSON.stringify(appState)}::jsonb, updated_at = NOW()
  `;
}

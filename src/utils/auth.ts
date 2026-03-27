/**
 * Auth Utilities (Client-Side)
 * Gestione token JWT e accesso riservato agli iscritti
 */

const TOKEN_KEY = 'workflow-ai-token';

/**
 * Decode un JWT senza libreria (solo payload base64)
 */
function decodeJwtPayload(token: string): { email: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verifica se un token JWT è valido (non scaduto)
 */
export function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return false;
  return payload.exp * 1000 > Date.now();
}

/**
 * Recupera il token salvato in localStorage
 */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Salva il token in localStorage
 */
export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error('Impossibile salvare il token:', e);
  }
}

/**
 * Rimuove il token e fa logout
 */
export function logout(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Controlla se l'utente è autenticato (token valido)
 */
export function isAuthenticated(): boolean {
  return isTokenValid(getStoredToken());
}

/**
 * Ritorna gli headers di autenticazione per le API
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Estrae l'email dell'utente dal JWT
 */
export function getUserEmail(): string | null {
  const token = getStoredToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.email || null;
}

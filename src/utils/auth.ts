/**
 * Auth Utilities (Client-Side)
 * Gestione token JWT e logica temporale paywall
 */

// Date di cutoff per il paywall
export const PAYWALL_DATE = new Date('2026-05-15T00:00:00');
export const GRACE_START = new Date('2026-05-08T00:00:00');

const TOKEN_KEY = 'workflow-ai-token';
const BANNER_DISMISSED_KEY = 'workflow-ai-banner-dismissed';

/**
 * Controlla se il paywall è attivo (dal 15 maggio 2026)
 */
export function isPaywallActive(): boolean {
  return new Date() >= PAYWALL_DATE;
}

/**
 * Controlla se siamo nel periodo di grazia (8-14 maggio 2026)
 * dove mostrare il banner di avviso
 */
export function isGracePeriod(): boolean {
  const now = new Date();
  return now >= GRACE_START && now < PAYWALL_DATE;
}

/**
 * Calcola i giorni rimanenti prima del paywall
 */
export function daysUntilPaywall(): number {
  const now = new Date();
  const diff = PAYWALL_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

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
 * Controlla se il banner è stato chiuso nella sessione corrente
 */
export function isBannerDismissed(): boolean {
  try {
    return sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Segna il banner come chiuso per questa sessione
 */
export function dismissBanner(): void {
  try {
    sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true');
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

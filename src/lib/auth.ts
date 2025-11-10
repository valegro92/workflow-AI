import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// JWT Secret (must be set in environment variables)
// Validate JWT_SECRET is set at module initialization
if (!process.env.JWT_SECRET) {
  throw new Error(
    'CRITICAL: JWT_SECRET environment variable is not set. ' +
    'The application cannot start without a secure JWT secret. ' +
    'Please set JWT_SECRET in your environment variables.'
  );
}

// Type assertion: we've verified JWT_SECRET exists above
const JWT_SECRET: string = process.env.JWT_SECRET;

export interface JwtPayload {
  userId: string;
  email: string;
  plan: 'free' | 'pro';
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a plain password with a hashed password
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Validate email format
 * Uses a basic but effective regex pattern
 */
export function isValidEmail(email: string): boolean {
  // More strict email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 max length
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}

/**
 * Get detailed password validation errors
 * Returns array of error messages, or empty array if valid
 */
export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Almeno 8 caratteri');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Almeno una lettera maiuscola');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Almeno una lettera minuscola');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Almeno un numero');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Almeno un carattere speciale (!@#$%^&*...)');
  }

  return errors;
}

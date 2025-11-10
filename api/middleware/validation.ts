import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Input Validation Middleware
 *
 * Provides utilities for validating and sanitizing request inputs.
 * Prevents injection attacks, XSS, and ensures data integrity.
 */

/**
 * Validation schema for request body fields
 */
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    arrayOf?: 'string' | 'number' | 'object';
    custom?: (value: any) => boolean;
    message?: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Sanitize string input to prevent XSS
 * Removes dangerous characters and patterns
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newline, tab, carriage return
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit consecutive whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Check if a value is a valid JSON object
 */
export function isValidJSON(value: any): boolean {
  try {
    JSON.parse(JSON.stringify(value));
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

/**
 * Validate a single field against a schema rule
 */
function validateField(
  field: string,
  value: any,
  rule: ValidationSchema[string]
): ValidationError | null {
  // Check if field is required
  if (rule.required && (value === undefined || value === null || value === '')) {
    return {
      field,
      message: rule.message || `${field} is required`,
      value
    };
  }

  // If field is optional and not provided, skip validation
  if (!rule.required && (value === undefined || value === null)) {
    return null;
  }

  // Type validation
  if (rule.type === 'string') {
    if (typeof value !== 'string') {
      return {
        field,
        message: rule.message || `${field} must be a string`,
        value: typeof value
      };
    }

    // String length validation
    if (rule.minLength && value.length < rule.minLength) {
      return {
        field,
        message: rule.message || `${field} must be at least ${rule.minLength} characters`,
        value: value.length
      };
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return {
        field,
        message: rule.message || `${field} must be at most ${rule.maxLength} characters`,
        value: value.length
      };
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      return {
        field,
        message: rule.message || `${field} has invalid format`,
        value
      };
    }
  }

  if (rule.type === 'number') {
    if (typeof value !== 'number' || isNaN(value)) {
      return {
        field,
        message: rule.message || `${field} must be a number`,
        value: typeof value
      };
    }

    // Number range validation
    if (rule.min !== undefined && value < rule.min) {
      return {
        field,
        message: rule.message || `${field} must be at least ${rule.min}`,
        value
      };
    }

    if (rule.max !== undefined && value > rule.max) {
      return {
        field,
        message: rule.message || `${field} must be at most ${rule.max}`,
        value
      };
    }
  }

  if (rule.type === 'boolean') {
    if (typeof value !== 'boolean') {
      return {
        field,
        message: rule.message || `${field} must be a boolean`,
        value: typeof value
      };
    }
  }

  if (rule.type === 'array') {
    if (!Array.isArray(value)) {
      return {
        field,
        message: rule.message || `${field} must be an array`,
        value: typeof value
      };
    }

    // Validate array item types
    if (rule.arrayOf) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        const itemType = typeof item;

        if (rule.arrayOf === 'object' && !isValidJSON(item)) {
          return {
            field,
            message: rule.message || `${field}[${i}] must be an object`,
            value: itemType
          };
        } else if (rule.arrayOf !== 'object' && itemType !== rule.arrayOf) {
          return {
            field,
            message: rule.message || `${field}[${i}] must be a ${rule.arrayOf}`,
            value: itemType
          };
        }
      }
    }

    // Array length validation
    if (rule.minLength && value.length < rule.minLength) {
      return {
        field,
        message: rule.message || `${field} must have at least ${rule.minLength} items`,
        value: value.length
      };
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return {
        field,
        message: rule.message || `${field} must have at most ${rule.maxLength} items`,
        value: value.length
      };
    }
  }

  if (rule.type === 'object') {
    if (!isValidJSON(value)) {
      return {
        field,
        message: rule.message || `${field} must be an object`,
        value: typeof value
      };
    }
  }

  // Custom validation
  if (rule.custom && !rule.custom(value)) {
    return {
      field,
      message: rule.message || `${field} failed custom validation`,
      value
    };
  }

  return null;
}

/**
 * Validate request body against a schema
 *
 * @param body - Request body to validate
 * @param schema - Validation schema
 * @returns Array of validation errors (empty if valid)
 */
export function validateBody(
  body: any,
  schema: ValidationSchema
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object') {
    return [{
      field: 'body',
      message: 'Request body must be a valid JSON object'
    }];
  }

  // Validate each field in schema
  for (const [field, rule] of Object.entries(schema)) {
    const error = validateField(field, body[field], rule);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

/**
 * Middleware wrapper that validates request body against schema
 *
 * @param schema - Validation schema
 * @param handler - API handler function
 * @returns Wrapped handler with validation
 */
export function withValidation(
  schema: ValidationSchema,
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Validate request body
    const errors = validateBody(req.body, schema);

    if (errors.length > 0) {
      console.warn('Validation errors:', errors);

      return res.status(400).json({
        error: 'Validation failed',
        details: errors.map(e => e.message),
        fields: errors.map(e => ({ field: e.field, message: e.message }))
      });
    }

    // Sanitize string fields
    for (const [field, rule] of Object.entries(schema)) {
      if (rule.type === 'string' && req.body[field]) {
        req.body[field] = sanitizeString(req.body[field]);
      }
    }

    return handler(req, res);
  };
}

/**
 * Check for common SQL injection patterns
 */
export function hasSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bOR\b|\bAND\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
    /UNION\s+SELECT/i,
    /;\s*DROP\s+TABLE/i,
    /;\s*DELETE\s+FROM/i,
    /;\s*UPDATE\s+/i,
    /;\s*INSERT\s+INTO/i,
    /--/,
    /\/\*/,
    /xp_/i,
    /sp_/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for common XSS patterns
 */
export function hasXSS(input: string): boolean {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onload=, etc.
    /<iframe/i,
    /<embed/i,
    /<object/i
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate that input doesn't contain dangerous patterns
 */
export function isSafeInput(input: string): boolean {
  return !hasSQLInjection(input) && !hasXSS(input);
}

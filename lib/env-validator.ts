/**
 * Environment Validation Module
 * Validates critical environment variables at startup
 * Fails fast in production if required variables are missing
 */

export interface EnvConfig {
  required: string[];
  recommended: string[];
  optional: string[];
}

const PRODUCTION_CONFIG: EnvConfig = {
  required: [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD_HASH',
    'NEXT_PUBLIC_APP_URL',
  ],
  recommended: [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXTAUTH_URL',
  ],
  optional: [
    'SMS_DEVICE_ID',
    'SMS_SECRET',
    'SMS_GATEWAY_URL',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'EMAIL_USER',
    'EMAIL_PASS',
  ],
};

const DEVELOPMENT_CONFIG: EnvConfig = {
  required: ['DATABASE_URL'],
  recommended: ['NEXTAUTH_SECRET', 'NEXT_PUBLIC_APP_URL'],
  optional: PRODUCTION_CONFIG.optional,
};

export type ValidationResult = {
  valid: boolean;
  missing: string[];
  warnings: string[];
  environment: 'production' | 'development';
};

export function validateEnvironment(): ValidationResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const config = isProduction ? PRODUCTION_CONFIG : DEVELOPMENT_CONFIG;
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const key of config.required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check recommended variables
  for (const key of config.recommended) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  // Production-specific checks
  if (isProduction) {
    // Validate URL formats
    if (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
      missing.push('NEXT_PUBLIC_APP_URL must be a domain, not localhost');
    }

    // Check for default/weak secrets
    if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
      warnings.push('NEXTAUTH_SECRET should be at least 32 characters');
    }

    if (process.env.ADMIN_PASSWORD_HASH?.includes('YourBcryptHashHere')) {
      missing.push('ADMIN_PASSWORD_HASH must be a valid bcrypt hash, not the placeholder');
    }
  }

  const result: ValidationResult = {
    valid: missing.length === 0,
    missing,
    warnings,
    environment: isProduction ? 'production' : 'development',
  };

  // Log results
  if (result.valid) {
    console.log(`[ENV_VALIDATION] ✓ Environment validated (${result.environment} mode)`);
    if (warnings.length > 0) {
      console.warn(`[ENV_VALIDATION] ⚠ Warnings for: ${warnings.join(', ')}`);
    }
  } else {
    console.error(`[ENV_VALIDATION] ✗ Missing required environment variables:`);
    for (const key of missing) {
      console.error(`[ENV_VALIDATION]   - ${key}`);
    }
    if (warnings.length > 0) {
      console.warn(`[ENV_VALIDATION] ⚠ Warnings for: ${warnings.join(', ')}`);
    }
  }

  return result;
}

/**
 * Throw an error if required environment variables are missing
 * Call this at application startup
 */
export function assertEnvironment(): void {
  const result = validateEnvironment();

  if (!result.valid && result.environment === 'production') {
    throw new Error(
      `[ENV_VALIDATION] Cannot start in production mode. Missing: ${result.missing.join(', ')}`
    );
  }
}

// Run validation on module load (will log but not throw in development)
validateEnvironment();

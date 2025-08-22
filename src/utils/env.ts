/**
 * Environment configuration and validation
 */

// Type for environment variables
interface EnvironmentConfig {
  // API Configuration
  API_BASE_URL: string;
  API_TIMEOUT: number;
  
  // App Configuration
  APP_ENV: 'development' | 'staging' | 'production';
  IS_DEV: boolean;
  IS_PROD: boolean;
  
  // Firebase Configuration
  FIREBASE: {
    API_KEY: string;
    AUTH_DOMAIN: string;
    PROJECT_ID: string;
    STORAGE_BUCKET: string;
    MESSAGING_SENDER_ID: string;
    APP_ID: string;
  };
  
  // Feature flags
  FEATURES: {
    DEBUG: boolean;
    DEBUG_API: boolean;
  };
}

// Helper function to get environment variable with fallback
function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Helper function to get boolean environment variable
function getBooleanEnv(key: string, fallback = false): boolean {
  const value = process.env[key];
  if (!value) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

// Helper function to get numeric environment variable
function getNumberEnv(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

// Environment configuration
export const env: EnvironmentConfig = {
  // API Configuration
  API_BASE_URL: getEnvVar('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:8080/api/v1'),
  API_TIMEOUT: getNumberEnv('NEXT_PUBLIC_API_TIMEOUT', 30000),
  
  // App Configuration
  APP_ENV: (process.env.NEXT_PUBLIC_APP_ENV as any) || 'development',
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
  
  // Firebase Configuration
  FIREBASE: {
    API_KEY: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', 'demo-api-key'),
    AUTH_DOMAIN: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'demo-project.firebaseapp.com'),
    PROJECT_ID: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'demo-project'),
    STORAGE_BUCKET: getEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'demo-project.appspot.com'),
    MESSAGING_SENDER_ID: getEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '123456789'),
    APP_ID: getEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', 'demo-app-id'),
  },
  
  // Feature flags
  FEATURES: {
    DEBUG: getBooleanEnv('NEXT_PUBLIC_DEBUG', true),
    DEBUG_API: getBooleanEnv('NEXT_PUBLIC_DEBUG_API', true),
  },
};

// Validation on module load
if (typeof window === 'undefined') {
  // Server-side validation
  console.log('🔧 Environment Configuration Loaded');
  console.log('API Base URL:', env.API_BASE_URL);
  console.log('Environment:', env.APP_ENV);
  console.log('Debug Mode:', env.FEATURES.DEBUG);
}

// Export individual pieces for convenience
export const {
  API_BASE_URL,
  API_TIMEOUT,
  APP_ENV,
  IS_DEV,
  IS_PROD,
  FIREBASE,
  FEATURES
} = env;
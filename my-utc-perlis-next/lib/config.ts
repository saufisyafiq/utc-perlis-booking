/**
 * Application configuration utilities
 * Handles environment variables with proper fallbacks and error handling
 */

export interface AppConfig {
  strapiApiUrl: string;
  siteUrl: string;
  nodeEnv: string;
}

/**
 * Get the Strapi API URL with fallback handling
 */
export function getStrapiApiUrl(): string {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL;
  
  if (!strapiUrl) {
    console.error('❌ NEXT_PUBLIC_STRAPI_API_URL is not defined!');
    console.error('Available environment variables:', {
      NEXT_PUBLIC_STRAPI_API_URL: process.env.NEXT_PUBLIC_STRAPI_API_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NODE_ENV: process.env.NODE_ENV,
      // Log all NEXT_PUBLIC_ variables for debugging
      ...Object.fromEntries(
        Object.entries(process.env)
          .filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
      )
    });
    
    // In development, provide a helpful error message
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        'NEXT_PUBLIC_STRAPI_API_URL is not defined. Please check your .env.local file.'
      );
    }
    
    // In production, log error but don't crash - let the component handle it
    return '';
  }
  
  return strapiUrl;
}

/**
 * Get the site URL with fallback
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || '';
}

/**
 * Get all app configuration
 */
export function getAppConfig(): AppConfig {
  return {
    strapiApiUrl: getStrapiApiUrl(),
    siteUrl: getSiteUrl(),
    nodeEnv: process.env.NODE_ENV || 'development'
  };
}

/**
 * Build a full Strapi API URL with proper error handling
 */
export function buildStrapiUrl(endpoint: string): string | null {
  const baseUrl = getStrapiApiUrl();
  
  if (!baseUrl) {
    return null;
  }
  
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  return `${baseUrl}/${cleanEndpoint}`;
}

/**
 * Build a Strapi media URL with proper error handling
 */
export function buildStrapiMediaUrl(mediaPath: string): string | null {
  const baseUrl = getStrapiApiUrl();
  
  if (!baseUrl || !mediaPath) {
    return null;
  }
  
  // mediaPath should already start with /uploads/
  return `${baseUrl}${mediaPath}`;
}

/**
 * Validate that all required environment variables are present
 */
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.NEXT_PUBLIC_STRAPI_API_URL) {
    errors.push('NEXT_PUBLIC_STRAPI_API_URL is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

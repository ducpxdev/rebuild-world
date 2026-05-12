/**
 * Security Configuration and Utilities for Frontend
 * Prevents accidental exposure of sensitive data
 */

/**
 * SECURITY RULES:
 * 1. NEVER hardcode API keys, tokens, or secrets
 * 2. NEVER expose tokens in localStorage (use httpOnly cookies instead)
 * 3. NEVER pass tokens through URL parameters
 * 4. NEVER log sensitive information to console in production
 * 5. NEVER send passwords to non-HTTPS URLs
 * 6. NEVER trust user input - always validate on backend
 */

// Allowed non-sensitive environment variables (must start with VITE_)
// Only these can be exposed to the frontend
const SAFE_ENV_VARS = [
  'VITE_API_BASE_URL',
  'VITE_APP_ENV',
  'VITE_ANALYTICS_ID',
];

// Forbidden variables that should NEVER be in frontend
const FORBIDDEN_ENV_VARS = [
  'VITE_JWT_SECRET',
  'VITE_API_KEY',
  'VITE_API_SECRET',
  'VITE_DATABASE_URL',
  'VITE_SESSION_SECRET',
  'VITE_STRIPE_SECRET_KEY',
  'VITE_SENDGRID_API_KEY',
];

/**
 * Validates that no sensitive environment variables are exposed
 */
export function validateEnvironmentSecurity() {
  const env = import.meta.env;
  
  for (const forbidden of FORBIDDEN_ENV_VARS) {
    if (forbidden in env) {
      console.error(`❌ SECURITY VIOLATION: ${forbidden} is exposed in frontend!`);
      if (import.meta.env.MODE === 'production') {
        throw new Error(`Sensitive environment variable exposed: ${forbidden}`);
      }
    }
  }
  
  for (const key in env) {
    if (key.startsWith('VITE_') && !SAFE_ENV_VARS.includes(key)) {
      console.warn(`⚠️ Non-standard environment variable: ${key}`);
    }
  }
}

/**
 * Secure console logging - disabled in production
 */
export const secureLog = {
  info: (message: string, ...args: any[]) => {
    if (import.meta.env.MODE !== 'production') {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (import.meta.env.MODE !== 'production') {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    if (import.meta.env.MODE === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  
  // NEVER log sensitive data
  error: (message: string, ...args: any[]) => {
    // Remove sensitive info from error messages
    const sanitized = sanitizeErrorMessage(message);
    console.error(`[ERROR] ${sanitized}`, ...args);
  }
};

/**
 * Sanitize error messages to remove sensitive data
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return '';
  
  return message
    // Remove URLs with sensitive info
    .replace(/https?:\/\/[^\s]+/g, '[REDACTED_URL]')
    // Remove email addresses
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[REDACTED_EMAIL]')
    // Remove potential API keys (long alphanumeric strings)
    .replace(/[\w]{32,}/g, '[REDACTED_TOKEN]')
    // Remove bearer tokens
    .replace(/Bearer\s+[\w.-]+/gi, 'Bearer [REDACTED_TOKEN]');
}

/**
 * SECURITY: Token Management
 * 
 * Tokens are now managed by httpOnly cookies set by the backend.
 * Frontend should NEVER:
 * - Store tokens in localStorage
 * - Store tokens in sessionStorage
 * - Store tokens in variables
 * - Pass tokens in URLs
 * 
 * Instead:
 * - Rely on automatic cookie sending with requests
 * - Use CSRF tokens for state-changing requests
 */
export function getTokenStatus(): boolean {
  // Frontend cannot access httpOnly cookies for security
  // Return authentication status based on API responses
  return true; // Backend will reject with 401 if not authenticated
}

/**
 * SECURITY: Detect accidental token exposure in localStorage
 */
export function checkForTokenLeaks() {
  const leakedTokens = [
    localStorage.getItem('token'),
    localStorage.getItem('jwt'),
    localStorage.getItem('auth_token'),
    sessionStorage.getItem('token'),
    sessionStorage.getItem('jwt'),
  ].filter(Boolean);
  
  if (leakedTokens.length > 0) {
    console.error('❌ SECURITY: Tokens found in storage! These should be in httpOnly cookies.');
    if (import.meta.env.MODE === 'production') {
      // Clear them immediately
      localStorage.clear();
      sessionStorage.clear();
    }
  }
}

/**
 * SECURITY: Remove tokens from URLs
 * Clean up any tokens that were passed through URL parameters
 */
export function cleanupTokensFromURL() {
  const params = new URLSearchParams(window.location.search);
  
  const tokenParams = ['token', 'jwt', 'access_token', 'auth_token'];
  let hasTokens = false;
  
  for (const param of tokenParams) {
    if (params.has(param)) {
      console.warn(`⚠️ SECURITY: Token found in URL parameter "${param}". This is insecure.`);
      params.delete(param);
      hasTokens = true;
    }
  }
  
  if (hasTokens) {
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, document.title, newUrl);
  }
}

/**
 * SECURITY: Detect common security headers
 */
export function checkSecurityHeaders() {
  const headers = {
    'Content-Security-Policy': 'Restricts resource loading',
    'X-Content-Type-Options': 'Prevents MIME-type sniffing',
    'X-Frame-Options': 'Prevents clickjacking',
    'X-XSS-Protection': 'Enables browser XSS filter',
    'Strict-Transport-Security': 'Enforces HTTPS',
    'Referrer-Policy': 'Controls referrer information',
  };
  
  if (import.meta.env.MODE === 'development') {
    secureLog.info('Security Headers Check:');
    for (const [header] of Object.entries(headers)) {
      const value = document.querySelector(`meta[http-equiv="${header}"]`)?.getAttribute('content');
      const status = value ? '✅' : '❌';
      console.info(`${status} ${header}`);
    }
  }
}

/**
 * SECURITY: Input sanitization
 * Prevents XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * SECURITY: Prevent form autofill of sensitive fields
 */
export function disableAutofillForSensitiveFields() {
  // This is handled in HTML via autocomplete="off"
  // But we can add additional runtime checks
  const sensitiveFields = document.querySelectorAll('[data-sensitive="true"]');
  sensitiveFields.forEach(field => {
    if (field instanceof HTMLInputElement) {
      field.setAttribute('autocomplete', 'off');
      field.setAttribute('readonly', 'readonly');
      
      // Re-enable on focus
      field.addEventListener('focus', () => {
        field.removeAttribute('readonly');
      });
      
      // Disable again on blur
      field.addEventListener('blur', () => {
        field.setAttribute('readonly', 'readonly');
      });
    }
  });
}

/**
 * SECURITY: Detect potential XSS attacks in data
 */
export function detectPotentialXSS(data: any): boolean {
  const xssPatterns = [
    /<script[^>]*>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];
  
  const stringData = JSON.stringify(data);
  
  for (const pattern of xssPatterns) {
    if (pattern.test(stringData)) {
      console.error('❌ SECURITY: Potential XSS attack detected in data');
      return true;
    }
  }
  
  return false;
}

/**
 * Initialize all security measures
 */
export function initializeSecurity() {
  if (typeof window === 'undefined') return;
  
  // Validate environment variables
  validateEnvironmentSecurity();
  
  // Clean up any exposed tokens
  checkForTokenLeaks();
  cleanupTokensFromURL();
  
  // Check security headers
  checkSecurityHeaders();
  
  // Disable autofill on sensitive fields
  disableAutofillForSensitiveFields();
  
  // Prevent right-click in production (optional, may impact UX)
  // if (import.meta.env.MODE === 'production') {
  //   document.addEventListener('contextmenu', e => e.preventDefault());
  // }
  
  secureLog.info('Security initialization complete');
}

import axios from 'axios';
import { secureLog } from './security';

/**
 * Axios API instance for secure communication with backend
 * 
 * SECURITY NOTES:
 * - Tokens are managed via httpOnly cookies (set by backend)
 * - Frontend does NOT handle tokens directly
 * - All credentials are sent automatically with requests
 * - CSRF tokens are included in headers for state-changing requests
 */

const api = axios.create({
  baseURL: '/api',
  // IMPORTANT: Include cookies in cross-origin requests
  withCredentials: true,
});

/**
 * Request interceptor
 * - Sets proper Content-Type headers
 * - Adds CSRF tokens for mutations
 * - Does NOT add Authorization headers (cookies handle this)
 */
api.interceptors.request.use((config) => {
  // Set Content-Type based on data type
  // FormData should not have a default Content-Type header (browser will set multipart/form-data)
  // JSON should have application/json
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  // Get CSRF token from meta tag (set by backend)
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() || '')) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  // SECURITY: Never expose tokens in logs
  secureLog.debug('API Request', {
    method: config.method,
    url: config.url,
    // Don't log the full config which might contain sensitive data
  });

  return config;
});

/**
 * Response interceptor
 * - Handles authentication errors
 * - Prevents accidental token exposure
 * - Handles rate limit errors
 */
api.interceptors.response.use(
  (res) => {
    // SECURITY: Never store tokens from response body
    if (res.data?.token) {
      secureLog.warn('Backend returned token in response. Tokens should be in httpOnly cookies.');
      delete res.data.token;
    }
    return res;
  },
  (err) => {
    // Handle rate limit errors (429)
    if (err.response?.status === 429) {
      secureLog.warn('Rate limit exceeded', {
        retryAfter: err.response?.data?.retryAfter
      });
      // Don't redirect - let the component handle it
      return Promise.reject(err);
    }

    // Handle authentication errors
    if (err.response?.status === 401 || err.response?.status === 403) {
      const isAuthRoute = err.config?.url?.startsWith('/auth/');
      if (!isAuthRoute) {
        secureLog.info('Authentication failed, redirecting to login');
        
        // SECURITY: Clear any stored tokens (they should use httpOnly cookies instead)
        localStorage.removeItem('token');
        localStorage.removeItem('jwt');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('token');
        
        // Redirect to login
        window.location.href = '/login';
      }
    }
    
    // SECURITY: Don't expose full error details in production
    if (import.meta.env.MODE === 'production' && err.response?.data) {
      // Log error on backend for debugging, but don't expose to user
      secureLog.warn('API Error', {
        status: err.response.status,
        // Don't log full response data which might contain sensitive info
      });
    }
    
    return Promise.reject(err);
  }
);

export default api;

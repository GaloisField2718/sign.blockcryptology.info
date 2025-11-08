// Backend API Configuration (PostgREST)
// In production, this should be set via environment variables
// Development: Direct access to PostgREST on port 3001
// Production: Via nginx proxy at /api
export const API_BASE_URL = 
  process.env.REACT_APP_API_BASE_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://sign.blockcryptology.info/api'
    : 'http://localhost:3001');

// SDK txspam.lol API Configuration
// Direct API access - CORS is handled by the backend
export const SDK_TXSPAM_API_URL = 
  process.env.REACT_APP_TXSPAM_API_URL || 
  'https://sdk.txspam.lol';

// Secret token for API authentication
// Note: This should be set via REACT_APP_SECRET_API_TOKEN in .env
// But since CORS is now handled by backend, the token might not be needed in frontend
// However, keeping it for potential future use or if backend requires it
export const SDK_TXSPAM_SECRET_TOKEN = process.env.REACT_APP_SECRET_API_TOKEN || '';

// Rate limiting configuration (calls per address per time window)
export const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
export const RATE_LIMIT_MAX_CALLS = 5; // Max 5 calls per minute per address


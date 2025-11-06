// Backend API Configuration (PostgREST)
// In production, this should be set via environment variables
// Development: Direct access to PostgREST on port 3001
// Production: Via nginx proxy at /api
export const API_BASE_URL = 
  process.env.REACT_APP_API_BASE_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://sign.blockcryptology.info/api'
    : 'http://localhost:3001');


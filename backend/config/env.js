const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];

function loadEnv() {
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }
  let supabaseUrl;
  try {
    supabaseUrl = new URL(process.env.SUPABASE_URL);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL.');
  }
  if (!['http:', 'https:'].includes(supabaseUrl.protocol)) {
    throw new Error('SUPABASE_URL must use HTTP or HTTPS.');
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  return {
    nodeEnv,
    port: Number(process.env.PORT || 8000),
    localDemoMode: process.env.LOCAL_DEMO_MODE === 'true',
    supabaseUrl: supabaseUrl.toString().replace(/\/$/, ''),
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    smsProvider: process.env.SMS_PROVIDER || (nodeEnv === 'development' ? 'console' : 'twilio'),
    smsApiKey: process.env.SMS_API_KEY || '',
    smsFrom: process.env.SMS_FROM || '',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8000',
    geocodingKey: process.env.GOOGLE_GEOCODING_KEY || ''
  };
}

module.exports = { loadEnv };

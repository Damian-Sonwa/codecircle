import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from server root directory
const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({path: envPath, override: true}); // override: true ensures .env takes precedence over system env

if (result.error) {
  console.warn('[env] Warning: Could not load .env file:', result.error.message);
  console.warn('[env] Attempting to load from process.cwd()...');
  dotenv.config({override: true}); // Fallback to default location
}

// Debug: Log if .env was loaded (but don't expose sensitive values)
if (process.env.MONGODB_URI) {
  const mongoUri = process.env.MONGODB_URI;
  // Mask credentials in log
  const maskedUri = mongoUri.replace(/(mongodb\+srv?:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
  console.log('[env] ✓ MONGODB_URI loaded:', maskedUri);
  
  // Warn if it looks like a different cluster than expected
  if (!mongoUri.includes('cluster0.1o3c3g9.mongodb.net') && !mongoUri.includes('cluster0.c2havli.mongodb.net')) {
    console.warn('[env] ⚠️  Warning: MONGODB_URI cluster does not match expected cluster');
  }
} else {
  console.warn('[env] ⚠ MONGODB_URI not found in environment variables');
}

if (process.env.NODE_ENV === 'test') {
  process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/test-chat';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
}

const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET!,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  redisUrl: process.env.REDIS_URL,
  uploadBucket: process.env.UPLOAD_BUCKET,
  uploadRegion: process.env.UPLOAD_REGION ?? 'us-east-1',
  uploadEndpoint: process.env.UPLOAD_ENDPOINT,
  uploadAccessKey: process.env.UPLOAD_ACCESS_KEY,
  uploadSecretKey: process.env.UPLOAD_SECRET_KEY
};


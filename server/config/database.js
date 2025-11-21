// server/config/db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables relative to the server directory
dotenv.config({ path: join(__dirname, '../.env') });

// Check for MONGO_URI or MONGODB_URI (both are common)
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

// Validate environment variable
if (!mongoUri) {
  console.error('❌ MONGO_URI or MONGODB_URI not found in .env file');
  console.error('Please set one of these in server/.env:');
  console.error('  MONGO_URI=mongodb+srv://...');
  console.error('  or');
  console.error('  MONGODB_URI=mongodb+srv://...');
  process.exit(1);
}

console.log('🔄 Connecting to MongoDB...');
console.log('📍 Connection string:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials

const connectionOptions = {
  serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  retryWrites: true,
  w: 'majority',
};

// Extract dbName from URI if present, otherwise use default
const uriMatch = mongoUri.match(/mongodb\+srv:\/\/[^/]+\/([^?]+)/);
const dbName = uriMatch ? uriMatch[1] : 'chaturway001';

mongoose.connect(mongoUri, {
  ...connectionOptions,
  dbName: dbName,
})
  .then(() => {
    console.log(`✅ Connected to MongoDB → ${mongoose.connection.name}`);
    console.log(`📍 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`📍 Host: ${mongoose.connection.host}`);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('\n🔍 Troubleshooting steps:');
    console.error('1. Check IP whitelist in MongoDB Atlas:');
    console.error('   - Go to: https://cloud.mongodb.com → Network Access');
    console.error('   - Add your current IP or use 0.0.0.0/0 (less secure, for development)');
    console.error('2. Verify connection string in server/.env');
    console.error('3. Check MongoDB Atlas cluster status');
    console.error('4. Verify username/password are correct');
    console.error('\n⚠️  Server will start anyway, but database features may be unavailable');
  });

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

export default mongoose;

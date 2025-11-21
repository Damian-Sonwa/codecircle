// server/config/db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables relative to the server directory
dotenv.config({ path: join(__dirname, '../.env') });

// Validate environment variable
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env file');
  process.exit(1);
}

console.log('🔄 Connecting to MongoDB...');

mongoose.connect(process.env.MONGO_URI, {
  dbName: 'chaturway001',
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
})
  .then(() => {
    console.log(`✅ Connected to MongoDB → ${mongoose.connection.name}`);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('Check: IP whitelist, credentials, or cluster status in MongoDB Atlas');
    console.warn('⚠️  Server will start anyway, but database features may be unavailable');
  });

export default mongoose;

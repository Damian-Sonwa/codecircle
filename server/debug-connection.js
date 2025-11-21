import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Debugging MongoDB Connection...\n');
console.log('='.repeat(60));

// Check if .env file exists
const envPath = `${__dirname}/.env`;
console.log('\n1️⃣ Checking .env file...');
if (existsSync(envPath)) {
  console.log('   ✅ .env file found at:', envPath);
} else {
  console.log('   ❌ .env file NOT found at:', envPath);
  console.log('   💡 Creating .env.example for reference...');
}

// Load environment variables
dotenv.config();

console.log('\n2️⃣ Checking Environment Variables...');
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (MONGO_URI) {
  console.log('   ✅ MONGO_URI found in environment');
  // Hide password in output
  const uriMasked = MONGO_URI.replace(/:[^:@]+@/, ':***@');
  console.log('   📝 Connection string:', uriMasked);
} else {
  console.log('   ❌ MONGO_URI not found in environment');
  console.log('   💡 Make sure your .env file contains: MONGO_URI=...');
}

console.log('\n3️⃣ Testing MongoDB Connection...');
console.log('   Attempting to connect...\n');

const testUri = MONGO_URI || 'mongodb+srv://madudamian25_db_user:sopulu@cluster0.1o3c3g9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

console.log('\n📝 Connection Details:');
if (MONGO_URI) {
  const uriParts = MONGO_URI.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)/);
  if (uriParts) {
    console.log(`   Username: ${uriParts[1]}`);
    console.log(`   Cluster: ${uriParts[3]}`);
  }
} else {
  console.log('   Using default connection string (no .env file found)');
}

mongoose.connect(testUri, {
  dbName: 'chaturway001',
  serverSelectionTimeoutMS: 20000, // Increase timeout
  socketTimeoutMS: 45000,
  connectTimeoutMS: 20000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority',
})
  .then(async () => {
    console.log('✅ Connection successful!\n');
    console.log('📊 Connection Details:');
    console.log(`   Database: ${mongoose.connection.db.databaseName}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   State: ${mongoose.connection.readyState} (1 = connected)`);
    console.log(`   Client: ${mongoose.connection.client ? 'Yes' : 'No'}`);
    
    // Test query
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`\n📁 Collections: ${collections.length}`);
      collections.forEach(c => console.log(`   - ${c.name}`));
    } catch (err) {
      console.log('   ⚠️  Could not list collections:', err.message);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Connection failed!\n');
    console.error('Error Details:');
    console.error(`   Name: ${err.name}`);
    console.error(`   Message: ${err.message}`);
    console.error(`   Code: ${err.code}`);
    
    if (err.name === 'MongoServerSelectionError') {
      console.error('\n🔧 Possible Issues:');
      console.error('   1. IP Address not whitelisted in MongoDB Atlas');
      console.error('      Solution: Add 0.0.0.0/0 to Network Access in MongoDB Atlas');
      console.error('   2. Incorrect credentials');
      console.error('      Solution: Check username and password in connection string');
      console.error('   3. Cluster is paused');
      console.error('      Solution: Resume cluster in MongoDB Atlas');
    } else if (err.code === 'ETIMEOUT' || err.code === 'ENOTFOUND') {
      console.error('\n🔧 Network Issue:');
      console.error('   1. Check internet connection');
      console.error('   2. DNS resolution failed - try again');
      console.error('   3. Firewall blocking connection');
    }
    
    console.error('\n   Full error:', err);
    process.exit(1);
  });


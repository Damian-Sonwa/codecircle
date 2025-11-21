import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Use the connection string you provided
const MONGO_URI = process.env.MONGO_URI || 
                  process.env.MONGODB_URI || 
                  'mongodb+srv://madudamian25_db_user:sopulu@cluster0.1o3c3g9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔍 Simple Connection Test\n');
console.log('Connecting to:', MONGO_URI.replace(/:[^:@]+@/, ':***@'));
console.log('Database: chaturway001\n');

mongoose.connect(MONGO_URI, {
  dbName: 'chaturway001',
})
  .then(() => {
    console.log('✅ SUCCESS! Connected to MongoDB');
    console.log(`   Database: ${mongoose.connection.db.databaseName}`);
    console.log(`   Ready State: ${mongoose.connection.readyState}`);
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ FAILED:', err.message);
    console.error('\nCheck:');
    console.error('1. Internet connection');
    console.error('2. MongoDB Atlas IP whitelist (0.0.0.0/0)');
    console.error('3. Cluster is running');
    process.exit(1);
  });






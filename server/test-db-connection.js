import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Support multiple environment variable names - MONGODB_URI takes priority
const MONGO_URI = process.env.MONGODB_URI ||
                  process.env.MONGO_URI ||
                  'mongodb+srv://madudamian25_db_user:sopulu@cluster0.1o3c3g9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

console.log('Testing MongoDB connection...\n');

mongoose.connect(MONGO_URI, {
  dbName: 'chaturway001',
})
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    console.log('📊 Database Info:');
    console.log(`   Name: ${mongoose.connection.db.databaseName}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Ready State: ${mongoose.connection.readyState} (1 = connected)`);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📁 Collections in database (${collections.length}):`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Test completed. Connection closed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Connection failed:');
    console.error(error.message);
    process.exit(1);
  });

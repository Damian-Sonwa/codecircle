import mongoose from 'mongoose';
import {env} from './env';

mongoose.set('strictQuery', true);

export const connectDatabase = async () => {
  try {
    // Validate MongoDB URI exists
    if (!env.mongoUri) {
      throw new Error('MONGODB_URI is missing from environment variables. Check your .env file.');
    }

    // Debug: Log connection attempt (mask credentials)
    const maskedUri = env.mongoUri.replace(/(mongodb\+srv?:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
    console.log('[database] 🔄 Connecting to MongoDB...');
    console.log('[database] URI:', maskedUri);

    // Connection options
    const options: mongoose.ConnectOptions = {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    // Add database name if specified
    if (process.env.MONGODB_DB) {
      options.dbName = process.env.MONGODB_DB;
    }

    // Attempt connection
    const conn = await mongoose.connect(env.mongoUri, options);

    // Success logging
    console.log('[database] ✅ MongoDB Connected Successfully!');
    console.log('[database] Host:', conn.connection.host);
    console.log('[database] Database:', conn.connection.name);
    console.log('[database] Ready State:', conn.connection.readyState === 1 ? 'Connected' : 'Disconnected');

    // Connection event listeners for better debugging
    mongoose.connection.on('error', (err) => {
      console.error('[database] ❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[database] ⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[database] 🔄 MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('[database] ❌ MongoDB connection failed');
    console.error('[database] Error details:', error instanceof Error ? error.message : error);
    
    if (error instanceof Error) {
      console.error('[database] Stack trace:', error.stack);
      
      // Provide helpful error messages
      if (error.message.includes('authentication failed')) {
        console.error('[database] 💡 Authentication failed. Check:');
        console.error('   - Username and password in connection string');
        console.error('   - IP whitelist in MongoDB Atlas (if using Atlas)');
        console.error('   - MongoDB user permissions');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error('[database] 💡 Connection refused. Check:');
        console.error('   - MongoDB service is running');
        console.error('   - Connection string host and port are correct');
      } else if (error.message.includes('timeout')) {
        console.error('[database] 💡 Connection timeout. Check:');
        console.error('   - Network connectivity');
        console.error('   - Firewall settings');
        console.error('   - MongoDB server is accessible');
      }
    }
    
    throw error;
  }
};

export const disconnectDatabase = async () => {
  await mongoose.disconnect();
};



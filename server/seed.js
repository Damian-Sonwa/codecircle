import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Room from './models/Room.js';
import PrivateChat from './models/PrivateChat.js';

dotenv.config();

// Connection string - use the cluster you specified
const MONGO_URI = process.env.MONGODB_URI || 
                  process.env.MONGO_URI || 
                  'mongodb+srv://madudamian25_db_user:sopulu@cluster0.1o3c3g9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Extract cluster name for display
const clusterMatch = MONGO_URI.match(/@([^/]+)/);
const clusterName = clusterMatch ? clusterMatch[1] : 'unknown';

console.log('📝 Seeding Database:');
console.log(`   Cluster: ${clusterName}`);
console.log(`   Database: chaturway001`);
console.log(`   Username: madudamian25_db_user\n`);

// Helper function to generate random ID
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding for chaturway001...\n');
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB with retry logic
    let connected = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!connected && attempts < maxAttempts) {
      try {
        attempts++;
        if (attempts > 1) {
          console.log(`   Retry attempt ${attempts}/${maxAttempts}...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        await mongoose.connect(MONGO_URI, {
          dbName: 'chaturway001',
          serverSelectionTimeoutMS: 30000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 30000,
        });
        connected = true;
      } catch (err) {
        if (attempts >= maxAttempts) {
          throw err;
        }
        console.log(`   Attempt ${attempts} failed: ${err.message}`);
      }
    }
    
    console.log('✅ Connected to MongoDB');
    console.log(`   Database: ${mongoose.connection.db.databaseName}\n`);
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    const userDeleteResult = await User.deleteMany({});
    const roomDeleteResult = await Room.deleteMany({});
    const chatDeleteResult = await PrivateChat.deleteMany({});
    console.log(`   ✅ Deleted ${userDeleteResult.deletedCount} users`);
    console.log(`   ✅ Deleted ${roomDeleteResult.deletedCount} rooms`);
    console.log(`   ✅ Deleted ${chatDeleteResult.deletedCount} private chats\n`);
    
    // Create sample users
    console.log('👥 Creating sample users...');
    const users = [
      {
        userId: generateId(),
        username: 'john_doe',
        password: 'password123',
        online: false,
        lastSeen: new Date(),
      },
      {
        userId: generateId(),
        username: 'jane_smith',
        password: 'password123',
        online: true,
        lastSeen: new Date(),
      },
      {
        userId: generateId(),
        username: 'alice_wonder',
        password: 'password123',
        online: false,
        lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        userId: generateId(),
        username: 'bob_marley',
        password: 'password123',
        online: true,
        lastSeen: new Date(),
      },
      {
        userId: generateId(),
        username: 'emma_stone',
        password: 'password123',
        online: false,
        lastSeen: new Date(Date.now() - 7200000), // 2 hours ago
      },
    ];
    
    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} users:`);
    createdUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.online ? '🟢 Online' : '⚫ Offline'}) - ID: ${user.userId}`);
    });
    console.log('');
    
    // Create sample rooms
    console.log('🏠 Creating sample chat rooms...');
    const rooms = [
      {
        roomId: generateId(),
        name: 'General',
        createdBy: createdUsers[0].userId,
        members: [createdUsers[0].userId, createdUsers[1].userId, createdUsers[2].userId, createdUsers[3].userId],
        messages: [
          {
            messageId: generateId(),
            userId: createdUsers[0].userId,
            username: createdUsers[0].username,
            message: 'Welcome to the General room! 👋 Everyone feel free to chat here.',
            timestamp: new Date(Date.now() - 3600000),
            reactions: {},
            readBy: [createdUsers[0].userId, createdUsers[1].userId],
          },
          {
            messageId: generateId(),
            userId: createdUsers[1].userId,
            username: createdUsers[1].username,
            message: 'Thanks! Great to be here 🎉',
            timestamp: new Date(Date.now() - 3300000),
            reactions: { '🎉': [createdUsers[0].userId] },
            readBy: [createdUsers[1].userId, createdUsers[0].userId],
          },
          {
            messageId: generateId(),
            userId: createdUsers[2].userId,
            username: createdUsers[2].username,
            message: 'Hey everyone! 👀',
            timestamp: new Date(Date.now() - 3000000),
            reactions: { '👋': [createdUsers[1].userId] },
            readBy: [createdUsers[2].userId, createdUsers[1].userId],
          },
        ],
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        roomId: generateId(),
        name: 'Random',
        createdBy: createdUsers[1].userId,
        members: [createdUsers[1].userId, createdUsers[2].userId, createdUsers[3].userId],
        messages: [
          {
            messageId: generateId(),
            userId: createdUsers[1].userId,
            username: createdUsers[1].username,
            message: 'This is the Random chat room! 🔥',
            timestamp: new Date(Date.now() - 1800000),
            reactions: {},
            readBy: [createdUsers[1].userId],
          },
          {
            messageId: generateId(),
            userId: createdUsers[3].userId,
            username: createdUsers[3].username,
            message: 'Love this room! 😎',
            timestamp: new Date(Date.now() - 1500000),
            reactions: { '❤️': [createdUsers[1].userId], '🔥': [createdUsers[1].userId] },
            readBy: [createdUsers[3].userId, createdUsers[1].userId],
          },
        ],
        createdAt: new Date(Date.now() - 1800000),
      },
      {
        roomId: generateId(),
        name: 'Tech Discussion',
        createdBy: createdUsers[2].userId,
        members: [createdUsers[2].userId, createdUsers[0].userId, createdUsers[4].userId],
        messages: [
          {
            messageId: generateId(),
            userId: createdUsers[2].userId,
            username: createdUsers[2].username,
            message: 'Welcome to Tech Discussion! 💻 Let\'s talk about technology.',
            timestamp: new Date(Date.now() - 900000),
            reactions: {},
            readBy: [createdUsers[2].userId],
          },
        ],
        createdAt: new Date(Date.now() - 900000),
      },
      {
        roomId: generateId(),
        name: 'Gaming',
        createdBy: createdUsers[3].userId,
        members: [createdUsers[3].userId, createdUsers[1].userId],
        messages: [],
        createdAt: new Date(),
      },
    ];
    
    const createdRooms = await Room.insertMany(rooms);
    console.log(`✅ Created ${createdRooms.length} rooms:`);
    createdRooms.forEach((room, index) => {
      console.log(`   ${index + 1}. ${room.name} - ${room.members.length} members, ${room.messages.length} messages`);
    });
    console.log('');
    
    // Create sample private chats
    console.log('💬 Creating sample private chats...');
    const getChatId = (userId1, userId2) => {
      return [userId1, userId2].sort().join('-');
    };
    
    const privateChats = [
      {
        chatId: getChatId(createdUsers[0].userId, createdUsers[1].userId),
        participants: [createdUsers[0].userId, createdUsers[1].userId],
        messages: [
          {
            messageId: generateId(),
            userId: createdUsers[0].userId,
            username: createdUsers[0].username,
            message: 'Hey! How are you? 😊',
            timestamp: new Date(Date.now() - 7200000), // 2 hours ago
            reactions: {},
            readBy: [createdUsers[0].userId, createdUsers[1].userId],
          },
          {
            messageId: generateId(),
            userId: createdUsers[1].userId,
            username: createdUsers[1].username,
            message: 'I\'m doing great! Thanks for asking! 💚',
            timestamp: new Date(Date.now() - 6900000),
            reactions: { '❤️': [createdUsers[0].userId] },
            readBy: [createdUsers[1].userId, createdUsers[0].userId],
          },
          {
            messageId: generateId(),
            userId: createdUsers[0].userId,
            username: createdUsers[0].username,
            message: 'That\'s awesome! Let\'s catch up soon 🎯',
            timestamp: new Date(Date.now() - 6600000),
            reactions: {},
            readBy: [createdUsers[0].userId, createdUsers[1].userId],
          },
        ],
        createdAt: new Date(Date.now() - 7200000),
        updatedAt: new Date(Date.now() - 6600000),
      },
      {
        chatId: getChatId(createdUsers[2].userId, createdUsers[3].userId),
        participants: [createdUsers[2].userId, createdUsers[3].userId],
        messages: [
          {
            messageId: generateId(),
            userId: createdUsers[2].userId,
            username: createdUsers[2].username,
            message: 'Hello! ✨',
            timestamp: new Date(Date.now() - 900000), // 15 minutes ago
            reactions: {},
            readBy: [createdUsers[2].userId],
          },
          {
            messageId: generateId(),
            userId: createdUsers[3].userId,
            username: createdUsers[3].username,
            message: 'Hi there! 👋',
            timestamp: new Date(Date.now() - 840000),
            reactions: { '👋': [createdUsers[2].userId] },
            readBy: [createdUsers[3].userId],
          },
        ],
        createdAt: new Date(Date.now() - 900000),
        updatedAt: new Date(Date.now() - 840000),
      },
      {
        chatId: getChatId(createdUsers[1].userId, createdUsers[4].userId),
        participants: [createdUsers[1].userId, createdUsers[4].userId],
        messages: [
          {
            messageId: generateId(),
            userId: createdUsers[1].userId,
            username: createdUsers[1].username,
            message: 'Hey Emma! Long time no see 😄',
            timestamp: new Date(Date.now() - 3600000),
            reactions: {},
            readBy: [createdUsers[1].userId],
          },
        ],
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(Date.now() - 3600000),
      },
    ];
    
    const createdChats = await PrivateChat.insertMany(privateChats);
    console.log(`✅ Created ${createdChats.length} private chats:`);
    createdChats.forEach((chat, index) => {
      const participants = chat.participants.map(p => {
        const user = createdUsers.find(u => u.userId === p);
        return user ? user.username : 'Unknown';
      });
      console.log(`   ${index + 1}. ${participants.join(' ↔ ')} - ${chat.messages.length} messages`);
    });
    console.log('');
    
    // Verify collections were created
    console.log('📁 Verifying collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   ✅ Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`      - ${col.name}`);
    });
    console.log('');
    
    // Summary
    console.log('='.repeat(60));
    console.log('📊 SEED SUMMARY');
    console.log('='.repeat(60));
    console.log(`   👥 Users Created: ${createdUsers.length}`);
    console.log(`   🏠 Rooms Created: ${createdRooms.length}`);
    console.log(`   💬 Private Chats Created: ${createdChats.length}`);
    
    const totalMessages = createdRooms.reduce((sum, r) => sum + r.messages.length, 0) + 
                          createdChats.reduce((sum, c) => sum + c.messages.length, 0);
    console.log(`   💌 Total Messages: ${totalMessages}`);
    console.log('');
    console.log('📝 Login Credentials (all use password: password123):');
    createdUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username}`);
    });
    console.log('');
    console.log('✅ Database seeding completed successfully!');
    console.log('='.repeat(60));
    
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error seeding database:');
    console.error(`   ${error.name}: ${error.message}`);
    
    if (error.code === 'ETIMEOUT' || error.code === 'ENOTFOUND') {
      console.error('\n💡 Connection Issue:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify MongoDB Atlas IP whitelist (allow 0.0.0.0/0)');
      console.error('   3. Ensure cluster is running');
    }
    
    console.error('\n   Full error:', error);
    
    try {
      await mongoose.connection.close();
    } catch (e) {
      // Ignore close errors
    }
    process.exit(1);
  }
};

// Run seed
seedData();

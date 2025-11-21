# Database Seeding Instructions

## Current Status
The database seeding is encountering connection issues. Here's how to fix:

## Steps to Seed Database `chaturway001`

### 1. Ensure MongoDB Atlas is Configured
- Go to MongoDB Atlas → Network Access
- Add IP: `0.0.0.0/0` (allows all IPs)
- Wait 2-3 minutes after adding

### 2. Verify Connection String
Your `.env` file in `server/` should have:
```env
MONGO_URI=mongodb+srv://madudamian25_db_user:sopulu@cluster0.1o3c3g9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

### 3. Run Seed Script
```bash
cd server
npm run seed
```

## What Will Be Created

### Collections:
- `users` - User accounts
- `rooms` - Chat rooms
- `privatechats` - Private conversations

### Sample Data:
- **5 Users:**
  - john_doe
  - jane_smith
  - alice_wonder
  - bob_marley
  - emma_stone
  - Password for all: `password123`

- **4 Chat Rooms:**
  - General (with 3 messages)
  - Random (with 2 messages)
  - Tech Discussion (with 1 message)
  - Gaming (empty, ready for messages)

- **3 Private Chats:**
  - john_doe ↔ jane_smith (3 messages)
  - alice_wonder ↔ bob_marley (2 messages)
  - jane_smith ↔ emma_stone (1 message)

## Manual Seeding Alternative

If the script fails due to connection issues, you can also seed manually through MongoDB Atlas:
1. Go to MongoDB Atlas → Collections
2. Select database `chaturway001`
3. Create collections: `users`, `rooms`, `privatechats`
4. Insert documents manually or use MongoDB Compass

## Connection Issues?

If you see timeout errors:
1. Check internet connection
2. Verify MongoDB Atlas IP whitelist
3. Ensure cluster status is "Running"
4. Try again in a few minutes (DNS propagation)






# MongoDB Connection Troubleshooting Guide

## Common Issues & Solutions

### 1. IP Whitelist Issue (Most Common)

**Error:** `Could not connect to any servers in your MongoDB Atlas cluster`

**Solution:**
1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
2. Click on **Network Access** (left sidebar)
3. Click **Add IP Address**
4. For local development, you can:
   - Add your current IP address
   - Or use `0.0.0.0/0` to allow all IPs (⚠️ Less secure, only for development)
5. Click **Confirm**

### 2. Missing Environment Variable

**Error:** `MONGO_URI not found in .env file`

**Solution:**
1. Create/check `server/.env` file
2. Add your connection string:
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database?retryWrites=true&w=majority
   ```
   OR
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database?retryWrites=true&w=majority
   ```

### 3. Incorrect Connection String

**Error:** `Authentication failed` or `Invalid connection string`

**Solution:**
- Get your connection string from MongoDB Atlas:
  1. Go to **Clusters** → Click **Connect**
  2. Select **Connect your application**
  3. Copy the connection string
  4. Replace `<password>` with your actual password
  5. Replace `<dbname>` with your database name (or remove it)

### 4. Database User Issues

**Error:** `Authentication failed`

**Solution:**
1. Go to MongoDB Atlas → **Database Access**
2. Verify your database user exists
3. Check username and password are correct
4. Ensure user has proper permissions

### 5. Network/Firewall Issues

**Error:** `Connection timeout`

**Solution:**
- Check if your firewall is blocking MongoDB ports
- MongoDB Atlas uses port 27017 (default)
- For `mongodb+srv://`, it uses port 27017 automatically

## Quick Test

Run this command to test your connection:
```bash
cd server
node test-db-connection.js
```

## Environment Variables

Your `server/.env` file should contain:

```env
# MongoDB Connection (use either MONGO_URI or MONGODB_URI)
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database?retryWrites=true&w=majority

# OR
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database?retryWrites=true&w=majority

# Other required variables
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173
PORT=4000
```

## Connection String Format

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

**Important:**
- Replace `<username>` with your MongoDB username
- Replace `<password>` with your MongoDB password (URL-encode special characters)
- Replace `<cluster>` with your cluster address
- Replace `<database>` with your database name (or remove it to use default)

## Testing Connection

### Option 1: Use Test Script
```bash
cd server
node test-db-connection.js
```

### Option 2: Check Server Logs
When you start the server, you should see:
```
🔄 Connecting to MongoDB...
✅ Connected to MongoDB → chaturway001
📍 Database: chaturway001
📍 Host: cluster0.xxxxx.mongodb.net
```

If you see errors, check the troubleshooting steps above.

## For Production (Render/Netlify)

Make sure to set environment variables in your hosting platform:
- **Render**: Dashboard → Your Service → Environment → Add `MONGO_URI`
- **Netlify**: Site Settings → Environment Variables → Add `MONGO_URI`

## Quick Fix Checklist

- [ ] MongoDB Atlas IP whitelist includes your IP or `0.0.0.0/0`
- [ ] `server/.env` file exists with `MONGO_URI` or `MONGODB_URI`
- [ ] Connection string is correct (username, password, cluster)
- [ ] Database user exists and has correct permissions
- [ ] No firewall blocking MongoDB ports
- [ ] MongoDB Atlas cluster is running (not paused)


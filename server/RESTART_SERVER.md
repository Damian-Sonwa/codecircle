# 🔄 CRITICAL: RESTART SERVER TO FIX CRASHES

## The Problem
The server is still using OLD cached code. The error shows it's crashing on line 31 of passport.js, but that's from the OLD version before our fixes.

## ✅ Solution: COMPLETE RESTART

### Step 1: STOP ALL Node Processes
```powershell
# In PowerShell:
Get-Process node | Stop-Process -Force
```

OR press `Ctrl+C` in ALL terminal windows running Node.

### Step 2: CLEAR Node Cache (if needed)
```bash
cd server
# Delete node_modules/.cache if it exists
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue
```

### Step 3: RESTART Backend Server
```bash
cd server
npm run dev
```

**You MUST see:**
```
✅ Loaded .env file from: ...
ℹ️  Google OAuth not configured - skipping initialization
ℹ️  GitHub OAuth not configured - skipping initialization
🔄 Connecting to MongoDB...
   Database: chaturway001
   Cluster: cluster0.1o3c3g9.mongodb.net
✅ Connected to MongoDB
🚀 Server running on port 5000
```

### Step 4: If Still Crashing
1. Check the error line number - should NOT be line 31 anymore (our new code)
2. Verify passport.js was saved correctly
3. Try deleting `server/node_modules/.cache` folder
4. Restart again

### Step 5: Start Frontend (in NEW terminal)
```bash
cd client
npm run dev
```

## Expected Output After Fix:
- ✅ No OAuth errors
- ✅ Server starts on port 5000
- ✅ MongoDB connects to cluster0.1o3c3g9.mongodb.net
- ✅ Frontend on port 5173

**If you see ANY OAuth errors, the server is using old code - restart completely!**






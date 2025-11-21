# Postman API Testing Guide

## API Base URL

**Production (Render):**
```
https://codecircle-uc8r.onrender.com
```

**Local Development:**
```
http://localhost:5000
```

## Common Issues & Solutions

### 1. CORS Errors
**Problem:** Postman might get CORS errors if the server is blocking requests.

**Solution:** 
- CORS is configured to allow requests from specific origins
- Postman should work fine as it doesn't send an Origin header by default
- If you see CORS errors, check that your server is running and accessible

### 2. Authentication Required
**Problem:** Most endpoints require JWT authentication.

**Solution:** 
1. First, get a token by logging in:
   ```
   POST /api/auth/login
   Body (JSON):
   {
     "identifier": "your_username_or_email",
     "password": "your_password"
   }
   ```
2. Copy the `token` from the response
3. Add it to subsequent requests:
   ```
   Header: Authorization
   Value: Bearer YOUR_TOKEN_HERE
   ```

### 3. Content-Type Header
**Problem:** Server expects JSON data.

**Solution:** 
- Set `Content-Type: application/json` header in Postman
- Use the "Body" tab → "raw" → "JSON" option

## Testing Endpoints

### 1. Health Check (No Auth Required)
```
GET http://localhost:5000/health
```
or
```
GET https://codecircle-uc8r.onrender.com/health
```

### 2. Get API Info (No Auth Required)
```
GET http://localhost:5000/
```

### 3. Login (No Auth Required)
```
POST http://localhost:5000/api/auth/login
Headers:
  Content-Type: application/json
Body (JSON):
{
  "identifier": "Damian25",
  "password": "password"
}
```

**Response:**
```json
{
  "userId": "...",
  "username": "Damian25",
  "role": "user",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "onboardingCompleted": true
}
```

### 4. Complete Onboarding (Auth Required)
```
POST http://localhost:5000/api/onboarding/complete
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN_HERE
Body (JSON):
{
  "skills": ["Fullstack", "Backend"],
  "skillLevel": "Intermediate",
  "answers": {
    "goal": "Learn and collaborate",
    "share": "React and Node.js"
  }
}
```

### 5. Get Users (No Auth Required)
```
GET http://localhost:5000/api/users
```

### 6. Get Friends (Auth Required)
```
GET http://localhost:5000/api/friends
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

## Postman Collection Setup

### Step 1: Create Environment Variables
1. Click "Environments" in Postman
2. Create new environment: "CodeCircle API"
3. Add variables:
   - `base_url`: `http://localhost:5000` (or your Render URL)
   - `token`: (leave empty, will be set after login)

### Step 2: Create Requests

#### Request 1: Login
- Method: `POST`
- URL: `{{base_url}}/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "identifier": "Damian25",
  "password": "password"
}
```
- Tests (to save token):
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set("token", jsonData.token);
}
```

#### Request 2: Complete Onboarding
- Method: `POST`
- URL: `{{base_url}}/api/onboarding/complete`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- Body (raw JSON):
```json
{
  "skills": ["Fullstack", "Backend"],
  "skillLevel": "Intermediate",
  "answers": {
    "goal": "Learn and collaborate",
    "share": "React and Node.js"
  }
}
```

## Troubleshooting

### Error: "Cannot GET /"
- **Cause:** Server might not be running or wrong URL
- **Solution:** Check server is running on port 5000 (or your configured port)

### Error: "Authorization token required"
- **Cause:** Missing or incorrect Authorization header
- **Solution:** 
  1. Make sure you logged in first
  2. Copy the token from login response
  3. Add header: `Authorization: Bearer YOUR_TOKEN`

### Error: "Origin not allowed by CORS"
- **Cause:** CORS configuration blocking the request
- **Solution:** 
  - Postman shouldn't have this issue (it doesn't send Origin by default)
  - If testing from browser, make sure your origin is in `ALLOWED_ORIGINS`

### Error: "User not found"
- **Cause:** Token is invalid or user doesn't exist
- **Solution:** 
  1. Login again to get a fresh token
  2. Make sure the user exists in the database

### Error: Connection refused / Timeout
- **Cause:** Server not running or wrong URL
- **Solution:** 
  1. Check server is running: `npm run dev` in server directory
  2. Verify the URL is correct
  3. Check firewall/network settings

## Quick Test Script

You can also use the provided test script:
```bash
cd server
node test-api.js
```

This will automatically test multiple endpoints and show you the results.


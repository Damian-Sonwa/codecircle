# API Testing Guide

## Quick Start

### 1. Start the Server
```bash
cd server
npm run dev
# Server will run on http://localhost:5000 (or PORT from .env)
```

### 2. Run Automated Tests
```bash
cd server
npm run test-api
```

## Manual Testing with cURL

### Authentication Endpoints

#### Register a new user
```bash
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser",
    "password": "password123"
  }'
```

#### Login (Legacy endpoint)
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### Authenticated Endpoints

Replace `YOUR_TOKEN` with the token from login response.

#### Get Friends
```bash
curl -X GET http://localhost:5000/api/friends \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Tech Groups
```bash
curl -X GET http://localhost:5000/api/tech-groups
```

#### Complete Onboarding
```bash
curl -X POST http://localhost:5000/api/onboarding/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

#### Get Users (Public)
```bash
curl -X GET http://localhost:5000/api/users
```

## Testing with Postman

1. **Import Collection**: Create a new collection in Postman
2. **Set Base URL**: Create an environment variable `baseUrl` = `http://localhost:5000`
3. **Test Flow**:
   - Register/Login → Save token to environment variable
   - Use token in Authorization header for protected endpoints

## Testing with Thunder Client (VS Code)

1. Install Thunder Client extension
2. Create requests:
   - Set base URL: `http://localhost:5000`
   - For auth endpoints, use JSON body
   - For protected endpoints, add `Authorization: Bearer {token}` header

## Available Endpoints

### Public Endpoints
- `GET /api/users` - List all users
- `GET /api/tech-groups` - List tech groups
- `POST /api/register` - Register new user
- `POST /api/auth/login` - Login (new)
- `POST /api/login` - Login (legacy)

### Protected Endpoints (Require Bearer Token)
- `GET /api/friends` - Get user's friends
- `POST /api/friends/request` - Send friend request
- `POST /api/onboarding/complete` - Complete onboarding
- `GET /api/classroom-requests` - Get classroom requests
- `POST /api/classroom-requests` - Create classroom request

## Environment Variables

Make sure your `.env` file has:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

## Troubleshooting

- **Connection Refused**: Make sure server is running (`npm run dev`)
- **401 Unauthorized**: Check that token is valid and included in Authorization header
- **500 Error**: Check server logs and MongoDB connection
- **CORS Error**: Check CORS configuration in server/index.js


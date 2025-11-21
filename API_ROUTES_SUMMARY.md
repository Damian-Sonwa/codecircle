# API Routes Summary

## Server File
- **Main Server File**: `server/index.js` (NOT `server.js`)
- **Entry Point**: The server uses `index.js` as the main file (configured in `package.json`)

## API Base URL
- **Local**: `http://localhost:5000`
- **Production**: `https://codecircle-uc8r.onrender.com`

## Available API Routes

### Public Routes (No Authentication Required)

#### Health & Info
- `GET /` - API information
- `GET /health` - Health check

#### Authentication
- `POST /api/auth/login` - Login (returns JWT token)
- `POST /api/auth/signup` - Register new user
- `POST /api/login` - Legacy login endpoint
- `POST /api/register` - Legacy register endpoint
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/github` - GitHub OAuth

#### Public Data
- `GET /api/users` - Get all users (public)
- `GET /api/tech-groups` - Get all tech groups

### Protected Routes (Require JWT Token)

#### Onboarding
- `POST /api/onboarding/complete` - Complete onboarding
  - Headers: `Authorization: Bearer YOUR_TOKEN`
  - Body: `{ skills: [], skillLevel: string, answers: {} }`

#### Friends
- `GET /api/friends` - Get user's friends
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/respond` - Respond to friend request
- `POST /api/friends/add/:targetUserId` - Add friend
- `POST /api/friends/accept/:requesterId` - Accept friend request
- `DELETE /api/friends/decline/:requesterId` - Decline friend request
- `GET /api/friends/:userId` - Get specific friend

#### Classroom
- `GET /api/classroom-requests` - Get user's classroom requests
- `POST /api/classroom-requests` - Create classroom request
- `GET /api/admin/classroom-requests` - Get all requests (admin only)
- `POST /api/admin/classroom-requests/:requestId/approve` - Approve request (admin)
- `POST /api/admin/classroom-requests/:requestId/decline` - Decline request (admin)

#### Tech Groups
- `POST /api/tech-groups` - Create tech group
- `POST /api/tech-groups/:groupId/join-requests` - Request to join group
- `GET /api/tech-groups/:groupId` - Get group details
- `PATCH /api/tech-groups/:groupId` - Update group (auth required)
- `DELETE /api/tech-groups/:groupId` - Delete group (auth required)
- `POST /api/tech-groups/:groupId/members` - Add member
- `DELETE /api/tech-groups/:groupId/members/:userId` - Remove member

#### Admin Routes (Admin Only)
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users/:userId/suspend` - Suspend user
- `POST /api/admin/users/:userId/unsuspend` - Unsuspend user
- `DELETE /api/admin/users/:userId` - Delete user
- `GET /api/admin/logs` - Get admin logs
- `GET /api/admin/violations` - Get violations

#### Uploads
- `POST /api/uploads` - Upload file

#### Translation
- `POST /api/translate` - Translate text

## Authentication

All protected routes require:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

To get a token:
1. Login: `POST /api/auth/login`
2. Copy the `token` from response
3. Use it in `Authorization` header

## Testing in Postman

1. Import `CodeCircle_API.postman_collection.json`
2. Set `base_url` variable to your API URL
3. Run "Login" request first to get token
4. Token is automatically saved to `token` variable
5. All other requests will use the token automatically


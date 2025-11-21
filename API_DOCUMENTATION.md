# CodeCircle API Documentation

**Base URL:** `https://codecircle-uc8r.onrender.com`

All endpoints return JSON. Authentication is required for most endpoints (indicated by `auth required`). Admin-only endpoints are marked with `(admin)`.

---

## 🔐 Authentication

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "username_or_email",
  "password": "password"
}
```

### Register (Legacy)
```
POST /api/register
Content-Type: application/json

{
  "username": "username",
  "password": "password"
}
```

### Signup (New)
```
POST /api/auth/signup
Content-Type: application/json

{
  "username": "username",
  "email": "email@example.com",
  "password": "password"
}
```

**Authentication Header:**
```
Authorization: Bearer <token>
```

---

## 👥 Users

### Get All Users
```
GET /api/users
```
Returns list of all users (public endpoint).

### Get Single User
```
GET /api/users/:userId
```
Returns user details by userId.

### Update User
```
PUT /api/users/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "new_username",
  "email": "new_email@example.com",
  "avatar": "avatar_url",
  "bio": "User bio",
  "skills": ["JavaScript", "React"],
  "skillLevel": "Intermediate"
}
```
Users can only update their own profile unless they're admin.

### Delete User (Soft Delete)
```
DELETE /api/users/:userId
Authorization: Bearer <token>
```
Users can delete their own account, or admins can delete any user.

---

## 👫 Friends

### Get Friends
```
GET /api/friends
Authorization: Bearer <token>
```

### Send Friend Request
```
POST /api/friends/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetUserId": "user_id"
}
```

### Respond to Friend Request
```
POST /api/friends/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "requesterId": "user_id",
  "action": "accept" | "decline"
}
```

### Add Friend Directly
```
POST /api/friends/add/:targetUserId
Authorization: Bearer <token>
```

### Accept Friend Request
```
POST /api/friends/accept/:requesterId
Authorization: Bearer <token>
```

### Decline Friend Request
```
DELETE /api/friends/decline/:requesterId
Authorization: Bearer <token>
```

### Get User's Friends
```
GET /api/friends/:userId
Authorization: Bearer <token>
```

---

## 🎓 Onboarding

### Complete Onboarding
```
POST /api/onboarding/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "skills": ["JavaScript", "React"],
  "skillLevel": "Intermediate",
  "answers": {}
}
```

---

## 💬 Tech Groups

### Get All Tech Groups
```
GET /api/tech-groups
```

### Get Single Tech Group
```
GET /api/tech-groups/:groupId
```

### Create Tech Group
```
POST /api/tech-groups
Content-Type: application/json

{
  "name": "Group Name",
  "description": "Group description",
  "type": "community" | "classroom",
  "topics": ["topic1", "topic2"]
}
```

### Update Tech Group
```
PATCH /api/tech-groups/:groupId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Delete Tech Group
```
DELETE /api/tech-groups/:groupId
Authorization: Bearer <token>
```

### Join Tech Group (Request)
```
POST /api/tech-groups/:groupId/join-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "answers": {},
  "level": "Intermediate"
}
```

### Add Member to Tech Group
```
POST /api/tech-groups/:groupId/members
Content-Type: application/json

{
  "userId": "user_id"
}
```

### Remove Member from Tech Group
```
DELETE /api/tech-groups/:groupId/members/:userId
Authorization: Bearer <token>
```

### Get Archived Messages
```
GET /api/tech-groups/:groupId/messages/archived
```

### Archive Message
```
POST /api/tech-groups/:groupId/messages/:messageId/archive
Content-Type: application/json
```

---

## 💬 Private Chats

### Get All Private Chats
```
GET /api/private-chats
Authorization: Bearer <token>
```
Returns all private chats for the authenticated user.

### Get Single Private Chat
```
GET /api/private-chats/:chatId
Authorization: Bearer <token>
```

### Create Private Chat
```
POST /api/private-chats
Authorization: Bearer <token>
Content-Type: application/json

{
  "participantId": "user_id"
}
```

### Update Private Chat
```
PUT /api/private-chats/:chatId
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [...]
}
```

### Delete Private Chat
```
DELETE /api/private-chats/:chatId
Authorization: Bearer <token>
```

---

## 🏫 Classroom Requests

### Get All Classroom Requests
```
GET /api/classroom-requests
Authorization: Bearer <token>
```
Returns classroom requests created by the authenticated user.

### Create Classroom Request
```
POST /api/classroom-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Classroom Name",
  "description": "Classroom description"
}
```

### Update Classroom Request
```
PUT /api/classroom-requests/:requestId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Delete Classroom Request
```
DELETE /api/classroom-requests/:requestId
Authorization: Bearer <token>
```

### Approve Classroom Request (Admin)
```
POST /api/admin/classroom-requests/:requestId/approve
Authorization: Bearer <admin_token>
```

### Decline Classroom Request (Admin)
```
POST /api/admin/classroom-requests/:requestId/decline
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "adminNotes": "Reason for decline"
}
```

### Get All Classroom Requests (Admin)
```
GET /api/admin/classroom-requests
Authorization: Bearer <admin_token>
```

---

## 📚 Training Requests

### Get All Training Requests
```
GET /api/training-requests
Authorization: Bearer <token>
```
Returns user's own requests, or all requests if admin.

### Get Single Training Request
```
GET /api/training-requests/:requestId
Authorization: Bearer <token>
```

### Create Training Request
```
POST /api/training-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestedCourse": "Course Name",
  "motivation": "Why I want this course"
}
```

### Update Training Request
```
PUT /api/training-requests/:requestId
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestedCourse": "Updated Course",
  "motivation": "Updated motivation",
  "status": "approved" | "declined" | "pending" (admin only)
}
```

### Delete Training Request
```
DELETE /api/training-requests/:requestId
Authorization: Bearer <token>
```

---

## 🔧 Admin Operations

### Get All Users (Admin)
```
GET /api/admin/users
Authorization: Bearer <admin_token>
```

### Suspend User (Admin)
```
POST /api/admin/users/:userId/suspend
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "Reason for suspension"
}
```

### Restore User (Admin)
```
POST /api/admin/users/:userId/restore
Authorization: Bearer <admin_token>
```

### Delete User (Admin)
```
POST /api/admin/users/:userId/delete
Authorization: Bearer <admin_token>
```

---

## 📋 Admin Logs

### Get All Admin Logs
```
GET /api/admin/logs?limit=20
Authorization: Bearer <admin_token>
```

### Get Single Admin Log
```
GET /api/admin/logs/:logId
Authorization: Bearer <admin_token>
```

### Create Admin Log
```
POST /api/admin/logs
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "action": "suspend" | "reinstate" | "delete",
  "targetUserId": "user_id",
  "targetUsername": "username",
  "details": "Additional details"
}
```

---

## ⚠️ Violations

### Get All Violations
```
GET /api/admin/violations?limit=50
Authorization: Bearer <admin_token>
```

### Get Single Violation
```
GET /api/admin/violations/:violationId
Authorization: Bearer <admin_token>
```

### Create Violation
```
POST /api/admin/violations
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "user_id",
  "username": "username",
  "messageId": "message_id",
  "groupId": "group_id",
  "chatId": "chat_id",
  "offendingContent": "Content that violated rules",
  "triggerWord": "Word that triggered violation",
  "status": "warning" | "auto-suspended"
}
```

### Update Violation
```
PUT /api/admin/violations/:violationId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "warning" | "auto-suspended",
  "offendingContent": "Updated content",
  "triggerWord": "Updated word"
}
```

### Delete Violation
```
DELETE /api/admin/violations/:violationId
Authorization: Bearer <admin_token>
```

---

## 📤 Uploads

### Upload File
```
POST /api/uploads
Content-Type: multipart/form-data

{
  "file": <file>
}
```

---

## 🌐 Translation

### Translate Text
```
POST /api/translate
Content-Type: application/json

{
  "text": "Text to translate",
  "targetLanguage": "es"
}
```

---

## 🏥 Health Check

### Health Check
```
GET /health
```
Returns server status.

### API Info
```
GET /api
```
Returns API information and available endpoints.

### Root
```
GET /
```
Returns server information.

---

## 📊 Response Formats

### Success Response
```json
{
  "data": {...}
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

### Pagination (where applicable)
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

---

## 🔒 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (Database connection issues)

---

## 📝 Notes

1. All timestamps are in ISO 8601 format
2. User IDs are strings (not MongoDB ObjectIds)
3. Most endpoints require authentication via JWT token
4. Admin endpoints require `role: 'admin'` in the JWT token
5. Soft deletes are used for users (status set to 'deleted')
6. File uploads are limited to 25MB

---

## 🔗 Quick Reference

**Base URL:** `https://codecircle-uc8r.onrender.com`

**Models with Full CRUD:**
- ✅ Users
- ✅ Tech Groups
- ✅ Private Chats
- ✅ Classroom Requests
- ✅ Training Requests
- ✅ Admin Logs
- ✅ Violations

**Models with Partial CRUD:**
- Friends (relationship-based, not full CRUD)
- Onboarding (completion endpoint only)


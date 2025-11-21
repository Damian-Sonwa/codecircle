# CodeCircle

A modern, real-time collaborative learning platform that combines chat, classroom features, and knowledge sharing for developers and tech enthusiasts. Built with a beautiful glassmorphism UI and powered by real-time WebSocket communication.

🌐 **Live Demo**:(https://codecircletech.netlify.app)

## 🚀 Features

### Core Functionality
- **Real-time Chat**: Instant messaging with Socket.IO, featuring typing indicators, presence tracking, and message reactions
- **User Authentication**: Secure JWT-based authentication with refresh tokens
- **Friends System**: Connect with other developers, send friend invites, and manage your network
- **Classroom**: Collaborative learning spaces for group discussions and knowledge sharing
- **Knowledge Hub**: Share and discover technical articles, tutorials, and resources
- **Leaderboard**: Track engagement and achievements across the platform
- **Explore**: Discover developers by tech skills and expertise (Fullstack, Backend, Frontend, Cybersecurity, Data Science, Cloud, UI/UX, AI/ML)
- **User Profiles**: Customizable profiles with skill tags and achievements
- **Admin Panel**: Comprehensive admin dashboard for platform management

### UI/UX Highlights
- **Glassmorphism Design**: Modern, translucent UI with beautiful visual effects
- **Ambient Backgrounds**: Animated backgrounds with customizable ambience
- **Dark/Light Themes**: Full theme support with smooth transitions
- **Micro-interactions**: Smooth animations powered by Framer Motion
- **Responsive Design**: Optimized for desktop and mobile devices
- **Onboarding Flow**: Guided tour for new users with skill selection

## 🛠️ Tech Stack

### Frontend (`client/`)
- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **React Query** - Server state management and caching
- **Framer Motion** - Animation library
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Playwright** - End-to-end testing

### Backend (`server/`)
- **Express 5** - Web application framework
- **TypeScript** - Type-safe server code
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB + Mongoose** - Database and ODM
- **Redis (Optional)** - Presence tracking and caching
- **JWT** - Authentication and authorization
- **AWS S3** - Cloud file storage (optional, defaults to local)
- **Jest** - Testing framework
- **OpenAPI** - API documentation

## 📁 Project Structure

```
CodeCircle/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── auth/      # Authentication components
│   │   │   ├── chat/      # Chat-related components
│   │   │   ├── layout/    # Layout components
│   │   │   ├── navigation/# Navigation components
│   │   │   ├── onboarding/# Onboarding flow
│   │   │   └── ui/        # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── layouts/       # Page layouts
│   │   ├── pages/         # Route pages
│   │   ├── providers/     # Context providers
│   │   ├── services/      # API and socket services
│   │   ├── store/         # Zustand stores
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── tests/             # E2E tests
│
├── server/                 # Express backend application
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── socket/        # Socket.IO handlers
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── tests/             # Unit and integration tests
│
└── package.json           # Root workspace configuration
```

## 🏁 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **MongoDB** (local or cloud instance)
- **Redis** (optional, for presence tracking)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CodeCircle
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `server/` directory with the following variables:
   ```env
   # Required
   MONGODB_URI=mongodb://localhost:27017/codecircle
   JWT_SECRET=your-super-secret-jwt-key-change-this
   
   # Optional
   PORT=4000
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development
   
   # JWT Configuration (optional)
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_SECRET=your-refresh-secret
   JWT_REFRESH_EXPIRES_IN=7d
   
   # Redis (optional, for presence tracking)
   REDIS_URL=redis://localhost:6379
   
   # AWS S3 (optional, for cloud file storage)
   UPLOAD_BUCKET=your-bucket-name
   UPLOAD_REGION=us-east-1
   UPLOAD_ACCESS_KEY=your-access-key
   UPLOAD_SECRET_KEY=your-secret-key
   UPLOAD_ENDPOINT=your-s3-endpoint
   ```

4. **Seed the database (optional)**
   ```bash
   npm --workspace server run seed
   ```
   This will populate the database with sample data for testing.

5. **Start the development servers**
   ```bash
   npm run dev
   ```
   
   This will start both client and server concurrently:
   - **Client**: http://localhost:5173
   - **Server**: http://localhost:4000

   Or start them separately:
   ```bash
   npm run dev:client  # Client only
   npm run dev:server  # Server only
   ```

## 🧪 Testing

### Server Tests
```bash
# Run all server tests
npm --workspace server run test

# Run unit tests only
npm --workspace server run test:unit

# Run integration tests only
npm --workspace server run test:integration

# Run WebSocket tests
npm --workspace server run test:ws
```

### Client Tests
```bash
# Run unit tests with Vitest
npm --workspace client run test

# Run E2E tests with Playwright
npm --workspace client run test:e2e

# Install Playwright browsers (first time only)
npx playwright install
```

### Run All Tests
```bash
npm run test
```

## 📚 API Documentation

### REST Endpoints

- **Authentication**: `/api/auth`
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login
  - `POST /api/auth/refresh` - Refresh access token
  - `POST /api/auth/logout` - User logout

- **Conversations**: `/api/conversations`
  - `GET /api/conversations` - List user conversations
  - `POST /api/conversations` - Create new conversation
  - `GET /api/conversations/:id` - Get conversation details

- **Messages**: `/api/conversations/:conversationId/messages`
  - `GET /api/conversations/:id/messages` - Get messages
  - `POST /api/conversations/:id/messages` - Send message

- **Users**: `/api/users`
  - `GET /api/users` - Search users
  - `GET /api/users/:id` - Get user profile
  - `PUT /api/users/:id` - Update user profile

- **Friends**: `/api/friends`
  - `GET /api/friends` - List friends
  - `POST /api/friends/invite` - Send friend invite
  - `POST /api/friends/accept/:id` - Accept invite

- **Classrooms**: `/api/classrooms`
  - `GET /api/classrooms` - List classrooms
  - `POST /api/classrooms` - Create classroom

- **Knowledge Hub**: `/api/knowledge`
  - `GET /api/knowledge` - List knowledge posts
  - `POST /api/knowledge` - Create knowledge post

- **Admin**: `/api/admin`
  - Admin-only endpoints for platform management

- **Uploads**: `/api/uploads`
  - `POST /api/uploads` - Upload files (images, documents)

### Socket.IO Events

- **Presence**: `presence:online`, `presence:offline`, `presence:update`
- **Typing**: `typing:start`, `typing:stop`
- **Messages**: `message:new`, `message:update`, `message:delete`
- **Reactions**: `message:react`
- **Delivery/Read Receipts**: `message:delivered`, `message:read`

### Generate OpenAPI Spec
```bash
npm --workspace server run openapi
```
This generates `server/docs/openapi.json` with the complete API specification.

## 📜 Available Scripts

### Root Level
- `npm run dev` - Start both client and server in development mode
- `npm run dev:client` - Start only the client
- `npm run dev:server` - Start only the server
- `npm run build` - Build both client and server for production
- `npm run test` - Run all tests across workspaces
- `npm run lint` - Lint all workspaces

### Client Scripts
- `npm --workspace client run dev` - Start Vite dev server
- `npm --workspace client run build` - Build for production
- `npm --workspace client run preview` - Preview production build
- `npm --workspace client run test` - Run Vitest unit tests
- `npm --workspace client run test:e2e` - Run Playwright E2E tests

### Server Scripts
- `npm --workspace server run dev` - Start development server with hot reload
- `npm --workspace server run build` - Compile TypeScript
- `npm --workspace server run start` - Start production server
- `npm --workspace server run test` - Run all tests
- `npm --workspace server run seed` - Seed database with sample data
- `npm --workspace server run openapi` - Generate OpenAPI documentation

## 🏗️ Architecture Notes

### State Management
- **Zustand** is used for client-side state (auth, UI, notifications, chat)
- **React Query** handles server state, caching, and synchronization
- **Socket.IO** manages real-time updates and presence

### File Storage
- **Local Storage**: Defaults to `server/uploads/` directory
- **Cloud Storage**: Configure AWS S3 credentials to use cloud storage
- Supports images and documents with size limits

### Presence Tracking
- **Redis**: When `REDIS_URL` is provided, presence is tracked in Redis for scalability
- **In-Memory**: Falls back to in-memory storage when Redis is not available
- Tracks online/offline status and activity

### Security
- **Helmet.js** - Security headers
- **CORS** - Configured for client origin
- **JWT Authentication** - Secure token-based auth
- **Input Validation** - Express-validator for request validation
- **Rate Limiting** - (Can be added via middleware)

### Real-time Features
- **Socket.IO** handles all real-time communication
- **Presence System** tracks user online/offline status
- **Typing Indicators** show when users are typing
- **Message Reactions** for interactive engagement
- **Delivery/Read Receipts** for message status tracking

## 🎨 UI Components

The application features a comprehensive component library:
- **Chat Components**: Message bubbles, composer, conversation list, presence avatars
- **Layout Components**: App shell, navigation drawer, ambient backgrounds
- **Onboarding**: Multi-step onboarding flow with skill selection
- **UI Components**: Notifications, modals, settings panels

## 🔒 Environment Variables

### Required
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT token signing

### Optional
- `PORT` - Server port (default: 4000)
- `CLIENT_URL` - Frontend URL for CORS (default: http://localhost:5173)
- `NODE_ENV` - Environment mode (development/production/test)
- `REDIS_URL` - Redis connection string for presence tracking
- `JWT_EXPIRES_IN` - Access token expiration (default: 15m)
- `JWT_REFRESH_SECRET` - Refresh token secret
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (default: 7d)
- AWS S3 variables for cloud file storage

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using React, TypeScript, Express, and Socket.IO

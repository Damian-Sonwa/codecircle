# Local Development & Preview Guide

## Quick Start - Run Locally

### Option 1: Run Both Frontend & Backend (Recommended)

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm run dev
# Server runs on http://localhost:4000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### Option 2: Production Preview (Build + Preview)

**Build for production preview:**
```bash
# Build frontend
cd client
npm run build

# Preview production build
npm run preview
# Preview runs on http://localhost:4173
```

## Environment Setup

### Frontend (.env.local in client/)
```env
VITE_API_URL=http://localhost:4000/api
```

### Backend (.env in server/)
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
PORT=4000
```

## Available Scripts

### Frontend (client/)
- `npm run dev` - Start development server (hot reload)
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run linter

### Backend (server/)
- `npm run dev` - Start development server (with nodemon)
- `npm start` - Start production server
- `npm test` - Run tests

## Testing Production Build Locally

1. **Build the frontend:**
   ```bash
   cd client
   npm run build
   ```

2. **Preview the build:**
   ```bash
   npm run preview
   ```

3. **Start the backend:**
   ```bash
   cd server
   npm start
   ```

4. **Access the app:**
   - Frontend: http://localhost:4173
   - Backend API: http://localhost:4000

## Hot Reload Development

For active development with hot reload:

1. **Terminal 1 - Backend:**
   ```bash
   cd server
   npm run dev
   ```

2. **Terminal 2 - Frontend:**
   ```bash
   cd client
   npm run dev
   ```

3. **Access:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:4000

Changes will hot-reload automatically!

## Troubleshooting

### Port Already in Use
- Frontend: Change port in `vite.config.ts` or use `npm run dev -- --port 3000`
- Backend: Change `PORT` in `.env` file

### API Connection Issues
- Ensure backend is running first
- Check `VITE_API_URL` in frontend `.env.local`
- Check CORS settings in backend

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist` (frontend) or `rm -rf dist` (backend)


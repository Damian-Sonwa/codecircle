import http from 'http';
import {Server} from 'socket.io';
import {createApp} from '@/app';
import {connectDatabase} from '@/config/database';
import {env} from '@/config/env';
import {registerSocketEvents} from '@/socket/register';

const bootstrap = async () => {
  try {
    console.log('[server] 🚀 Starting server...');
    console.log('[server] Environment:', env.nodeEnv);
    console.log('[server] Port:', env.port);
    
    // Connect to database first
    console.log('[server] 📦 Connecting to database...');
    await connectDatabase();
    
    // Create Express app
    console.log('[server] 📱 Creating Express app...');
    const app = createApp();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Setup Socket.IO
    console.log('[server] 🔌 Setting up Socket.IO...');
    const io = new Server(server, {
      cors: {
        origin: env.clientUrl,
        credentials: true
      }
    });

    registerSocketEvents(io);

    // Start server
    server.listen(env.port, () => {
      console.log(`[server] ✅ Server listening on port ${env.port}`);
      console.log(`[server] 🌐 Client URL: ${env.clientUrl}`);
      console.log(`[server] 📊 Health check: http://localhost:${env.port}/health`);
    });
  } catch (error) {
    console.error('[server] ❌ Failed to start server');
    console.error('[server] Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('[server] Stack trace:', error.stack);
    }
    process.exit(1);
  }
};

bootstrap();



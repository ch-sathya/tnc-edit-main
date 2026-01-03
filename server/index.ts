import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import { CollaborationSocketServer } from './collaboration-socket-server';

const app = express();
const server = createServer(app);

// Initialize Supabase client for authentication
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configure CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ["http://localhost:8080", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Authentication middleware - validates JWT token before allowing connection
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log('Socket connection rejected: No authentication token provided');
      return next(new Error('Authentication required'));
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('Socket connection rejected: Invalid authentication token', error?.message);
      return next(new Error('Invalid authentication token'));
    }

    // Store authenticated user in socket data for later use
    socket.data.user = user;
    socket.data.userId = user.id;
    
    console.log(`Socket authenticated for user: ${user.id}`);
    next();
  } catch (err) {
    console.error('Socket authentication error:', err);
    return next(new Error('Authentication failed'));
  }
});

// Initialize collaboration socket server with Supabase client
const collaborationServer = new CollaborationSocketServer(io, supabase);
collaborationServer.initialize();

const PORT = process.env.SOCKET_PORT || 3001;

server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log('Authentication: ENABLED');
});

export { io };

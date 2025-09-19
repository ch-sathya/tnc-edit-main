import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { CollaborationSocketServer } from './collaboration-socket-server';

const app = express();
const server = createServer(app);

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

// Initialize collaboration socket server
const collaborationServer = new CollaborationSocketServer(io);
collaborationServer.initialize();

const PORT = process.env.SOCKET_PORT || 3001;

server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

export { io };
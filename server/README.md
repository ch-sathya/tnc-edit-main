# Socket.IO Collaboration Server

This directory contains the Socket.IO server implementation for real-time collaborative editing features.

## Features

- Room-based collaboration support
- Real-time cursor tracking and user presence
- Typing indicators
- Connection management and user session tracking
- Automatic reconnection with exponential backoff
- User activity monitoring and idle detection

## Architecture

The server is built with:
- **Express.js** - HTTP server framework
- **Socket.IO** - Real-time bidirectional event-based communication
- **TypeScript** - Type safety and better development experience

## Running the Server

### Development Mode
```bash
# From the project root
npm run server:dev
```

### Production Mode
```bash
# Build the server
npm run server:build

# Start the built server
npm run server:start
```

### Running Both Client and Server
```bash
# Run both the Vite dev server and Socket.IO server concurrently
npm run dev:full
```

## Server Configuration

The server can be configured using environment variables:

- `SOCKET_PORT` - Port for the Socket.IO server (default: 3001)
- `NODE_ENV` - Environment mode (development/production)
- `FRONTEND_URL` - Frontend URL for CORS in production

## API Events

### Client to Server Events

- `join-collaboration` - Join a collaboration room
- `leave-collaboration` - Leave a collaboration room
- `cursor-update` - Update cursor position
- `selection-update` - Update text selection
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator
- `file-switch` - Switch to a different file
- `user-activity` - Update user activity

### Server to Client Events

- `user-joined` - User joined the room
- `user-left` - User left the room
- `cursor-updated` - Cursor position updated
- `selection-updated` - Text selection updated
- `user-typing` - Typing indicator update
- `file-switched` - User switched files
- `connection-status` - Connection status update
- `user-activity-updated` - User activity status update

## Testing

To test the server functionality:

1. Start the server: `npm run server:dev`
2. In another terminal, run the test: `npx ts-node server/test-server.ts`

## Integration with Client

The client-side integration is handled by:
- `src/services/socket-service.ts` - Socket.IO service wrapper
- `src/hooks/useSocket.ts` - React hook for Socket.IO functionality

## Error Handling

The server includes comprehensive error handling for:
- Connection failures
- Room management errors
- User session cleanup
- Automatic reconnection
- Activity timeout management
import { io as Client } from 'socket.io-client';
import { CollaborationUser } from './types';

// Simple test to verify Socket.IO server functionality
async function testSocketServer() {
  console.log('Testing Socket.IO server...');

  // Create test client
  const client = Client('ws://localhost:3001', {
    transports: ['websocket', 'polling']
  });

  // Test user data
  const testUser: CollaborationUser = {
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com',
    status: 'online',
    lastActivity: new Date(),
    cursorColor: '#ff0000'
  };

  const testGroupId = 'test-group-1';

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.disconnect();
      reject(new Error('Test timeout'));
    }, 10000);

    client.on('connect', () => {
      console.log('✓ Client connected to server');

      // Test joining collaboration
      client.emit('join-collaboration', { groupId: testGroupId, user: testUser });
    });

    client.on('connection-status', (status) => {
      console.log('✓ Received connection status:', status);
    });

    client.on('user-joined', (user) => {
      console.log('✓ User joined event received:', user.name);
    });

    // Test cursor update
    setTimeout(() => {
      const testCursor = {
        line: 1,
        column: 1,
        userId: testUser.id,
        userName: testUser.name,
        color: testUser.cursorColor,
        timestamp: Date.now()
      };

      client.emit('cursor-update', {
        groupId: testGroupId,
        fileId: 'test-file-1',
        cursor: testCursor
      });

      console.log('✓ Cursor update sent');
    }, 1000);

    // Test typing indicator
    setTimeout(() => {
      client.emit('typing-start', {
        groupId: testGroupId,
        fileId: 'test-file-1',
        userId: testUser.id
      });

      console.log('✓ Typing start sent');
    }, 2000);

    // Test leaving collaboration
    setTimeout(() => {
      client.emit('leave-collaboration', {
        groupId: testGroupId,
        userId: testUser.id
      });

      console.log('✓ Leave collaboration sent');
    }, 3000);

    // Complete test
    setTimeout(() => {
      clearTimeout(timeout);
      client.disconnect();
      console.log('✓ Socket.IO server test completed successfully');
      resolve();
    }, 4000);

    client.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.error('✗ Connection error:', error);
      reject(error);
    });

    client.on('disconnect', (reason) => {
      console.log('Client disconnected:', reason);
    });
  });
}

// Run test if this file is executed directly
if (require.main === module) {
  testSocketServer()
    .then(() => {
      console.log('All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testSocketServer };
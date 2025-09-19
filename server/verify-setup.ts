import { CollaborationSocketServer } from './collaboration-socket-server';
import { CollaborationUser } from './types';

// Simple verification script to test the Socket.IO server setup
console.log('Verifying Socket.IO server setup...');

// Test 1: Server class instantiation
try {
  const mockIo = {
    on: () => {},
    to: () => ({ emit: () => {} })
  } as any;
  
  const server = new CollaborationSocketServer(mockIo);
  console.log('✓ CollaborationSocketServer class instantiated successfully');
  
  // Test 2: Initialize method exists
  if (typeof server.initialize === 'function') {
    console.log('✓ initialize method exists');
  } else {
    throw new Error('initialize method not found');
  }
  
  // Test 3: Public methods exist
  const methods = ['getActiveUsers', 'getUserCount', 'isUserOnline'];
  methods.forEach(method => {
    if (typeof (server as any)[method] === 'function') {
      console.log(`✓ ${method} method exists`);
    } else {
      throw new Error(`${method} method not found`);
    }
  });
  
  // Test 4: Type definitions
  const testUser: CollaborationUser = {
    id: 'test-user',
    name: 'Test User',
    status: 'online',
    lastActivity: new Date(),
    cursorColor: '#ff0000'
  };
  
  console.log('✓ CollaborationUser type definition works');
  
  // Test 5: Server initialization (without actual Socket.IO)
  server.initialize();
  console.log('✓ Server initialization completed without errors');
  
  console.log('\n🎉 All Socket.IO server setup verifications passed!');
  console.log('\nNext steps:');
  console.log('1. Start the server: npm run server:dev');
  console.log('2. Test with a client connection');
  console.log('3. Integrate with the collaborative editor components');
  
} catch (error) {
  console.error('✗ Verification failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
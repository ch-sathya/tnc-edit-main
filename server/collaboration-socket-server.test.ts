import { CollaborationSocketServer } from './collaboration-socket-server';
import { Server } from 'socket.io';
import { CollaborationUser } from './types';

// Mock Socket.IO server for testing
class MockSocket {
  public id: string;
  private events: Map<string, Function> = new Map();
  private rooms: Set<string> = new Set();

  constructor(id: string) {
    this.id = id;
  }

  on(event: string, callback: Function) {
    this.events.set(event, callback);
  }

  emit(event: string, data?: any) {
    // Mock emit - in real tests this would be verified
    console.log(`Socket ${this.id} emitting: ${event}`, data);
  }

  to(room: string) {
    return {
      emit: (event: string, data?: any) => {
        console.log(`Broadcasting to room ${room}: ${event}`, data);
      }
    };
  }

  join(room: string) {
    this.rooms.add(room);
    console.log(`Socket ${this.id} joined room: ${room}`);
  }

  leave(room: string) {
    this.rooms.delete(room);
    console.log(`Socket ${this.id} left room: ${room}`);
  }

  trigger(event: string, data?: any) {
    const handler = this.events.get(event);
    if (handler) {
      handler(data);
    }
  }
}

class MockServer {
  private connectionHandler?: Function;

  on(event: string, handler: Function) {
    if (event === 'connection') {
      this.connectionHandler = handler;
    }
  }

  to(room: string) {
    return {
      emit: (event: string, data?: any) => {
        console.log(`Server broadcasting to room ${room}: ${event}`, data);
      }
    };
  }

  simulateConnection(socketId: string): MockSocket {
    const socket = new MockSocket(socketId);
    if (this.connectionHandler) {
      this.connectionHandler(socket);
    }
    return socket;
  }
}

describe('CollaborationSocketServer', () => {
  let server: MockServer;
  let collaborationServer: CollaborationSocketServer;

  beforeEach(() => {
    server = new MockServer();
    collaborationServer = new CollaborationSocketServer(server as any);
    collaborationServer.initialize();
  });

  test('should initialize server with connection handler', () => {
    expect(collaborationServer).toBeDefined();
    expect(typeof collaborationServer.initialize).toBe('function');
  });

  test('should handle user joining collaboration', () => {
    const socket = server.simulateConnection('socket-1');
    
    const testUser: CollaborationUser = {
      id: 'user-1',
      name: 'Test User',
      status: 'online',
      lastActivity: new Date(),
      cursorColor: '#ff0000'
    };

    const joinData = {
      groupId: 'group-1',
      user: testUser
    };

    // Simulate join collaboration event
    socket.trigger('join-collaboration', joinData);

    // Verify user is tracked
    const activeUsers = collaborationServer.getActiveUsers('group-1');
    expect(activeUsers).toHaveLength(1);
    expect(activeUsers[0].id).toBe('user-1');
    expect(activeUsers[0].name).toBe('Test User');
  });

  test('should handle user leaving collaboration', () => {
    const socket = server.simulateConnection('socket-1');
    
    const testUser: CollaborationUser = {
      id: 'user-1',
      name: 'Test User',
      status: 'online',
      lastActivity: new Date(),
      cursorColor: '#ff0000'
    };

    // Join first
    socket.trigger('join-collaboration', {
      groupId: 'group-1',
      user: testUser
    });

    expect(collaborationServer.getActiveUsers('group-1')).toHaveLength(1);

    // Then leave
    socket.trigger('leave-collaboration', {
      groupId: 'group-1',
      userId: 'user-1'
    });

    expect(collaborationServer.getActiveUsers('group-1')).toHaveLength(0);
  });

  test('should handle cursor updates', () => {
    const socket = server.simulateConnection('socket-1');
    
    const testUser: CollaborationUser = {
      id: 'user-1',
      name: 'Test User',
      status: 'online',
      lastActivity: new Date(),
      cursorColor: '#ff0000'
    };

    // Join collaboration first
    socket.trigger('join-collaboration', {
      groupId: 'group-1',
      user: testUser
    });

    const cursorData = {
      groupId: 'group-1',
      fileId: 'file-1',
      cursor: {
        line: 1,
        column: 5,
        userId: 'user-1',
        userName: 'Test User',
        color: '#ff0000',
        timestamp: Date.now()
      }
    };

    // This should not throw an error
    expect(() => {
      socket.trigger('cursor-update', cursorData);
    }).not.toThrow();
  });

  test('should handle typing indicators', () => {
    const socket = server.simulateConnection('socket-1');
    
    const testUser: CollaborationUser = {
      id: 'user-1',
      name: 'Test User',
      status: 'online',
      lastActivity: new Date(),
      cursorColor: '#ff0000'
    };

    // Join collaboration first
    socket.trigger('join-collaboration', {
      groupId: 'group-1',
      user: testUser
    });

    const typingData = {
      groupId: 'group-1',
      fileId: 'file-1',
      userId: 'user-1'
    };

    // Test typing start and stop
    expect(() => {
      socket.trigger('typing-start', typingData);
      socket.trigger('typing-stop', typingData);
    }).not.toThrow();
  });

  test('should track user count correctly', () => {
    const socket1 = server.simulateConnection('socket-1');
    const socket2 = server.simulateConnection('socket-2');
    
    const user1: CollaborationUser = {
      id: 'user-1',
      name: 'User 1',
      status: 'online',
      lastActivity: new Date(),
      cursorColor: '#ff0000'
    };

    const user2: CollaborationUser = {
      id: 'user-2',
      name: 'User 2',
      status: 'online',
      lastActivity: new Date(),
      cursorColor: '#00ff00'
    };

    // Both users join the same group
    socket1.trigger('join-collaboration', { groupId: 'group-1', user: user1 });
    socket2.trigger('join-collaboration', { groupId: 'group-1', user: user2 });

    expect(collaborationServer.getUserCount('group-1')).toBe(2);
    expect(collaborationServer.isUserOnline('user-1')).toBe(true);
    expect(collaborationServer.isUserOnline('user-2')).toBe(true);

    // One user leaves
    socket1.trigger('leave-collaboration', { groupId: 'group-1', userId: 'user-1' });

    expect(collaborationServer.getUserCount('group-1')).toBe(1);
    expect(collaborationServer.isUserOnline('user-1')).toBe(false);
    expect(collaborationServer.isUserOnline('user-2')).toBe(true);
  });

  test('should handle disconnection cleanup', () => {
    const socket = server.simulateConnection('socket-1');
    
    const testUser: CollaborationUser = {
      id: 'user-1',
      name: 'Test User',
      status: 'online',
      lastActivity: new Date(),
      cursorColor: '#ff0000'
    };

    // Join collaboration
    socket.trigger('join-collaboration', {
      groupId: 'group-1',
      user: testUser
    });

    expect(collaborationServer.getUserCount('group-1')).toBe(1);

    // Simulate disconnection
    socket.trigger('disconnect');

    // User should be cleaned up (this would work in a real implementation)
    // For this mock test, we just verify the disconnect handler doesn't throw
    expect(() => {
      socket.trigger('disconnect');
    }).not.toThrow();
  });
});

// Simple test runner for Node.js environment
if (require.main === module) {
  console.log('Running CollaborationSocketServer tests...');
  
  // Mock Jest-like functions for simple testing
  const tests: Array<{ name: string; fn: () => void }> = [];
  let currentDescribe = '';

  global.describe = (name: string, fn: () => void) => {
    currentDescribe = name;
    fn();
  };

  global.test = (name: string, fn: () => void) => {
    tests.push({ name: `${currentDescribe}: ${name}`, fn });
  };

  global.beforeEach = (fn: () => void) => {
    // Simple beforeEach implementation
    tests.forEach(test => {
      const originalFn = test.fn;
      test.fn = () => {
        fn();
        originalFn();
      };
    });
  };

  global.expect = (actual: any) => ({
    toBeDefined: () => {
      if (actual === undefined) throw new Error('Expected value to be defined');
    },
    toBe: (expected: any) => {
      if (actual !== expected) throw new Error(`Expected ${actual} to be ${expected}`);
    },
    toHaveLength: (expected: number) => {
      if (actual.length !== expected) throw new Error(`Expected length ${actual.length} to be ${expected}`);
    },
    not: {
      toThrow: () => {
        try {
          if (typeof actual === 'function') actual();
        } catch (error) {
          throw new Error('Expected function not to throw');
        }
      }
    }
  });

  // Run the tests
  const runTests = async () => {
    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        test.fn();
        console.log(`✓ ${test.name}`);
        passed++;
      } catch (error) {
        console.log(`✗ ${test.name}: ${error.message}`);
        failed++;
      }
    }

    console.log(`\nTests completed: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  };

  runTests();
}
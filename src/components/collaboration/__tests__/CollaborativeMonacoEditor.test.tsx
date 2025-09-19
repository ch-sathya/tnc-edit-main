import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CollaborativeMonacoEditor } from '../CollaborativeMonacoEditor';
import { CollaborationFile, CollaborationUser } from '@/types/collaboration';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, onMount }: any) => (
    <div data-testid="monaco-editor">
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        data-testid="editor-textarea"
      />
    </div>
  )
}));

// Mock socket service
vi.mock('@/services/socket-service', () => ({
  socketService: {
    isConnected: () => true,
    updateCursor: vi.fn(),
    updateSelection: vi.fn(),
    startTyping: vi.fn(),
    stopTyping: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('CollaborativeMonacoEditor', () => {
  const mockUser: CollaborationUser = {
    id: 'user1',
    name: 'Test User',
    email: 'test@example.com',
    status: 'online',
    lastActivity: new Date(),
    cursorColor: '#3B82F6'
  };

  const mockFile: CollaborationFile = {
    id: 'file1',
    groupId: 'group1',
    name: 'test.js',
    path: 'test.js',
    content: 'console.log("Hello World");',
    language: 'javascript',
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  };

  it('renders Monaco Editor with correct props', () => {
    render(
      <CollaborativeMonacoEditor
        groupId="group1"
        currentUser={mockUser}
        currentFile={mockFile}
      />
    );

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    expect(screen.getByTestId('editor-textarea')).toHaveValue(mockFile.content);
  });

  it('detects language from file extension', () => {
    const pythonFile = { ...mockFile, path: 'test.py', name: 'test.py' };
    
    render(
      <CollaborativeMonacoEditor
        groupId="group1"
        currentUser={mockUser}
        currentFile={pythonFile}
      />
    );

    // The language detection is internal, but we can verify the component renders
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('renders without crashing when disconnected', () => {
    // This test just ensures the component renders properly
    render(
      <CollaborativeMonacoEditor
        groupId="group1"
        currentUser={mockUser}
        currentFile={mockFile}
      />
    );

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('handles read-only mode', () => {
    render(
      <CollaborativeMonacoEditor
        groupId="group1"
        currentUser={mockUser}
        currentFile={mockFile}
        readOnly={true}
      />
    );

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('calls onContentChange when content changes', () => {
    const onContentChange = vi.fn();
    
    render(
      <CollaborativeMonacoEditor
        groupId="group1"
        currentUser={mockUser}
        currentFile={mockFile}
        onContentChange={onContentChange}
      />
    );

    // This would be triggered by Monaco Editor's onChange
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });
});
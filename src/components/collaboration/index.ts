// Core collaboration components
export { default as CollaborativeMonacoEditor } from './CollaborativeMonacoEditor';
export { CollaborationFileExplorer } from './CollaborationFileExplorer';

// Enhanced file accessibility components
export { FileBrowserSidebar } from './FileBrowserSidebar';
export { FileTemplatesModal } from './FileTemplatesModal';
export { EnhancedFileExplorer } from './EnhancedFileExplorer';

// Cursor and presence management components
export { default as CursorManager } from './CursorManager';
export { default as PresenceManager } from './PresenceManager';

// User interface components
export { default as ActiveUsersList } from './ActiveUsersList';
export { default as TypingIndicator } from './TypingIndicator';
export { default as PresenceStatus } from './PresenceStatus';

// Project file management components
export { ProjectFileManager } from './ProjectFileManager';
export { FilePermissionsManager } from './FilePermissionsManager';
export { QuickAccessPanel } from './QuickAccessPanel';
export { EnhancedProjectCollaborationRoom } from './EnhancedProjectCollaborationRoom';
export { ProjectFileManagementDemo } from './ProjectFileManagementDemo';

// Existing components
export { default as CollaborationDemo } from './CollaborationDemo';
export { default as SocketConnectionStatus } from './SocketConnectionStatus';

// Re-export types for convenience
export type {
  CursorPosition,
  TextSelection,
  CollaborationUser
} from '@/types/collaboration';
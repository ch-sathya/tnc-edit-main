// User and collaboration types
export interface CollaborationUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  currentFile?: string;
  lastActivity: Date;
  cursorColor: string;
}

// Cursor and selection types
export interface CursorPosition {
  line: number;
  column: number;
  userId: string;
  userName: string;
  color: string;
  timestamp: number;
}

export interface TextSelection {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  userId: string;
  userName: string;
  color: string;
}

// File and collaboration types
export interface CollaborationFile {
  id: string;
  groupId: string;
  name: string;
  path: string;
  content: string;
  language: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface EditorChange {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  text: string;
  rangeLength: number;
  userId: string;
  timestamp: number;
  version: number;
}

// Session and room types
export interface CollaborationSession {
  id: string;
  groupId: string;
  userId: string;
  currentFileId?: string;
  status: 'online' | 'away' | 'offline';
  lastActivity: Date;
  cursorPosition?: CursorPosition;
  joinedAt: Date;
}

// Socket event data types
export interface JoinCollaborationData {
  groupId: string;
  user: CollaborationUser;
}

export interface LeaveCollaborationData {
  groupId: string;
  userId: string;
}

export interface CursorUpdateData {
  groupId: string;
  fileId: string;
  cursor: CursorPosition;
}

export interface SelectionUpdateData {
  groupId: string;
  fileId: string;
  selection: TextSelection;
}

export interface TypingData {
  groupId: string;
  fileId: string;
  userId: string;
}

export interface FileSwitchData {
  groupId: string;
  fileId: string;
  userId: string;
}

export interface UserActivityData {
  groupId: string;
  userId: string;
}

// Connection status types
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'auth_error';

// Room management types
export interface CollaborationRoom {
  id: string;
  groupId: string;
  activeUsers: CollaborationUser[];
  currentFiles: string[];
  createdAt: Date;
}
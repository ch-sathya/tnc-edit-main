import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Base types from Supabase
export type CollaborationRoomRow = Tables<'collaboration_rooms'>;
export type CollaborationCodeRow = Tables<'collaboration_code'>;
export type CollaborationRoomInsert = TablesInsert<'collaboration_rooms'>;
export type CollaborationRoomUpdate = TablesUpdate<'collaboration_rooms'>;
export type CollaborationCodeInsert = TablesInsert<'collaboration_code'>;
export type CollaborationCodeUpdate = TablesUpdate<'collaboration_code'>;

// Enhanced CollaborationFile interface based on design document
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
  category?: string;
  tags?: string[];
  isBookmarked?: boolean;
  permissions?: FilePermissions;
}

// File permissions and access control
export interface FilePermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
  sharedWith?: string[]; // User IDs
}

// File categorization and organization
export interface FileCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
}

// Quick access and bookmarks
export interface FileBookmark {
  id: string;
  fileId: string;
  userId: string;
  name?: string; // Custom bookmark name
  createdAt: Date;
}

// File templates for quick creation
export interface FileTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  content: string;
  category: string;
  tags: string[];
}

// Project structure management
export interface ProjectStructure {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  folders: FolderStructure[];
  templates: FileTemplate[];
  createdBy: string;
  createdAt: Date;
}

// CollaborationUser interface for real-time presence
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

// EditorChange interface for operational transformation
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

// Cursor and selection tracking interfaces
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

// File change tracking for operational transformation
export interface FileChange {
  id: string;
  fileId: string;
  userId: string;
  operationType: 'insert' | 'delete' | 'replace';
  positionStart: number;
  positionEnd?: number;
  content?: string;
  version: number;
  timestamp: Date;
  applied: boolean;
}

// Socket.IO event interfaces
export interface ClientToServerEvents {
  'join-collaboration': (data: { groupId: string; user: CollaborationUser }) => void;
  'leave-collaboration': (data: { groupId: string; userId: string }) => void;
  'cursor-update': (data: { groupId: string; fileId: string; cursor: CursorPosition }) => void;
  'selection-update': (data: { groupId: string; fileId: string; selection: TextSelection }) => void;
  'typing-start': (data: { groupId: string; fileId: string; userId: string }) => void;
  'typing-stop': (data: { groupId: string; fileId: string; userId: string }) => void;
  'file-switch': (data: { groupId: string; fileId: string; userId: string }) => void;
}

export interface ServerToClientEvents {
  'user-joined': (user: CollaborationUser) => void;
  'user-left': (userId: string) => void;
  'cursor-updated': (data: { fileId: string; cursor: CursorPosition }) => void;
  'selection-updated': (data: { fileId: string; selection: TextSelection }) => void;
  'user-typing': (data: { fileId: string; userId: string; isTyping: boolean }) => void;
  'file-switched': (data: { fileId: string; userId: string }) => void;
  'connection-status': (status: 'connected' | 'disconnected') => void;
}

// API response types
export interface CollaborationFilesResponse {
  files: CollaborationFile[];
  total: number;
}

export interface CollaborationSessionResponse {
  users: CollaborationUser[];
  currentFile?: CollaborationFile;
}

// Folder structure for project organization
export interface FolderStructure {
  path: string;
  name: string;
  description?: string;
  category?: string;
  children: FolderStructure[];
}

// Request types
export interface CreateFileRequest {
  name: string;
  path: string;
  content?: string;
  language: string;
  groupId: string;
  createdBy?: string;
  category?: string;
  tags?: string[];
  templateId?: string;
}

export interface UpdateFileRequest {
  content?: string;
  language?: string;
  version: number;
}

export interface JoinSessionRequest {
  groupId: string;
  user: Omit<CollaborationUser, 'lastActivity'>;
}

// Error types
export interface CollaborationError {
  message: string;
  code?: string;
  details?: any;
}
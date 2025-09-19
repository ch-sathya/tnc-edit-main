import { z } from 'zod';

// Base validation schemas
export const collaborationFileSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  name: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  path: z.string().min(1, 'File path is required').max(500, 'File path too long'),
  content: z.string(),
  language: z.string().min(1, 'Language is required').max(50, 'Language name too long'),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().int().positive(),
});

export const collaborationUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'User name is required').max(100, 'User name too long'),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
  status: z.enum(['online', 'away', 'offline']),
  currentFile: z.string().uuid().optional(),
  lastActivity: z.date(),
  cursorColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
});

export const editorChangeSchema = z.object({
  range: z.object({
    startLineNumber: z.number().int().positive(),
    startColumn: z.number().int().positive(),
    endLineNumber: z.number().int().positive(),
    endColumn: z.number().int().positive(),
  }),
  text: z.string(),
  rangeLength: z.number().int().min(0),
  userId: z.string().uuid(),
  timestamp: z.number().int().positive(),
  version: z.number().int().positive(),
});

export const cursorPositionSchema = z.object({
  line: z.number().int().positive(),
  column: z.number().int().min(0),
  userId: z.string().uuid(),
  userName: z.string().min(1, 'User name is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  timestamp: z.number().int().positive(),
});

export const textSelectionSchema = z.object({
  startLine: z.number().int().positive(),
  startColumn: z.number().int().min(0),
  endLine: z.number().int().positive(),
  endColumn: z.number().int().min(0),
  userId: z.string().uuid(),
  userName: z.string().min(1, 'User name is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
});

export const fileChangeSchema = z.object({
  id: z.string().uuid(),
  fileId: z.string().uuid(),
  userId: z.string().uuid(),
  operationType: z.enum(['insert', 'delete', 'replace']),
  positionStart: z.number().int().min(0),
  positionEnd: z.number().int().min(0).optional(),
  content: z.string().optional(),
  version: z.number().int().positive(),
  timestamp: z.date(),
  applied: z.boolean(),
});

// Request validation schemas
export const createFileRequestSchema = z.object({
  name: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  path: z.string().min(1, 'File path is required').max(500, 'File path too long'),
  content: z.string().optional().default(''),
  language: z.string().min(1, 'Language is required').max(50, 'Language name too long'),
  groupId: z.string().uuid(),
});

export const updateFileRequestSchema = z.object({
  content: z.string().optional(),
  language: z.string().min(1, 'Language is required').max(50, 'Language name too long').optional(),
  version: z.number().int().positive(),
});

export const joinSessionRequestSchema = z.object({
  groupId: z.string().uuid(),
  user: collaborationUserSchema.omit({ lastActivity: true }),
});

// Socket.IO event validation schemas
export const joinCollaborationEventSchema = z.object({
  groupId: z.string().uuid(),
  user: collaborationUserSchema,
});

export const leaveCollaborationEventSchema = z.object({
  groupId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const cursorUpdateEventSchema = z.object({
  groupId: z.string().uuid(),
  fileId: z.string().uuid(),
  cursor: cursorPositionSchema,
});

export const selectionUpdateEventSchema = z.object({
  groupId: z.string().uuid(),
  fileId: z.string().uuid(),
  selection: textSelectionSchema,
});

export const typingEventSchema = z.object({
  groupId: z.string().uuid(),
  fileId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const fileSwitchEventSchema = z.object({
  groupId: z.string().uuid(),
  fileId: z.string().uuid(),
  userId: z.string().uuid(),
});

// Utility functions for validation
export const validateCollaborationFile = (data: unknown) => {
  return collaborationFileSchema.parse(data);
};

export const validateCollaborationUser = (data: unknown) => {
  return collaborationUserSchema.parse(data);
};

export const validateEditorChange = (data: unknown) => {
  return editorChangeSchema.parse(data);
};

export const validateCreateFileRequest = (data: unknown) => {
  return createFileRequestSchema.parse(data);
};

export const validateUpdateFileRequest = (data: unknown) => {
  return updateFileRequestSchema.parse(data);
};

export const validateJoinSessionRequest = (data: unknown) => {
  return joinSessionRequestSchema.parse(data);
};

// Safe validation functions that return results instead of throwing
export const safeValidateCollaborationFile = (data: unknown) => {
  return collaborationFileSchema.safeParse(data);
};

export const safeValidateCollaborationUser = (data: unknown) => {
  return collaborationUserSchema.safeParse(data);
};

export const safeValidateEditorChange = (data: unknown) => {
  return editorChangeSchema.safeParse(data);
};

export const safeValidateCreateFileRequest = (data: unknown) => {
  return createFileRequestSchema.safeParse(data);
};

export const safeValidateUpdateFileRequest = (data: unknown) => {
  return updateFileRequestSchema.safeParse(data);
};

export const safeValidateJoinSessionRequest = (data: unknown) => {
  return joinSessionRequestSchema.safeParse(data);
};
import { supabase } from '@/integrations/supabase/client';
import type {
  CollaborationFile,
  CollaborationUser,
  CreateFileRequest,
  UpdateFileRequest,
  CollaborationFilesResponse,
  CollaborationSessionResponse,
  CollaborationError,
  FileChange,
} from '@/types/collaboration';
import {
  validateCreateFileRequest,
  validateUpdateFileRequest,
  safeValidateCollaborationFile,
} from './collaboration-schemas';

/**
 * Collaboration client utilities for Supabase operations
 */
export class CollaborationClient {
  /**
   * Create a new collaboration file
   */
  static async createFile(request: CreateFileRequest): Promise<CollaborationFile> {
    try {
      // Validate the request
      const validatedRequest = validateCreateFileRequest(request);
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Insert into collaboration_code table (using existing schema)
      const { data, error } = await supabase
        .from('collaboration_code')
        .insert({
          room_id: validatedRequest.groupId,
          content: validatedRequest.content,
          language: validatedRequest.language,
          updated_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create file: ${error.message}`);
      }

      // Transform to CollaborationFile interface
      const collaborationFile: CollaborationFile = {
        id: data.id,
        groupId: data.room_id,
        name: validatedRequest.name,
        path: validatedRequest.path,
        content: data.content,
        language: data.language,
        createdBy: data.updated_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        version: 1, // Initial version
      };

      return collaborationFile;
    } catch (error) {
      throw new Error(`Failed to create collaboration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a collaboration file by ID
   */
  static async getFile(fileId: string): Promise<CollaborationFile | null> {
    try {
      const { data, error } = await supabase
        .from('collaboration_code')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // File not found
        }
        throw new Error(`Failed to get file: ${error.message}`);
      }

      // Transform to CollaborationFile interface
      const collaborationFile: CollaborationFile = {
        id: data.id,
        groupId: data.room_id,
        name: `file_${data.id}`, // Default name since it's not in the current schema
        path: `/${data.language}/file_${data.id}`, // Default path
        content: data.content,
        language: data.language,
        createdBy: data.updated_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        version: 1, // Default version
      };

      return collaborationFile;
    } catch (error) {
      throw new Error(`Failed to get collaboration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a collaboration file
   */
  static async updateFile(fileId: string, request: UpdateFileRequest): Promise<CollaborationFile> {
    try {
      // Validate the request
      const validatedRequest = validateUpdateFileRequest(request);
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Update the file
      const updateData: any = {
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (validatedRequest.content !== undefined) {
        updateData.content = validatedRequest.content;
      }
      if (validatedRequest.language !== undefined) {
        updateData.language = validatedRequest.language;
      }

      const { data, error } = await supabase
        .from('collaboration_code')
        .update(updateData)
        .eq('id', fileId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update file: ${error.message}`);
      }

      // Transform to CollaborationFile interface
      const collaborationFile: CollaborationFile = {
        id: data.id,
        groupId: data.room_id,
        name: `file_${data.id}`,
        path: `/${data.language}/file_${data.id}`,
        content: data.content,
        language: data.language,
        createdBy: data.updated_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        version: validatedRequest.version + 1,
      };

      return collaborationFile;
    } catch (error) {
      throw new Error(`Failed to update collaboration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a collaboration file
   */
  static async deleteFile(fileId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('collaboration_code')
        .delete()
        .eq('id', fileId);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete collaboration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all files for a collaboration room/group
   */
  static async getFilesForGroup(groupId: string): Promise<CollaborationFilesResponse> {
    try {
      const { data, error } = await supabase
        .from('collaboration_code')
        .select('*')
        .eq('room_id', groupId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get files: ${error.message}`);
      }

      // Transform to CollaborationFile interfaces
      const files: CollaborationFile[] = data.map(item => ({
        id: item.id,
        groupId: item.room_id,
        name: `file_${item.id}`,
        path: `/${item.language}/file_${item.id}`,
        content: item.content,
        language: item.language,
        createdBy: item.updated_by,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        version: 1,
      }));

      return {
        files,
        total: files.length,
      };
    } catch (error) {
      throw new Error(`Failed to get collaboration files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Subscribe to real-time file changes for a group
   */
  static subscribeToFileChanges(
    groupId: string,
    onFileChange: (file: CollaborationFile) => void,
    onFileDelete: (fileId: string) => void
  ) {
    const channel = supabase
      .channel(`collaboration_files_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collaboration_code',
          filter: `room_id=eq.${groupId}`,
        },
        (payload) => {
          const data = payload.new;
          const file: CollaborationFile = {
            id: data.id,
            groupId: data.room_id,
            name: `file_${data.id}`,
            path: `/${data.language}/file_${data.id}`,
            content: data.content,
            language: data.language,
            createdBy: data.updated_by,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            version: 1,
          };
          onFileChange(file);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collaboration_code',
          filter: `room_id=eq.${groupId}`,
        },
        (payload) => {
          const data = payload.new;
          const file: CollaborationFile = {
            id: data.id,
            groupId: data.room_id,
            name: `file_${data.id}`,
            path: `/${data.language}/file_${data.id}`,
            content: data.content,
            language: data.language,
            createdBy: data.updated_by,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
            version: 1,
          };
          onFileChange(file);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'collaboration_code',
          filter: `room_id=eq.${groupId}`,
        },
        (payload) => {
          onFileDelete(payload.old.id);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Unsubscribe from real-time changes
   */
  static unsubscribeFromFileChanges(channel: any) {
    return supabase.removeChannel(channel);
  }

  /**
   * Get collaboration room details
   */
  static async getCollaborationRoom(roomId: string) {
    try {
      const { data, error } = await supabase
        .from('collaboration_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Room not found
        }
        throw new Error(`Failed to get collaboration room: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to get collaboration room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new collaboration room
   */
  static async createCollaborationRoom(name: string, description?: string, isPrivate = false) {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('collaboration_rooms')
        .insert({
          name,
          description,
          is_private: isPrivate,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create collaboration room: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to create collaboration room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect programming language from file extension
   */
  static detectLanguageFromPath(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
    };

    return languageMap[extension || ''] || 'plaintext';
  }

  /**
   * Generate a unique cursor color for a user
   */
  static generateCursorColor(userId: string): string {
    // Generate a consistent color based on user ID
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    
    // Simple hash function to get consistent color for user
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}

/**
 * Error handling utilities
 */
export const handleCollaborationError = (error: unknown): CollaborationError => {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'COLLABORATION_ERROR',
      details: error,
    };
  }
  
  return {
    message: 'An unknown collaboration error occurred',
    code: 'UNKNOWN_ERROR',
    details: error,
  };
};

/**
 * Utility functions for file operations
 */
export const collaborationUtils = {
  /**
   * Validate file name
   */
  isValidFileName: (name: string): boolean => {
    const invalidChars = /[<>:"/\\|?*]/;
    return !invalidChars.test(name) && name.length > 0 && name.length <= 255;
  },

  /**
   * Validate file path
   */
  isValidFilePath: (path: string): boolean => {
    return path.length > 0 && path.length <= 500 && !path.includes('..');
  },

  /**
   * Get file extension from path
   */
  getFileExtension: (path: string): string => {
    const fileName = path.split('/').pop() || path;
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  },

  /**
   * Get file name from path
   */
  getFileName: (path: string): string => {
    return path.split('/').pop() || path;
  },

  /**
   * Get directory from path
   */
  getDirectory: (path: string): string => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
  },
};
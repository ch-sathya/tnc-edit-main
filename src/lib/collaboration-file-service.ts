import { supabase } from '@/integrations/supabase/client';
import { 
  CollaborationFile, 
  CreateFileRequest, 
  UpdateFileRequest,
  FileChange,
} from '@/types/collaboration';
import { 
  validateCreateFileRequest, 
  validateUpdateFileRequest,
} from '@/lib/collaboration-schemas';

// Define the row type manually since the table was just created
interface CollaborationFileRow {
  id: string;
  group_id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

/**
 * Language detection based on file extensions
 */
const LANGUAGE_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  
  // Web technologies
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  
  // Python
  '.py': 'python',
  '.pyw': 'python',
  '.pyi': 'python',
  
  // Java
  '.java': 'java',
  '.class': 'java',
  
  // C/C++
  '.c': 'c',
  '.cpp': 'cpp',
  '.cxx': 'cpp',
  '.cc': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.hxx': 'cpp',
  
  // Other languages
  '.json': 'json',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.fish': 'shell',
  '.ps1': 'powershell',
  '.php': 'php',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.r': 'r',
  '.R': 'r',
  '.m': 'objective-c',
  '.mm': 'objective-cpp',
  '.pl': 'perl',
  '.lua': 'lua',
  '.vim': 'vim',
  '.dockerfile': 'dockerfile',
  '.gitignore': 'gitignore',
  '.env': 'dotenv',
  '.ini': 'ini',
  '.toml': 'toml',
  '.conf': 'conf',
  '.cfg': 'conf',
};

/**
 * Detects programming language based on file extension
 */
export function detectLanguage(filename: string): string {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return LANGUAGE_MAP[extension] || 'plaintext';
}

/**
 * Converts database row to CollaborationFile interface
 */
function mapRowToCollaborationFile(row: CollaborationFileRow): CollaborationFile {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    path: row.path,
    content: row.content,
    language: row.language,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    version: row.version,
  };
}

/**
 * Service class for managing collaboration files with CRUD operations,
 * language detection, and conflict resolution
 */
export class CollaborationFileService {
  /**
   * Creates a new collaboration file
   */
  async createFile(request: CreateFileRequest): Promise<CollaborationFile> {
    try {
      // Validate request
      const validatedRequest = validateCreateFileRequest(request);
      
      // Auto-detect language if not provided or is default
      const language = validatedRequest.language === 'plaintext' || !validatedRequest.language
        ? detectLanguage(validatedRequest.name)
        : validatedRequest.language;

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Insert file into database using type assertion
      const { data, error } = await supabase
        .from('collaboration_files' as any)
        .insert({
          group_id: validatedRequest.groupId,
          name: validatedRequest.name,
          path: validatedRequest.path,
          content: validatedRequest.content || '',
          language,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error(`File already exists at path: ${validatedRequest.path}`);
        }
        throw new Error(`Failed to create file: ${error.message}`);
      }

      return mapRowToCollaborationFile(data as unknown as CollaborationFileRow);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while creating file');
    }
  }

  /**
   * Retrieves a collaboration file by ID
   */
  async getFile(fileId: string): Promise<CollaborationFile | null> {
    try {
      const { data, error } = await supabase
        .from('collaboration_files' as any)
        .select('*')
        .eq('id', fileId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw new Error(`Failed to retrieve file: ${error.message}`);
      }

      return mapRowToCollaborationFile(data as unknown as CollaborationFileRow);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while retrieving file');
    }
  }

  /**
   * Retrieves all collaboration files for a group
   */
  async getFilesByGroup(groupId: string): Promise<CollaborationFile[]> {
    try {
      const { data, error } = await supabase
        .from('collaboration_files' as any)
        .select('*')
        .eq('group_id', groupId)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to retrieve files: ${error.message}`);
      }

      return (data as unknown as CollaborationFileRow[]).map(mapRowToCollaborationFile);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while retrieving files');
    }
  }

  /**
   * Updates a collaboration file with conflict detection
   */
  async updateFile(fileId: string, request: UpdateFileRequest): Promise<CollaborationFile> {
    try {
      // Validate request
      const validatedRequest = validateUpdateFileRequest(request);

      // Get current file to check version
      const currentFile = await this.getFile(fileId);
      if (!currentFile) {
        throw new Error('File not found');
      }

      // Check for version conflicts
      if (currentFile.version !== validatedRequest.version) {
        throw new Error(
          `Version conflict: expected version ${validatedRequest.version}, but current version is ${currentFile.version}`
        );
      }

      // Prepare update data
      const updateData: Record<string, any> = {
        version: currentFile.version + 1,
        updated_at: new Date().toISOString(),
      };

      if (validatedRequest.content !== undefined) {
        updateData.content = validatedRequest.content;
      }

      if (validatedRequest.language !== undefined) {
        updateData.language = validatedRequest.language;
      }

      // Update file in database
      const { data, error } = await supabase
        .from('collaboration_files' as any)
        .update(updateData)
        .eq('id', fileId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update file: ${error.message}`);
      }

      return mapRowToCollaborationFile(data as unknown as CollaborationFileRow);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while updating file');
    }
  }

  /**
   * Deletes a collaboration file
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('collaboration_files' as any)
        .delete()
        .eq('id', fileId);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while deleting file');
    }
  }

  /**
   * Gets the latest version number of a file
   */
  async getFileVersion(fileId: string): Promise<number> {
    try {
      const file = await this.getFile(fileId);
      return file?.version || 1;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while getting file version');
    }
  }

  /**
   * Applies file changes
   */
  async applyFileChanges(fileId: string, content: string): Promise<number> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Get current file
      const currentFile = await this.getFile(fileId);
      if (!currentFile) {
        throw new Error('File not found');
      }

      const newVersion = currentFile.version + 1;

      // Update the file
      const { error } = await supabase
        .from('collaboration_files' as any)
        .update({
          content,
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);

      if (error) {
        throw new Error(`Failed to apply file changes: ${error.message}`);
      }

      return newVersion;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while applying file changes');
    }
  }

  /**
   * Gets pending changes for a file (for conflict resolution)
   */
  async getPendingChanges(fileId: string): Promise<FileChange[]> {
    try {
      const { data, error } = await supabase
        .from('file_changes' as any)
        .select('*')
        .eq('file_id', fileId)
        .eq('applied', false)
        .order('timestamp', { ascending: true });

      if (error) {
        throw new Error(`Failed to get pending changes: ${error.message}`);
      }

      return (data || []).map((change: any) => ({
        id: change.id,
        fileId,
        userId: change.user_id,
        operationType: change.operation_type as 'insert' | 'delete' | 'replace',
        positionStart: change.position_start,
        positionEnd: change.position_end,
        content: change.content,
        version: change.version,
        timestamp: new Date(change.timestamp),
        applied: false,
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while getting pending changes');
    }
  }

  /**
   * Checks if a file path already exists in a group
   */
  async filePathExists(groupId: string, path: string, excludeFileId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('collaboration_files' as any)
        .select('id')
        .eq('group_id', groupId)
        .eq('path', path);

      if (excludeFileId) {
        query = query.neq('id', excludeFileId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to check file path: ${error.message}`);
      }

      return (data || []).length > 0;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while checking file path');
    }
  }

  /**
   * Renames a file (updates name and path)
   */
  async renameFile(fileId: string, newName: string, newPath: string): Promise<CollaborationFile> {
    try {
      // Get current file
      const currentFile = await this.getFile(fileId);
      if (!currentFile) {
        throw new Error('File not found');
      }

      // Check if new path already exists
      const pathExists = await this.filePathExists(currentFile.groupId, newPath, fileId);
      if (pathExists) {
        throw new Error(`File already exists at path: ${newPath}`);
      }

      // Detect language for new name
      const language = detectLanguage(newName);

      // Update file
      const { data, error } = await supabase
        .from('collaboration_files' as any)
        .update({
          name: newName,
          path: newPath,
          language,
          version: currentFile.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to rename file: ${error.message}`);
      }

      return mapRowToCollaborationFile(data as unknown as CollaborationFileRow);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while renaming file');
    }
  }

  /**
   * Gets file statistics for a group
   */
  async getGroupFileStats(groupId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    languageBreakdown: Record<string, number>;
    recentActivity: Date | null;
  }> {
    try {
      const files = await this.getFilesByGroup(groupId);
      
      const stats = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.content.length, 0),
        languageBreakdown: {} as Record<string, number>,
        recentActivity: files.length > 0 
          ? new Date(Math.max(...files.map(f => f.updatedAt.getTime())))
          : null,
      };

      // Calculate language breakdown
      files.forEach(file => {
        stats.languageBreakdown[file.language] = 
          (stats.languageBreakdown[file.language] || 0) + 1;
      });

      return stats;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while getting file statistics');
    }
  }
}

// Export a singleton instance
export const collaborationFileService = new CollaborationFileService();

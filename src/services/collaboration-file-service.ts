import { supabase } from '@/integrations/supabase/client';
import { CollaborationFile, CreateFileRequest, UpdateFileRequest } from '@/types/collaboration';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type CollaborationFileRow = Tables<'collaboration_files'>;
type CollaborationFileInsert = TablesInsert<'collaboration_files'>;
type CollaborationFileUpdate = TablesUpdate<'collaboration_files'>;

export class CollaborationFileService {
  /**
   * Get all files for a specific group
   */
  async getFiles(groupId: string): Promise<CollaborationFile[]> {
    const { data, error } = await supabase
      .from('collaboration_files')
      .select('*')
      .eq('group_id', groupId)
      .order('path');

    if (error) {
      throw new Error(`Failed to fetch files: ${error.message}`);
    }

    return (data || []).map(this.mapRowToFile);
  }

  /**
   * Get a specific file by ID
   */
  async getFile(fileId: string): Promise<CollaborationFile | null> {
    const { data, error } = await supabase
      .from('collaboration_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // File not found
      }
      throw new Error(`Failed to fetch file: ${error.message}`);
    }

    return this.mapRowToFile(data);
  }

  /**
   * Create a new file
   */
  async createFile(request: CreateFileRequest & { createdBy?: string }): Promise<CollaborationFile> {
    // Get current user ID from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    const userId = request.createdBy || user?.id;
    
    if (!userId) {
      throw new Error('User must be authenticated to create files');
    }

    const fileData: CollaborationFileInsert = {
      group_id: request.groupId,
      name: request.name,
      path: request.path,
      content: request.content || this.getDefaultContent(request.language, request.name),
      language: request.language,
      created_by: userId,
      version: 1
    };

    const { data, error } = await supabase
      .from('collaboration_files')
      .insert([fileData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create file: ${error.message}`);
    }

    return this.mapRowToFile(data);
  }

  /**
   * Update file content
   */
  async updateFile(fileId: string, request: UpdateFileRequest): Promise<CollaborationFile> {
    const updateData: CollaborationFileUpdate = {
      ...(request.content !== undefined && { content: request.content }),
      ...(request.language !== undefined && { language: request.language }),
      version: request.version + 1,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('collaboration_files')
      .update(updateData)
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update file: ${error.message}`);
    }

    return this.mapRowToFile(data);
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    const { error } = await supabase
      .from('collaboration_files')
      .delete()
      .eq('id', fileId);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Rename a file
   */
  async renameFile(fileId: string, newName: string, newPath: string): Promise<CollaborationFile> {
    const { data, error } = await supabase
      .from('collaboration_files')
      .update({
        name: newName,
        path: newPath,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to rename file: ${error.message}`);
    }

    return this.mapRowToFile(data);
  }

  /**
   * Check if a file path already exists in the group
   */
  async pathExists(groupId: string, path: string, excludeFileId?: string): Promise<boolean> {
    let query = supabase
      .from('collaboration_files')
      .select('id')
      .eq('group_id', groupId)
      .eq('path', path);

    if (excludeFileId) {
      query = query.neq('id', excludeFileId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check path existence: ${error.message}`);
    }

    return (data || []).length > 0;
  }

  /**
   * Subscribe to file changes for a group
   */
  subscribeToFileChanges(
    groupId: string,
    callback: (payload: any) => void
  ): () => void {
    const channel = supabase.channel(`collaboration_files:${groupId}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'collaboration_files',
        filter: `group_id=eq.${groupId}`
      },
      callback
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Detect language from file extension
   */
  detectLanguage(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'py':
        return 'python';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'jsx':
        return 'javascript';
      case 'tsx':
        return 'typescript';
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp';
      case 'java':
        return 'java';
      case 'xml':
        return 'xml';
      case 'yaml':
      case 'yml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  }

  /**
   * Get default content for a new file based on language
   */
  private getDefaultContent(language: string, filename: string): string {
    switch (language) {
      case 'javascript':
        return `// ${filename}
// JavaScript collaboration file

function main() {
  console.log("Hello from ${filename}!");
}

main();`;

      case 'typescript':
        return `// ${filename}
// TypeScript collaboration file

interface Config {
  name: string;
  version: string;
}

const config: Config = {
  name: "${filename}",
  version: "1.0.0"
};

function main(): void {
  console.log(\`Hello from \${config.name}!\`);
}

main();`;

      case 'python':
        return `# ${filename}
# Python collaboration file

def main():
    print(f"Hello from ${filename}!")

if __name__ == "__main__":
    main()`;

      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
</head>
<body>
    <h1>Hello from ${filename}!</h1>
    <p>Start building your collaborative project here.</p>
</body>
</html>`;

      case 'css':
        return `/* ${filename} */
/* CSS collaboration file */

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}`;

      case 'json':
        return `{
  "name": "${filename}",
  "version": "1.0.0",
  "description": "Collaboration project configuration",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "keywords": ["collaboration", "project"],
  "author": "Collaboration Team"
}`;

      case 'markdown':
        return `# ${filename}

Welcome to the collaborative project!

## Getting Started

This is a collaborative markdown file where team members can work together.

## Features

- Real-time collaboration
- Multi-language support
- File management
- Version control

## Usage

Start editing this file to begin collaborating with your team.`;

      default:
        return `// ${filename}
// Collaborative file

// Start coding together!`;
    }
  }

  /**
   * Map database row to CollaborationFile interface
   */
  private mapRowToFile(row: CollaborationFileRow): CollaborationFile {
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
      version: row.version
    };
  }
}

// Singleton instance
export const collaborationFileService = new CollaborationFileService();
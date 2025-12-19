import { 
  CollaborationFile, 
  FileCategory, 
  FileTemplate, 
  FileBookmark 
} from '@/types/collaboration';

export interface FilePermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
}

// Default categories
const defaultCategories: FileCategory[] = [
  { id: 'frontend', name: 'Frontend', color: '#3b82f6', icon: 'Layout', extensions: ['tsx', 'jsx', 'html', 'css', 'scss'] } as FileCategory & { extensions: string[] },
  { id: 'backend', name: 'Backend', color: '#10b981', icon: 'Server', extensions: ['ts', 'js', 'py', 'go', 'rs'] } as FileCategory & { extensions: string[] },
  { id: 'config', name: 'Configuration', color: '#f59e0b', icon: 'Settings', extensions: ['json', 'yaml', 'toml', 'env'] } as FileCategory & { extensions: string[] },
  { id: 'docs', name: 'Documentation', color: '#8b5cf6', icon: 'FileText', extensions: ['md', 'txt', 'rst'] } as FileCategory & { extensions: string[] },
  { id: 'assets', name: 'Assets', color: '#ec4899', icon: 'Image', extensions: ['png', 'jpg', 'svg', 'gif'] } as FileCategory & { extensions: string[] },
  { id: 'other', name: 'Other', color: '#6b7280', icon: 'File', extensions: [] } as FileCategory & { extensions: string[] }
];

// Default templates
const defaultTemplates: FileTemplate[] = [
  {
    id: 'react-component',
    name: 'React Component',
    description: 'A React functional component with TypeScript',
    language: 'typescript',
    category: 'frontend',
    content: `import React from 'react';

interface {{name}}Props {
  // props
}

export const {{name}}: React.FC<{{name}}Props> = () => {
  return (
    <div>{{name}}</div>
  );
};
`,
    tags: ['react', 'component', 'typescript']
  },
  {
    id: 'typescript-module',
    name: 'TypeScript Module',
    description: 'A TypeScript module with exports',
    language: 'typescript',
    category: 'backend',
    content: `// {{name}} module

export interface {{name}}Options {
  // options
}

export class {{name}} {
  constructor(private options: {{name}}Options) {}
}

export default {{name}};
`,
    tags: ['typescript', 'module', 'class']
  },
  {
    id: 'css-module',
    name: 'CSS Module',
    description: 'A CSS module file',
    language: 'css',
    category: 'frontend',
    content: `.container {
  display: flex;
  flex-direction: column;
}

.header {
  padding: 1rem;
}

.content {
  flex: 1;
}
`,
    tags: ['css', 'styles', 'module']
  }
];

const BOOKMARKS_KEY = 'project_file_bookmarks';
const RECENT_FILES_KEY = 'project_recent_files';

// Extended category type with extensions
type FileCategoryWithExtensions = FileCategory & { extensions: string[] };

export class ProjectFileManagementService {
  getCategories(): FileCategory[] {
    return defaultCategories;
  }

  getCategoriesWithExtensions(): FileCategoryWithExtensions[] {
    return defaultCategories as FileCategoryWithExtensions[];
  }

  async getFilesByCategory(groupId: string, category: string): Promise<CollaborationFile[]> {
    const categoryDef = defaultCategories.find(c => c.id === category) as FileCategoryWithExtensions | undefined;
    if (!categoryDef) return [];

    // In a real implementation, this would fetch from Supabase
    // For now, return empty array as the table isn't fully integrated yet
    return [];
  }

  categorizeFile(file: CollaborationFile): string {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    
    for (const category of defaultCategories as FileCategoryWithExtensions[]) {
      if (category.extensions?.includes(ext)) {
        return category.id;
      }
    }
    
    return 'other';
  }

  getTemplates(): FileTemplate[] {
    return defaultTemplates;
  }

  getTemplatesByCategory(category: string): FileTemplate[] {
    return defaultTemplates.filter(t => t.category === category);
  }

  createFileFromTemplate(templateId: string, replacements: Record<string, string>): string {
    const template = defaultTemplates.find(t => t.id === templateId);
    if (!template) return '';

    let content = template.content;
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    }
    
    return content;
  }

  getUserBookmarks(groupId: string, userId: string): FileBookmark[] {
    const key = `${BOOKMARKS_KEY}_${groupId}_${userId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  addBookmark(groupId: string, userId: string, fileId: string, customName?: string): void {
    const bookmarks = this.getUserBookmarks(groupId, userId);
    
    if (bookmarks.some(b => b.fileId === fileId)) return;
    
    const newBookmark: FileBookmark = {
      id: crypto.randomUUID(),
      fileId,
      userId,
      name: customName,
      createdAt: new Date()
    };
    
    bookmarks.push(newBookmark);
    
    const key = `${BOOKMARKS_KEY}_${groupId}_${userId}`;
    localStorage.setItem(key, JSON.stringify(bookmarks));
  }

  removeBookmark(groupId: string, userId: string, fileId: string): void {
    const bookmarks = this.getUserBookmarks(groupId, userId);
    const filtered = bookmarks.filter(b => b.fileId !== fileId);
    
    const key = `${BOOKMARKS_KEY}_${groupId}_${userId}`;
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  async getRecentFiles(groupId: string, userId: string, limit: number = 10): Promise<CollaborationFile[]> {
    // In a real implementation, this would fetch from Supabase
    // For now, return empty array
    return [];
  }

  trackFileAccess(groupId: string, userId: string, fileId: string): void {
    const key = `${RECENT_FILES_KEY}_${groupId}_${userId}`;
    const stored = localStorage.getItem(key);
    let recentIds: string[] = stored ? JSON.parse(stored) : [];
    
    recentIds = recentIds.filter(id => id !== fileId);
    recentIds.unshift(fileId);
    recentIds = recentIds.slice(0, 20);
    
    localStorage.setItem(key, JSON.stringify(recentIds));
  }

  getSuggestedProjectStructure(files: CollaborationFile[]): Record<string, CollaborationFile[]> {
    const structure: Record<string, CollaborationFile[]> = {};
    
    for (const file of files) {
      const parts = file.path.split('/');
      const folder = parts.length > 1 ? parts[0] : 'root';
      
      if (!structure[folder]) {
        structure[folder] = [];
      }
      
      structure[folder].push(file);
    }
    
    return structure;
  }

  async checkFilePermissions(fileId: string, userId: string): Promise<FilePermissions> {
    // Default permissions - in a real implementation, this would check the database
    return {
      canRead: true,
      canWrite: true,
      canDelete: false,
      canShare: false
    };
  }

  async searchFiles(groupId: string, query: string, filters?: {
    category?: string;
    language?: string;
    createdBy?: string;
    tags?: string[];
  }): Promise<CollaborationFile[]> {
    // In a real implementation, this would fetch from Supabase
    // For now, return empty array
    return [];
  }
}

export const projectFileManagementService = new ProjectFileManagementService();
export default projectFileManagementService;

// Re-export types for convenience
export type { CollaborationFile, FileCategory, FileTemplate, FileBookmark };

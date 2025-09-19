import { supabase } from '@/integrations/supabase/client';
import { 
  CollaborationFile, 
  FileCategory, 
  FileBookmark, 
  FileTemplate, 
  ProjectStructure,
  FolderStructure,
  FilePermissions
} from '@/types/collaboration';

export class ProjectFileManagementService {
  // Default file categories
  private defaultCategories: FileCategory[] = [
    { id: 'source', name: 'Source Code', color: '#3b82f6', icon: 'Code', description: 'Main application code files' },
    { id: 'config', name: 'Configuration', color: '#8b5cf6', icon: 'Settings', description: 'Configuration and setup files' },
    { id: 'docs', name: 'Documentation', color: '#10b981', icon: 'FileText', description: 'Documentation and README files' },
    { id: 'tests', name: 'Tests', color: '#f59e0b', icon: 'TestTube', description: 'Test files and specifications' },
    { id: 'assets', name: 'Assets', color: '#ef4444', icon: 'Image', description: 'Static assets and resources' },
    { id: 'scripts', name: 'Scripts', color: '#6b7280', icon: 'Terminal', description: 'Build and deployment scripts' }
  ];

  // Default file templates
  private defaultTemplates: FileTemplate[] = [
    {
      id: 'react-component',
      name: 'React Component',
      description: 'TypeScript React functional component with props',
      language: 'typescript',
      category: 'source',
      tags: ['react', 'typescript', 'component'],
      content: `import React from 'react';

interface {{ComponentName}}Props {
  // Define your props here
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({
  // Destructure props here
}) => {
  return (
    <div>
      <h1>{{ComponentName}}</h1>
      {/* Your component content here */}
    </div>
  );
};

export default {{ComponentName}};`
    },
    {
      id: 'node-service',
      name: 'Node.js Service',
      description: 'TypeScript service class with error handling',
      language: 'typescript',
      category: 'source',
      tags: ['nodejs', 'typescript', 'service'],
      content: `export class {{ServiceName}}Service {
  constructor() {
    // Initialize service
  }

  async getData(): Promise<any> {
    try {
      // Implement your service logic here
      return {};
    } catch (error) {
      console.error('Error in {{ServiceName}}Service:', error);
      throw error;
    }
  }

  async processData(data: any): Promise<void> {
    try {
      // Process data logic here
    } catch (error) {
      console.error('Error processing data:', error);
      throw error;
    }
  }
}`
    },
    {
      id: 'python-class',
      name: 'Python Class',
      description: 'Python class with common methods',
      language: 'python',
      category: 'source',
      tags: ['python', 'class'],
      content: `class {{ClassName}}:
    """
    {{ClassName}} class description
    """
    
    def __init__(self):
        """Initialize the {{ClassName}} instance."""
        pass
    
    def process(self, data):
        """
        Process the given data.
        
        Args:
            data: The data to process
            
        Returns:
            Processed data
        """
        try:
            # Implement processing logic here
            return data
        except Exception as e:
            print(f"Error processing data: {e}")
            raise
    
    def __str__(self):
        """String representation of the {{ClassName}}."""
        return f"{{ClassName}}()"
`
    },
    {
      id: 'readme',
      name: 'README.md',
      description: 'Project README with standard sections',
      language: 'markdown',
      category: 'docs',
      tags: ['documentation', 'readme'],
      content: `# {{ProjectName}}

## Description

Brief description of your project.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
# Installation commands
npm install
\`\`\`

## Usage

\`\`\`bash
# Usage examples
npm start
\`\`\`

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
`
    }
  ];

  /**
   * Get all file categories
   */
  getCategories(): FileCategory[] {
    return this.defaultCategories;
  }

  /**
   * Get files by category
   */
  async getFilesByCategory(groupId: string, category: string): Promise<CollaborationFile[]> {
    const { data, error } = await supabase
      .from('collaboration_files')
      .select('*')
      .eq('group_id', groupId)
      .order('path');

    if (error) {
      throw new Error(`Failed to fetch files by category: ${error.message}`);
    }

    // Filter by category based on file path patterns or metadata
    return (data || []).filter(file => this.categorizeFile(file).id === category)
      .map(this.mapRowToFile);
  }

  /**
   * Categorize a file based on its path and language
   */
  categorizeFile(file: any): FileCategory {
    const path = file.path.toLowerCase();
    const language = file.language.toLowerCase();

    // Configuration files
    if (path.includes('config') || path.includes('.env') || 
        ['json', 'yaml', 'yml', 'toml', 'ini'].includes(language) ||
        path.match(/\.(config|env|settings)\./)) {
      return this.defaultCategories.find(c => c.id === 'config')!;
    }

    // Documentation files
    if (path.includes('readme') || path.includes('doc') || 
        language === 'markdown' || path.includes('/docs/')) {
      return this.defaultCategories.find(c => c.id === 'docs')!;
    }

    // Test files
    if (path.includes('test') || path.includes('spec') || 
        path.includes('__tests__') || path.includes('.test.') || 
        path.includes('.spec.')) {
      return this.defaultCategories.find(c => c.id === 'tests')!;
    }

    // Script files
    if (path.includes('script') || path.includes('build') || 
        ['sh', 'bat', 'ps1'].includes(language) ||
        path.includes('package.json') || path.includes('makefile')) {
      return this.defaultCategories.find(c => c.id === 'scripts')!;
    }

    // Asset files
    if (path.includes('asset') || path.includes('public') || 
        path.includes('static') || path.includes('image') ||
        ['css', 'scss', 'less'].includes(language)) {
      return this.defaultCategories.find(c => c.id === 'assets')!;
    }

    // Default to source code
    return this.defaultCategories.find(c => c.id === 'source')!;
  }

  /**
   * Get file templates
   */
  getTemplates(): FileTemplate[] {
    return this.defaultTemplates;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): FileTemplate[] {
    return this.defaultTemplates.filter(template => template.category === category);
  }

  /**
   * Create file from template
   */
  createFileFromTemplate(templateId: string, replacements: Record<string, string>): string {
    const template = this.defaultTemplates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let content = template.content;
    
    // Replace template variables
    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    });

    return content;
  }

  /**
   * Get user bookmarks for a group
   */
  async getUserBookmarks(groupId: string, userId: string): Promise<FileBookmark[]> {
    // For now, store bookmarks in localStorage since we don't have a bookmarks table
    const bookmarksKey = `bookmarks_${groupId}_${userId}`;
    const stored = localStorage.getItem(bookmarksKey);
    
    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Add file to bookmarks
   */
  async addBookmark(groupId: string, userId: string, fileId: string, customName?: string): Promise<void> {
    const bookmarksKey = `bookmarks_${groupId}_${userId}`;
    const existing = await this.getUserBookmarks(groupId, userId);
    
    // Check if already bookmarked
    if (existing.some(b => b.fileId === fileId)) {
      return;
    }

    const bookmark: FileBookmark = {
      id: `bookmark_${Date.now()}`,
      fileId,
      userId,
      name: customName,
      createdAt: new Date()
    };

    const updated = [...existing, bookmark];
    localStorage.setItem(bookmarksKey, JSON.stringify(updated));
  }

  /**
   * Remove file from bookmarks
   */
  async removeBookmark(groupId: string, userId: string, fileId: string): Promise<void> {
    const bookmarksKey = `bookmarks_${groupId}_${userId}`;
    const existing = await this.getUserBookmarks(groupId, userId);
    
    const updated = existing.filter(b => b.fileId !== fileId);
    localStorage.setItem(bookmarksKey, JSON.stringify(updated));
  }

  /**
   * Get recently accessed files for a user
   */
  async getRecentFiles(groupId: string, userId: string, limit: number = 10): Promise<CollaborationFile[]> {
    const recentKey = `recent_files_${groupId}_${userId}`;
    const stored = localStorage.getItem(recentKey);
    
    if (!stored) {
      return [];
    }

    try {
      const recentFileIds = JSON.parse(stored);
      
      // Fetch the actual files
      const { data, error } = await supabase
        .from('collaboration_files')
        .select('*')
        .eq('group_id', groupId)
        .in('id', recentFileIds.slice(0, limit));

      if (error) {
        throw new Error(`Failed to fetch recent files: ${error.message}`);
      }

      // Maintain the order from localStorage
      const fileMap = new Map((data || []).map(file => [file.id, file]));
      return recentFileIds
        .slice(0, limit)
        .map((id: string) => fileMap.get(id))
        .filter(Boolean)
        .map(this.mapRowToFile);
    } catch {
      return [];
    }
  }

  /**
   * Track file access for recent files
   */
  async trackFileAccess(groupId: string, userId: string, fileId: string): Promise<void> {
    const recentKey = `recent_files_${groupId}_${userId}`;
    const stored = localStorage.getItem(recentKey);
    
    let recentFiles: string[] = [];
    if (stored) {
      try {
        recentFiles = JSON.parse(stored);
      } catch {
        recentFiles = [];
      }
    }

    // Remove if already exists and add to front
    recentFiles = recentFiles.filter(id => id !== fileId);
    recentFiles.unshift(fileId);

    // Keep only last 20 files
    recentFiles = recentFiles.slice(0, 20);

    localStorage.setItem(recentKey, JSON.stringify(recentFiles));
  }

  /**
   * Get suggested project structure based on file types
   */
  getSuggestedProjectStructure(files: CollaborationFile[]): FolderStructure[] {
    const structure: FolderStructure[] = [];
    
    // Analyze existing files to suggest structure
    const hasReactFiles = files.some(f => f.language === 'typescript' && f.path.includes('.tsx'));
    const hasPythonFiles = files.some(f => f.language === 'python');
    const hasConfigFiles = files.some(f => ['json', 'yaml', 'yml'].includes(f.language));
    const hasTestFiles = files.some(f => f.path.includes('test') || f.path.includes('spec'));

    if (hasReactFiles) {
      structure.push({
        path: 'src',
        name: 'Source Code',
        description: 'Main application source code',
        category: 'source',
        children: [
          { path: 'src/components', name: 'Components', category: 'source', children: [] },
          { path: 'src/hooks', name: 'Hooks', category: 'source', children: [] },
          { path: 'src/services', name: 'Services', category: 'source', children: [] },
          { path: 'src/types', name: 'Types', category: 'source', children: [] },
          { path: 'src/utils', name: 'Utilities', category: 'source', children: [] }
        ]
      });
    }

    if (hasPythonFiles) {
      structure.push({
        path: 'src',
        name: 'Source Code',
        description: 'Python source code',
        category: 'source',
        children: [
          { path: 'src/models', name: 'Models', category: 'source', children: [] },
          { path: 'src/services', name: 'Services', category: 'source', children: [] },
          { path: 'src/utils', name: 'Utilities', category: 'source', children: [] }
        ]
      });
    }

    if (hasTestFiles) {
      structure.push({
        path: 'tests',
        name: 'Tests',
        description: 'Test files and specifications',
        category: 'tests',
        children: []
      });
    }

    if (hasConfigFiles) {
      structure.push({
        path: 'config',
        name: 'Configuration',
        description: 'Configuration files',
        category: 'config',
        children: []
      });
    }

    // Always suggest docs folder
    structure.push({
      path: 'docs',
      name: 'Documentation',
      description: 'Project documentation',
      category: 'docs',
      children: []
    });

    return structure;
  }

  /**
   * Check file permissions for a user
   */
  async checkFilePermissions(fileId: string, userId: string): Promise<FilePermissions> {
    // Get file details
    const { data: file, error } = await supabase
      .from('collaboration_files')
      .select('created_by, group_id')
      .eq('id', fileId)
      .single();

    if (error) {
      throw new Error(`Failed to check file permissions: ${error.message}`);
    }

    // Check if user is group member
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('user_id')
      .eq('group_id', file.group_id)
      .eq('user_id', userId)
      .single();

    const isGroupMember = !!membership;
    const isOwner = file.created_by === userId;

    // Basic permissions - can be extended with more granular control
    return {
      canRead: isGroupMember,
      canWrite: isGroupMember,
      canDelete: isOwner,
      canShare: isGroupMember,
      sharedWith: [] // Could be extended to track specific sharing
    };
  }

  /**
   * Search files with advanced filters
   */
  async searchFiles(
    groupId: string, 
    query: string, 
    filters?: {
      category?: string;
      language?: string;
      tags?: string[];
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<CollaborationFile[]> {
    let supabaseQuery = supabase
      .from('collaboration_files')
      .select('*')
      .eq('group_id', groupId);

    // Text search in name, path, and content
    if (query) {
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${query}%,path.ilike.%${query}%,content.ilike.%${query}%`
      );
    }

    // Language filter
    if (filters?.language) {
      supabaseQuery = supabaseQuery.eq('language', filters.language);
    }

    // Date range filter
    if (filters?.dateRange) {
      supabaseQuery = supabaseQuery
        .gte('created_at', filters.dateRange.start.toISOString())
        .lte('created_at', filters.dateRange.end.toISOString());
    }

    const { data, error } = await supabaseQuery.order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search files: ${error.message}`);
    }

    let results = (data || []).map(this.mapRowToFile);

    // Apply category filter (client-side since it's computed)
    if (filters?.category) {
      results = results.filter(file => this.categorizeFile(file).id === filters.category);
    }

    return results;
  }

  /**
   * Map database row to CollaborationFile interface
   */
  private mapRowToFile(row: any): CollaborationFile {
    const category = this.categorizeFile(row);
    
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
      category: category.id,
      tags: this.generateTags(row),
      isBookmarked: false // Will be set by calling component
    };
  }

  /**
   * Generate tags based on file properties
   */
  private generateTags(file: any): string[] {
    const tags: string[] = [];
    
    // Add language as tag
    tags.push(file.language);
    
    // Add path-based tags
    const pathParts = file.path.split('/');
    if (pathParts.length > 1) {
      tags.push(pathParts[0]); // First folder as tag
    }
    
    // Add special tags based on filename patterns
    if (file.name.includes('test') || file.name.includes('spec')) {
      tags.push('test');
    }
    
    if (file.name.includes('config') || file.name.includes('setting')) {
      tags.push('config');
    }
    
    if (file.name.toLowerCase().includes('readme')) {
      tags.push('documentation');
    }
    
    return tags;
  }
}

// Singleton instance
export const projectFileManagementService = new ProjectFileManagementService();
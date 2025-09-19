import { supabase } from '@/integrations/supabase/client';
import { CollaborationFile, FileBookmark, FileTemplate } from '@/types/collaboration';

export class FileAccessibilityService {
  private recentFilesKey = 'collaboration_recent_files';
  private maxRecentFiles = 10;

  /**
   * Get recent files for a user in a specific group
   */
  getRecentFiles(groupId: string, userId: string): CollaborationFile[] {
    try {
      const key = `${this.recentFilesKey}_${groupId}_${userId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return [];

      const recentData = JSON.parse(stored);
      return recentData.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      }));
    } catch (error) {
      console.error('Error getting recent files:', error);
      return [];
    }
  }

  /**
   * Add a file to recent files list
   */
  addToRecentFiles(groupId: string, userId: string, file: CollaborationFile): void {
    try {
      const key = `${this.recentFilesKey}_${groupId}_${userId}`;
      let recentFiles = this.getRecentFiles(groupId, userId);

      // Remove if already exists
      recentFiles = recentFiles.filter(f => f.id !== file.id);

      // Add to beginning
      recentFiles.unshift(file);

      // Keep only max recent files
      recentFiles = recentFiles.slice(0, this.maxRecentFiles);

      localStorage.setItem(key, JSON.stringify(recentFiles));
    } catch (error) {
      console.error('Error adding to recent files:', error);
    }
  }

  /**
   * Clear recent files for a user in a group
   */
  clearRecentFiles(groupId: string, userId: string): void {
    try {
      const key = `${this.recentFilesKey}_${groupId}_${userId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing recent files:', error);
    }
  }

  /**
   * Get bookmarks for a user
   */
  async getBookmarks(userId: string): Promise<FileBookmark[]> {
    try {
      const { data, error } = await supabase
        .from('file_bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookmarks:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        fileId: row.file_id,
        userId: row.user_id,
        name: row.name,
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return [];
    }
  }

  /**
   * Add a bookmark
   */
  async addBookmark(userId: string, fileId: string, name?: string): Promise<FileBookmark | null> {
    try {
      const { data, error } = await supabase
        .from('file_bookmarks')
        .insert([{
          user_id: userId,
          file_id: fileId,
          name: name || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding bookmark:', error);
        return null;
      }

      return {
        id: data.id,
        fileId: data.file_id,
        userId: data.user_id,
        name: data.name,
        createdAt: new Date(data.created_at)
      };
    } catch (error) {
      console.error('Error adding bookmark:', error);
      return null;
    }
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(userId: string, fileId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('file_bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('file_id', fileId);

      if (error) {
        console.error('Error removing bookmark:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      return false;
    }
  }

  /**
   * Toggle bookmark status
   */
  async toggleBookmark(userId: string, fileId: string, fileName?: string): Promise<boolean> {
    try {
      // Check if bookmark exists
      const { data: existing } = await supabase
        .from('file_bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('file_id', fileId)
        .single();

      if (existing) {
        // Remove bookmark
        return await this.removeBookmark(userId, fileId);
      } else {
        // Add bookmark
        const bookmark = await this.addBookmark(userId, fileId, fileName);
        return bookmark !== null;
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return false;
    }
  }

  /**
   * Get predefined file templates
   */
  getFileTemplates(): FileTemplate[] {
    return [
      {
        id: 'react-component',
        name: 'React Component',
        description: 'A basic React functional component with TypeScript',
        language: 'typescript',
        category: 'React',
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
        id: 'express-route',
        name: 'Express Route',
        description: 'Express.js route handler with TypeScript',
        language: 'typescript',
        category: 'Backend',
        tags: ['express', 'typescript', 'api'],
        content: `import { Request, Response, Router } from 'express';

const router = Router();

// GET route
router.get('/{{routeName}}', async (req: Request, res: Response) => {
  try {
    // Your logic here
    res.json({ message: 'Success' });
  } catch (error) {
    console.error('Error in {{routeName}}:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST route
router.post('/{{routeName}}', async (req: Request, res: Response) => {
  try {
    const { body } = req;
    // Your logic here
    res.json({ message: 'Created successfully' });
  } catch (error) {
    console.error('Error creating {{routeName}}:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;`
      },
      {
        id: 'python-class',
        name: 'Python Class',
        description: 'A basic Python class with common methods',
        language: 'python',
        category: 'Python',
        tags: ['python', 'class', 'oop'],
        content: `class {{ClassName}}:
    """
    A class representing {{ClassName}}.
    
    Attributes:
        name (str): The name of the {{ClassName}}
    """
    
    def __init__(self, name: str):
        """
        Initialize a new {{ClassName}} instance.
        
        Args:
            name (str): The name of the {{ClassName}}
        """
        self.name = name
    
    def __str__(self) -> str:
        """Return a string representation of the {{ClassName}}."""
        return f"{{ClassName}}(name='{self.name}')"
    
    def __repr__(self) -> str:
        """Return a detailed string representation of the {{ClassName}}."""
        return self.__str__()
    
    def get_name(self) -> str:
        """Get the name of the {{ClassName}}."""
        return self.name
    
    def set_name(self, name: str) -> None:
        """Set the name of the {{ClassName}}."""
        self.name = name


# Example usage
if __name__ == "__main__":
    instance = {{ClassName}}("example")
    print(instance)
    print(f"Name: {instance.get_name()}")
`
      },
      {
        id: 'html-page',
        name: 'HTML Page',
        description: 'A complete HTML5 page template',
        language: 'html',
        category: 'Web',
        tags: ['html', 'web', 'template'],
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{{PageDescription}}">
    <title>{{PageTitle}}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
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
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>{{PageTitle}}</h1>
            <nav>
                <ul>
                    <li><a href="#home">Home</a></li>
                    <li><a href="#about">About</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ul>
            </nav>
        </header>
        
        <main>
            <section id="home">
                <h2>Welcome</h2>
                <p>Your content goes here.</p>
            </section>
        </main>
        
        <footer>
            <p>&copy; 2024 {{PageTitle}}. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>`
      },
      {
        id: 'css-reset',
        name: 'CSS Reset',
        description: 'Modern CSS reset and base styles',
        language: 'css',
        category: 'Styles',
        tags: ['css', 'reset', 'base'],
        content: `/* Modern CSS Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

input,
button,
textarea,
select {
  font: inherit;
}

p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
}

#root,
#__next {
  isolation: isolate;
}

/* Base Styles */
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;
  --light-color: #f8f9fa;
  --dark-color: #343a40;
  
  --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  
  --border-radius: 0.375rem;
  --box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

body {
  font-family: var(--font-family-sans);
  color: var(--dark-color);
  background-color: var(--light-color);
}

/* Utility Classes */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.d-none { display: none; }
.d-block { display: block; }
.d-flex { display: flex; }
.d-grid { display: grid; }

.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.align-center { align-items: center; }

.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }

.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }
.mb-4 { margin-bottom: 1.5rem; }

.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-3 { padding: 1rem; }
.p-4 { padding: 1.5rem; }`
      },
      {
        id: 'json-config',
        name: 'JSON Configuration',
        description: 'A configuration file template',
        language: 'json',
        category: 'Config',
        tags: ['json', 'config', 'settings'],
        content: `{
  "name": "{{ProjectName}}",
  "version": "1.0.0",
  "description": "{{ProjectDescription}}",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "build": "npm run compile",
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "keywords": [
    "{{keyword1}}",
    "{{keyword2}}",
    "{{keyword3}}"
  ],
  "author": "{{AuthorName}}",
  "license": "MIT",
  "dependencies": {
    
  },
  "devDependencies": {
    
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "repository": {
    "type": "git",
    "url": "{{RepositoryUrl}}"
  },
  "bugs": {
    "url": "{{BugsUrl}}"
  },
  "homepage": "{{HomepageUrl}}"
}`
      }
    ];
  }

  /**
   * Apply template to create file content with variable substitution
   */
  applyTemplate(template: FileTemplate, variables: Record<string, string>): string {
    let content = template.content;
    
    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    });
    
    return content;
  }

  /**
   * Get project structure templates
   */
  getProjectStructures() {
    return [
      {
        id: 'react-app',
        name: 'React Application',
        description: 'Basic React application structure',
        folders: [
          'src',
          'src/components',
          'src/hooks',
          'src/utils',
          'src/types',
          'src/styles',
          'public'
        ],
        files: [
          { path: 'src/App.tsx', template: 'react-component' },
          { path: 'src/index.tsx', template: 'react-entry' },
          { path: 'src/styles/globals.css', template: 'css-reset' },
          { path: 'package.json', template: 'json-config' },
          { path: 'public/index.html', template: 'html-page' }
        ]
      },
      {
        id: 'express-api',
        name: 'Express API',
        description: 'RESTful API with Express.js',
        folders: [
          'src',
          'src/routes',
          'src/controllers',
          'src/middleware',
          'src/models',
          'src/utils',
          'tests'
        ],
        files: [
          { path: 'src/index.ts', template: 'express-server' },
          { path: 'src/routes/api.ts', template: 'express-route' },
          { path: 'package.json', template: 'json-config' }
        ]
      },
      {
        id: 'python-project',
        name: 'Python Project',
        description: 'Basic Python project structure',
        folders: [
          'src',
          'tests',
          'docs'
        ],
        files: [
          { path: 'src/main.py', template: 'python-main' },
          { path: 'src/models.py', template: 'python-class' },
          { path: 'requirements.txt', template: 'python-requirements' },
          { path: 'README.md', template: 'readme' }
        ]
      }
    ];
  }
}

// Singleton instance
export const fileAccessibilityService = new FileAccessibilityService();
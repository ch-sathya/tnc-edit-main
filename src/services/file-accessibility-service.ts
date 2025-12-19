import { 
  CollaborationFile, 
  FileTemplate, 
  FileBookmark 
} from '@/types/collaboration';

const MAX_RECENT_FILES = 10;
const RECENT_FILES_KEY = 'recent_files';
const BOOKMARKS_KEY = 'file_bookmarks';

// Recent Files Management (localStorage-based)
export const getRecentFiles = (groupId: string, userId: string): CollaborationFile[] => {
  const key = `${RECENT_FILES_KEY}_${groupId}_${userId}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

export const addToRecentFiles = (groupId: string, userId: string, file: CollaborationFile): void => {
  const key = `${RECENT_FILES_KEY}_${groupId}_${userId}`;
  const recentFiles = getRecentFiles(groupId, userId);
  
  // Remove if already exists
  const filtered = recentFiles.filter(f => f.id !== file.id);
  
  // Add to beginning
  filtered.unshift(file);
  
  // Keep only max count
  const trimmed = filtered.slice(0, MAX_RECENT_FILES);
  
  localStorage.setItem(key, JSON.stringify(trimmed));
};

export const clearRecentFiles = (groupId: string, userId: string): void => {
  const key = `${RECENT_FILES_KEY}_${groupId}_${userId}`;
  localStorage.removeItem(key);
};

// Bookmark Management (localStorage-based)
export const getBookmarks = (userId: string): FileBookmark[] => {
  const key = `${BOOKMARKS_KEY}_${userId}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

export const addBookmark = (userId: string, fileId: string, name?: string): FileBookmark | null => {
  const bookmarks = getBookmarks(userId);
  
  // Check if already bookmarked
  if (bookmarks.some(b => b.fileId === fileId)) {
    return null;
  }
  
  const newBookmark: FileBookmark = {
    id: crypto.randomUUID(),
    fileId,
    userId,
    name: name,
    createdAt: new Date()
  };
  
  bookmarks.push(newBookmark);
  
  const key = `${BOOKMARKS_KEY}_${userId}`;
  localStorage.setItem(key, JSON.stringify(bookmarks));
  
  return newBookmark;
};

export const removeBookmark = (userId: string, fileId: string): boolean => {
  const bookmarks = getBookmarks(userId);
  const filtered = bookmarks.filter(b => b.fileId !== fileId);
  
  if (filtered.length === bookmarks.length) {
    return false;
  }
  
  const key = `${BOOKMARKS_KEY}_${userId}`;
  localStorage.setItem(key, JSON.stringify(filtered));
  
  return true;
};

export const toggleBookmark = (userId: string, fileId: string, fileName?: string): boolean => {
  const bookmarks = getBookmarks(userId);
  const exists = bookmarks.some(b => b.fileId === fileId);
  
  if (exists) {
    removeBookmark(userId, fileId);
    return false;
  } else {
    addBookmark(userId, fileId, fileName);
    return true;
  }
};

// File Templates
export const getFileTemplates = (): FileTemplate[] => {
  return [
    {
      id: 'react-component',
      name: 'React Component',
      description: 'A basic React functional component with TypeScript',
      language: 'typescript',
      category: 'frontend',
      tags: ['react', 'component', 'typescript'],
      content: `import React from 'react';

interface {{ComponentName}}Props {
  // Define your props here
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = (props) => {
  return (
    <div>
      <h1>{{ComponentName}}</h1>
    </div>
  );
};

export default {{ComponentName}};
`
    },
    {
      id: 'express-route',
      name: 'Express Route',
      description: 'An Express.js route handler',
      language: 'typescript',
      category: 'backend',
      tags: ['express', 'route', 'api'],
      content: `import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Success' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
`
    },
    {
      id: 'python-class',
      name: 'Python Class',
      description: 'A Python class template',
      language: 'python',
      category: 'backend',
      tags: ['python', 'class', 'oop'],
      content: `class {{ClassName}}:
    """{{ClassName}} description."""
    
    def __init__(self):
        """Initialize {{ClassName}}."""
        pass
    
    def method(self):
        """Method description."""
        pass
`
    },
    {
      id: 'html-page',
      name: 'HTML Page',
      description: 'A basic HTML5 page template',
      language: 'html',
      category: 'frontend',
      tags: ['html', 'page', 'template'],
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{PageTitle}}</title>
</head>
<body>
    <h1>{{PageTitle}}</h1>
</body>
</html>
`
    },
    {
      id: 'css-reset',
      name: 'CSS Reset',
      description: 'A modern CSS reset',
      language: 'css',
      category: 'frontend',
      tags: ['css', 'reset', 'styles'],
      content: `*, *::before, *::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

body {
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
}

p, h1, h2, h3, h4, h5, h6 {
  overflow-wrap: break-word;
}
`
    },
    {
      id: 'json-config',
      name: 'JSON Config',
      description: 'A JSON configuration file template',
      language: 'json',
      category: 'config',
      tags: ['json', 'config', 'package'],
      content: `{
  "name": "{{ProjectName}}",
  "version": "1.0.0",
  "description": "{{Description}}",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest"
  }
}
`
    }
  ];
};

export const applyTemplate = (template: FileTemplate, variables: Record<string, string>): string => {
  let content = template.content;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, value);
  }
  
  return content;
};

// Project structures
export const getProjectStructures = () => {
  return [
    {
      id: 'react-app',
      name: 'React Application',
      description: 'A React application structure with TypeScript',
      folders: ['src', 'src/components', 'src/hooks', 'src/pages', 'src/utils', 'public'],
      files: [
        { path: 'src/App.tsx', template: 'react-component' },
        { path: 'src/index.tsx', template: null },
        { path: 'public/index.html', template: 'html-page' }
      ]
    },
    {
      id: 'express-api',
      name: 'Express API',
      description: 'An Express.js API structure',
      folders: ['src', 'src/routes', 'src/controllers', 'src/middleware', 'src/models'],
      files: [
        { path: 'src/index.ts', template: null },
        { path: 'src/routes/index.ts', template: 'express-route' }
      ]
    },
    {
      id: 'python-project',
      name: 'Python Project',
      description: 'A Python project structure',
      folders: ['src', 'tests', 'docs'],
      files: [
        { path: 'src/__init__.py', template: null },
        { path: 'src/main.py', template: 'python-class' },
        { path: 'requirements.txt', template: null }
      ]
    }
  ];
};

// Service class
class FileAccessibilityService {
  getRecentFiles = getRecentFiles;
  addToRecentFiles = addToRecentFiles;
  clearRecentFiles = clearRecentFiles;
  getBookmarks = getBookmarks;
  addBookmark = addBookmark;
  removeBookmark = removeBookmark;
  toggleBookmark = toggleBookmark;
  getFileTemplates = getFileTemplates;
  applyTemplate = applyTemplate;
  getProjectStructures = getProjectStructures;
}

export const fileAccessibilityService = new FileAccessibilityService();
export default fileAccessibilityService;

// Re-export types
export type { CollaborationFile, FileTemplate, FileBookmark };

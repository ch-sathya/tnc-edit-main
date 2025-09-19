import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  File, 
  Folder, 
  Clock, 
  Bookmark, 
  Filter,
  Star,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Code,
  FileText,
  Settings,
  X
} from 'lucide-react';
import { CollaborationFile, FileBookmark } from '@/types/collaboration';
import { useToast } from '@/hooks/use-toast';

interface FileBrowserSidebarProps {
  groupId: string;
  currentUserId: string;
  files: CollaborationFile[];
  selectedFile: CollaborationFile | null;
  onFileSelect: (file: CollaborationFile) => void;
  recentFiles?: CollaborationFile[];
  bookmarks?: FileBookmark[];
  onBookmarkToggle?: (fileId: string) => void;
}

interface FileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: CollaborationFile;
  children: FileTreeNode[];
  expanded: boolean;
}

export const FileBrowserSidebar: React.FC<FileBrowserSidebarProps> = ({
  groupId,
  currentUserId,
  files,
  selectedFile,
  onFileSelect,
  recentFiles = [],
  bookmarks = [],
  onBookmarkToggle
}) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build file tree structure
  const fileTree = useMemo(() => {
    const tree: FileTreeNode[] = [];
    const folderMap = new Map<string, FileTreeNode>();

    // Sort files by path for consistent ordering
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    sortedFiles.forEach(file => {
      const pathParts = file.path.split('/');
      let currentPath = '';
      let currentLevel = tree;

      // Create folder structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        let folder = folderMap.get(currentPath);
        if (!folder) {
          folder = {
            name: folderName,
            path: currentPath,
            isFolder: true,
            children: [],
            expanded: expandedFolders.has(currentPath)
          };
          folderMap.set(currentPath, folder);
          currentLevel.push(folder);
        }
        currentLevel = folder.children;
      }

      // Add the file
      const fileName = pathParts[pathParts.length - 1];
      currentLevel.push({
        name: fileName,
        path: file.path,
        isFolder: false,
        file,
        children: [],
        expanded: false
      });
    });

    return tree;
  }, [files, expandedFolders]);

  // Filter files based on search query and language filter
  const filteredFiles = useMemo(() => {
    let filtered = files;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query) ||
        file.content.toLowerCase().includes(query)
      );
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter(file => file.language === languageFilter);
    }

    return filtered;
  }, [files, searchQuery, languageFilter]);

  // Get unique languages for filter dropdown
  const availableLanguages = useMemo(() => {
    const languages = new Set(files.map(file => file.language));
    return Array.from(languages).sort();
  }, [files]);

  // Get bookmarked files
  const bookmarkedFiles = useMemo(() => {
    const bookmarkedIds = new Set(bookmarks.map(b => b.fileId));
    return files.filter(file => bookmarkedIds.has(file.id));
  }, [files, bookmarks]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const getFileIcon = (language: string) => {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return <Code className="h-4 w-4 text-yellow-500" />;
      case 'python':
        return <Code className="h-4 w-4 text-blue-500" />;
      case 'html':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'css':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'json':
        return <Settings className="h-4 w-4 text-green-500" />;
      case 'markdown':
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isBookmarked = (fileId: string) => {
    return bookmarks.some(b => b.fileId === fileId);
  };

  const handleBookmarkToggle = (fileId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onBookmarkToggle?.(fileId);
  };

  const renderFileTree = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors group ${
            !node.isFolder && selectedFile?.path === node.path
              ? 'bg-primary/10 border border-primary/20'
              : 'hover:bg-muted/50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.isFolder) {
              toggleFolder(node.path);
            } else if (node.file) {
              onFileSelect(node.file);
            }
          }}
        >
          {node.isFolder ? (
            <>
              {node.expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {node.expanded ? (
                <FolderOpen className="h-4 w-4 text-blue-500" />
              ) : (
                <Folder className="h-4 w-4 text-blue-500" />
              )}
              <span className="font-medium text-sm flex-1">{node.name}</span>
            </>
          ) : (
            <>
              <div className="w-4" />
              {getFileIcon(node.file?.language || 'plaintext')}
              <span className="text-sm flex-1 min-w-0 truncate">{node.name}</span>
              {node.file && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <Badge variant="outline" className="text-xs">
                    {node.file.language}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => handleBookmarkToggle(node.file!.id, e)}
                  >
                    <Star 
                      className={`h-3 w-3 ${
                        isBookmarked(node.file.id) 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-muted-foreground'
                      }`} 
                    />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        {node.isFolder && node.expanded && node.children.length > 0 && (
          <div>
            {renderFileTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  const renderFileList = (fileList: CollaborationFile[], showPath = false) => {
    return fileList.map((file) => (
      <div
        key={file.id}
        className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors group ${
          selectedFile?.id === file.id
            ? 'bg-primary/10 border border-primary/20'
            : 'hover:bg-muted/50'
        }`}
        onClick={() => onFileSelect(file)}
      >
        {getFileIcon(file.language)}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{file.name}</div>
          {showPath && (
            <div className="text-xs text-muted-foreground truncate">{file.path}</div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <Badge variant="outline" className="text-xs">
            {file.language}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => handleBookmarkToggle(file.id, e)}
          >
            <Star 
              className={`h-3 w-3 ${
                isBookmarked(file.id) 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-muted-foreground'
              }`} 
            />
          </Button>
        </div>
      </div>
    ));
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Files
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </CardTitle>
        
        {/* Search and Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {showFilters && (
            <div className="space-y-2">
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              >
                <option value="all">All Languages</option>
                {availableLanguages.map(lang => (
                  <option key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-0">
        <Tabs defaultValue="tree" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
            <TabsTrigger value="tree" className="text-xs">Tree</TabsTrigger>
            <TabsTrigger value="recent" className="text-xs">Recent</TabsTrigger>
            <TabsTrigger value="bookmarks" className="text-xs">Starred</TabsTrigger>
            <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="tree" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-1">
                  {fileTree.length > 0 ? (
                    renderFileTree(fileTree)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No files found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="recent" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {recentFiles.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Recently Accessed</span>
                      </div>
                      {renderFileList(recentFiles, true)}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent files</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="bookmarks" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {bookmarkedFiles.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <Bookmark className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Bookmarked Files</span>
                      </div>
                      {renderFileList(bookmarkedFiles, true)}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No bookmarked files</p>
                      <p className="text-xs mt-1">Click the star icon to bookmark files</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="search" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {searchQuery ? (
                    filteredFiles.length > 0 ? (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Search Results ({filteredFiles.length})
                          </span>
                        </div>
                        {renderFileList(filteredFiles, true)}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No files found</p>
                        <p className="text-xs mt-1">Try adjusting your search terms</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Enter search terms</p>
                      <p className="text-xs mt-1">Search by filename, path, or content</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};
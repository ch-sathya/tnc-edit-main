import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Star,
  Clock,
  Bookmark,
  Zap,
  TrendingUp,
  FileText,
  Code,
  Settings,
  TestTube,
  Image,
  Terminal,
  Pin,
  PinOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CollaborationFile, FileBookmark } from '@/types/collaboration';
import { projectFileManagementService } from '@/services/project-file-management-service';

interface QuickAccessPanelProps {
  groupId: string;
  currentUserId: string;
  files: CollaborationFile[];
  selectedFile: CollaborationFile | null;
  onFileSelect: (file: CollaborationFile) => void;
}

interface QuickAccessItem {
  id: string;
  file: CollaborationFile;
  type: 'pinned' | 'frequent' | 'recent' | 'bookmarked';
  accessCount?: number;
  lastAccessed?: Date;
  isPinned?: boolean;
}

export const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({
  groupId,
  currentUserId,
  files,
  selectedFile,
  onFileSelect
}) => {
  const { toast } = useToast();
  const [quickAccessItems, setQuickAccessItems] = useState<QuickAccessItem[]>([]);
  const [pinnedFiles, setPinnedFiles] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<FileBookmark[]>([]);
  const [recentFiles, setRecentFiles] = useState<CollaborationFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupId && files.length > 0) {
      loadQuickAccessData();
    }
  }, [groupId, currentUserId, files]);

  const loadQuickAccessData = async () => {
    try {
      setLoading(true);
      
      // Load pinned files from localStorage
      const pinnedKey = `pinned_files_${groupId}_${currentUserId}`;
      const storedPinned = localStorage.getItem(pinnedKey);
      const pinnedFileIds = storedPinned ? JSON.parse(storedPinned) : [];
      setPinnedFiles(pinnedFileIds);

      // Load bookmarks
      const bookmarksData = await projectFileManagementService.getUserBookmarks(groupId, currentUserId);
      setBookmarks(bookmarksData);

      // Load recent files
      const recentData = await projectFileManagementService.getRecentFiles(groupId, currentUserId, 5);
      setRecentFiles(recentData);

      // Load file access frequency from localStorage
      const frequencyKey = `file_frequency_${groupId}_${currentUserId}`;
      const storedFrequency = localStorage.getItem(frequencyKey);
      const fileFrequency: Record<string, number> = storedFrequency ? JSON.parse(storedFrequency) : {};

      // Build quick access items
      const items: QuickAccessItem[] = [];

      // Add pinned files
      pinnedFileIds.forEach((fileId: string) => {
        const file = files.find(f => f.id === fileId);
        if (file) {
          items.push({
            id: `pinned_${fileId}`,
            file,
            type: 'pinned',
            isPinned: true,
            accessCount: fileFrequency[fileId] || 0
          });
        }
      });

      // Add frequently accessed files (not already pinned)
      const frequentFiles = Object.entries(fileFrequency)
        .filter(([fileId, count]) => count >= 3 && !pinnedFileIds.includes(fileId))
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([fileId]) => files.find(f => f.id === fileId))
        .filter(Boolean) as CollaborationFile[];

      frequentFiles.forEach(file => {
        items.push({
          id: `frequent_${file.id}`,
          file,
          type: 'frequent',
          accessCount: fileFrequency[file.id]
        });
      });

      // Add bookmarked files (not already included)
      bookmarksData.forEach(bookmark => {
        const file = files.find(f => f.id === bookmark.fileId);
        if (file && !items.some(item => item.file.id === file.id)) {
          items.push({
            id: `bookmarked_${file.id}`,
            file,
            type: 'bookmarked'
          });
        }
      });

      // Add recent files (not already included)
      recentData.forEach(file => {
        if (!items.some(item => item.file.id === file.id)) {
          items.push({
            id: `recent_${file.id}`,
            file,
            type: 'recent',
            lastAccessed: new Date() // Approximate
          });
        }
      });

      setQuickAccessItems(items.slice(0, 10)); // Limit to 10 items
    } catch (error) {
      console.error('Error loading quick access data:', error);
      toast({
        title: "Error",
        description: "Failed to load quick access data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: CollaborationFile) => {
    onFileSelect(file);
    
    // Track file access
    await projectFileManagementService.trackFileAccess(groupId, currentUserId, file.id);
    
    // Update frequency counter
    const frequencyKey = `file_frequency_${groupId}_${currentUserId}`;
    const storedFrequency = localStorage.getItem(frequencyKey);
    const fileFrequency: Record<string, number> = storedFrequency ? JSON.parse(storedFrequency) : {};
    
    fileFrequency[file.id] = (fileFrequency[file.id] || 0) + 1;
    localStorage.setItem(frequencyKey, JSON.stringify(fileFrequency));
    
    // Refresh quick access data
    setTimeout(() => loadQuickAccessData(), 100);
  };

  const togglePin = (fileId: string) => {
    const pinnedKey = `pinned_files_${groupId}_${currentUserId}`;
    const currentPinned = [...pinnedFiles];
    
    if (currentPinned.includes(fileId)) {
      const updated = currentPinned.filter(id => id !== fileId);
      setPinnedFiles(updated);
      localStorage.setItem(pinnedKey, JSON.stringify(updated));
      
      toast({
        title: "File unpinned",
        description: "File removed from quick access"
      });
    } else {
      if (currentPinned.length >= 5) {
        toast({
          title: "Pin limit reached",
          description: "You can only pin up to 5 files",
          variant: "destructive"
        });
        return;
      }
      
      const updated = [...currentPinned, fileId];
      setPinnedFiles(updated);
      localStorage.setItem(pinnedKey, JSON.stringify(updated));
      
      toast({
        title: "File pinned",
        description: "File added to quick access"
      });
    }
    
    // Refresh quick access data
    setTimeout(() => loadQuickAccessData(), 100);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pinned':
        return <Pin className="h-3 w-3 text-blue-500" />;
      case 'frequent':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'recent':
        return <Clock className="h-3 w-3 text-orange-500" />;
      case 'bookmarked':
        return <Bookmark className="h-3 w-3 text-yellow-500" />;
      default:
        return <Star className="h-3 w-3" />;
    }
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
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      pinned: 'default',
      frequent: 'secondary',
      recent: 'outline',
      bookmarked: 'secondary'
    } as const;

    const labels = {
      pinned: 'Pinned',
      frequent: 'Frequent',
      recent: 'Recent',
      bookmarked: 'Bookmarked'
    };

    return (
      <Badge variant={variants[type as keyof typeof variants]} className="text-xs">
        {labels[type as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            Loading quick access...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Access
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {quickAccessItems.length > 0 ? (
          <ScrollArea className="h-64">
            <div className="p-4 space-y-2">
              {quickAccessItems.map((item, index) => (
                <div key={item.id}>
                  <div
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                      selectedFile?.id === item.file.id ? 'bg-primary/10 border border-primary/20' : ''
                    }`}
                    onClick={() => handleFileSelect(item.file)}
                  >
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      {getFileIcon(item.file.language)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{item.file.name}</span>
                        {getTypeBadge(item.type)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.file.path}
                      </div>
                      {item.accessCount && item.accessCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Accessed {item.accessCount} times
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(item.file.id);
                        }}
                      >
                        {pinnedFiles.includes(item.file.id) ? (
                          <PinOff className="h-3 w-3 text-blue-500" />
                        ) : (
                          <Pin className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {index < quickAccessItems.length - 1 && (
                    <Separator className="my-1" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No quick access items yet</p>
            <p className="text-xs">Files you use frequently will appear here</p>
          </div>
        )}
        
        <Separator />
        
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Pin className="h-3 w-3 text-blue-500" />
              <span>Pinned: {pinnedFiles.length}/5</span>
            </div>
            <div className="flex items-center gap-2">
              <Bookmark className="h-3 w-3 text-yellow-500" />
              <span>Bookmarked: {bookmarks.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>Frequent: {quickAccessItems.filter(i => i.type === 'frequent').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-orange-500" />
              <span>Recent: {recentFiles.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
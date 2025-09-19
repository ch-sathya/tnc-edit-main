import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Template,
  Folder,
  Settings
} from 'lucide-react';
import { CollaborationFile, FileBookmark } from '@/types/collaboration';
import { collaborationFileService } from '@/services/collaboration-file-service';
import { fileAccessibilityService } from '@/services/file-accessibility-service';
import { FileBrowserSidebar } from './FileBrowserSidebar';
import { FileTemplatesModal } from './FileTemplatesModal';
import { useToast } from '@/hooks/use-toast';

interface EnhancedFileExplorerProps {
  groupId: string;
  currentUserId: string;
  selectedFile: CollaborationFile | null;
  onFileSelect: (file: CollaborationFile) => void;
  onFileChange?: (files: CollaborationFile[]) => void;
}

export const EnhancedFileExplorer: React.FC<EnhancedFileExplorerProps> = ({
  groupId,
  currentUserId,
  selectedFile,
  onFileSelect,
  onFileChange
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<CollaborationFile[]>([]);
  const [recentFiles, setRecentFiles] = useState<CollaborationFile[]>([]);
  const [bookmarks, setBookmarks] = useState<FileBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  // Load files and accessibility data
  useEffect(() => {
    if (groupId && currentUserId) {
      loadData();
      setupRealtimeSubscription();
    }
  }, [groupId, currentUserId]);

  // Update recent files when a file is selected
  useEffect(() => {
    if (selectedFile && currentUserId) {
      fileAccessibilityService.addToRecentFiles(groupId, currentUserId, selectedFile);
      loadRecentFiles();
    }
  }, [selectedFile, groupId, currentUserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadFiles(),
        loadRecentFiles(),
        loadBookmarks()
      ]);
    } catch (error) {
      console.error('Error loading file explorer data:', error);
      toast({
        title: "Error",
        description: "Failed to load file explorer data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      const filesData = await collaborationFileService.getFiles(groupId);
      setFiles(filesData);
      onFileChange?.(filesData);

      // Auto-select first file if none selected
      if (!selectedFile && filesData.length > 0) {
        onFileSelect(filesData[0]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      throw error;
    }
  };

  const loadRecentFiles = () => {
    try {
      const recent = fileAccessibilityService.getRecentFiles(groupId, currentUserId);
      setRecentFiles(recent);
    } catch (error) {
      console.error('Error loading recent files:', error);
    }
  };

  const loadBookmarks = async () => {
    try {
      const bookmarksData = await fileAccessibilityService.getBookmarks(currentUserId);
      setBookmarks(bookmarksData);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const setupRealtimeSubscription = useCallback(() => {
    return collaborationFileService.subscribeToFileChanges(groupId, (payload) => {
      console.log('File change received:', payload);
      loadFiles(); // Refresh files list
    });
  }, [groupId]);

  const handleBookmarkToggle = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      const success = await fileAccessibilityService.toggleBookmark(
        currentUserId, 
        fileId, 
        file?.name
      );

      if (success) {
        await loadBookmarks();
        const isBookmarked = bookmarks.some(b => b.fileId === fileId);
        toast({
          title: isBookmarked ? "Bookmark removed" : "Bookmark added",
          description: `${file?.name || 'File'} has been ${isBookmarked ? 'removed from' : 'added to'} bookmarks`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update bookmark",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive"
      });
    }
  };

  const handleCreateFromTemplate = async (
    name: string, 
    path: string, 
    content: string, 
    language: string
  ) => {
    try {
      // Check if file already exists
      const pathExists = await collaborationFileService.pathExists(groupId, path);
      if (pathExists) {
        toast({
          title: "File exists",
          description: "A file with this path already exists",
          variant: "destructive"
        });
        return;
      }

      const newFile = await collaborationFileService.createFile({
        name,
        path,
        content,
        language,
        groupId,
        createdBy: currentUserId
      });

      toast({
        title: "File created",
        description: `${name} has been created from template`,
      });

      // Select the new file
      onFileSelect(newFile);
    } catch (error) {
      console.error('Error creating file from template:', error);
      throw error;
    }
  };

  const handleCreateProject = async (structure: any) => {
    try {
      // Create folders and files based on project structure
      const createdFiles: CollaborationFile[] = [];

      // Create files from templates
      for (const fileConfig of structure.files) {
        const template = fileAccessibilityService.getFileTemplates()
          .find(t => t.id === fileConfig.template);
        
        if (template) {
          // Extract filename from path
          const fileName = fileConfig.path.split('/').pop() || fileConfig.path;
          
          // Check if file already exists
          const pathExists = await collaborationFileService.pathExists(groupId, fileConfig.path);
          if (pathExists) {
            console.warn(`File ${fileConfig.path} already exists, skipping`);
            continue;
          }

          // Apply template with basic variables
          const variables = {
            ComponentName: fileName.replace(/\.[^/.]+$/, ""), // Remove extension
            ProjectName: structure.name,
            PageTitle: structure.name,
            PageDescription: structure.description
          };

          const content = fileAccessibilityService.applyTemplate(template, variables);

          const newFile = await collaborationFileService.createFile({
            name: fileName,
            path: fileConfig.path,
            content,
            language: template.language,
            groupId,
            createdBy: currentUserId
          });

          createdFiles.push(newFile);
        }
      }

      toast({
        title: "Project created",
        description: `${structure.name} project structure created with ${createdFiles.length} files`,
      });

      // Select the first created file
      if (createdFiles.length > 0) {
        onFileSelect(createdFiles[0]);
      }
    } catch (error) {
      console.error('Error creating project structure:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading files...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with actions */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              File Explorer
            </CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Template className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                </DialogTrigger>
                <FileTemplatesModal
                  open={showTemplates}
                  onOpenChange={setShowTemplates}
                  onCreateFile={handleCreateFromTemplate}
                  onCreateProject={handleCreateProject}
                />
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Separator className="mb-4" />

      {/* File Browser Sidebar */}
      <div className="flex-1">
        <FileBrowserSidebar
          groupId={groupId}
          currentUserId={currentUserId}
          files={files}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
          recentFiles={recentFiles}
          bookmarks={bookmarks}
          onBookmarkToggle={handleBookmarkToggle}
        />
      </div>
    </div>
  );
};
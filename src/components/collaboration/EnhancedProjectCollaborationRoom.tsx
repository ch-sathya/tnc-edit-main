import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { 
  FolderTree, 
  Zap, 
  Shield, 
  Users,
  Code,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CollaborationFile, FilePermissions } from '@/types/collaboration';
import { collaborationFileService } from '@/services/collaboration-file-service';
import { ProjectFileManager } from './ProjectFileManager';
import { FilePermissionsManager } from './FilePermissionsManager';
import { QuickAccessPanel } from './QuickAccessPanel';
import { CollaborativeMonacoEditor } from './CollaborativeMonacoEditor';
import { ActiveUsersList } from './ActiveUsersList';
import { SocketConnectionStatus } from './SocketConnectionStatus';

interface EnhancedProjectCollaborationRoomProps {
  groupId: string;
  currentUserId: string;
  userName: string;
  onLeave?: () => void;
}

export const EnhancedProjectCollaborationRoom: React.FC<EnhancedProjectCollaborationRoomProps> = ({
  groupId,
  currentUserId,
  userName,
  onLeave
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<CollaborationFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CollaborationFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('files');

  useEffect(() => {
    if (groupId) {
      loadInitialData();
    }
  }, [groupId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load files
      const filesData = await collaborationFileService.getFiles(groupId);
      setFiles(filesData);
      
      // Auto-select first file if available
      if (filesData.length > 0 && !selectedFile) {
        setSelectedFile(filesData[0]);
      }
      
      toast({
        title: "Collaboration room loaded",
        description: `Found ${filesData.length} files in the project`
      });
    } catch (error) {
      console.error('Error loading collaboration room:', error);
      toast({
        title: "Error",
        description: "Failed to load collaboration room",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: CollaborationFile) => {
    setSelectedFile(file);
  };

  const handleFileChange = (updatedFiles: CollaborationFile[]) => {
    setFiles(updatedFiles);
  };

  const handlePermissionsChange = (fileId: string, permissions: FilePermissions) => {
    // Update file permissions in the local state
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === fileId 
          ? { ...file, permissions }
          : file
      )
    );
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading collaboration room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Project Collaboration</h1>
            <SocketConnectionStatus />
          </div>
          <div className="flex items-center gap-2">
            <ActiveUsersList groupId={groupId} currentUserId={currentUserId} />
            {onLeave && (
              <button
                onClick={onLeave}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Leave Room
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Sidebar - File Management */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <div className="h-full border-r">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3 mx-2 mt-2">
                  <TabsTrigger value="files" className="text-xs">
                    <FolderTree className="h-4 w-4 mr-1" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="quick" className="text-xs">
                    <Zap className="h-4 w-4 mr-1" />
                    Quick
                  </TabsTrigger>
                  <TabsTrigger value="permissions" className="text-xs">
                    <Shield className="h-4 w-4 mr-1" />
                    Access
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-hidden">
                  <TabsContent value="files" className="h-full mt-0">
                    <ProjectFileManager
                      groupId={groupId}
                      currentUserId={currentUserId}
                      selectedFile={selectedFile}
                      onFileSelect={handleFileSelect}
                      onFileChange={handleFileChange}
                    />
                  </TabsContent>
                  
                  <TabsContent value="quick" className="h-full mt-0 p-2">
                    <QuickAccessPanel
                      groupId={groupId}
                      currentUserId={currentUserId}
                      files={files}
                      selectedFile={selectedFile}
                      onFileSelect={handleFileSelect}
                    />
                  </TabsContent>
                  
                  <TabsContent value="permissions" className="h-full mt-0 p-2">
                    {selectedFile ? (
                      <FilePermissionsManager
                        file={selectedFile}
                        currentUserId={currentUserId}
                        onPermissionsChange={handlePermissionsChange}
                      />
                    ) : (
                      <Card>
                        <CardContent className="p-4 text-center text-muted-foreground">
                          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Select a file to manage permissions</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Main Editor Area */}
          <ResizablePanel defaultSize={75}>
            <div className="h-full flex flex-col">
              {selectedFile ? (
                <>
                  {/* File Header */}
                  <div className="border-b p-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Code className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h2 className="font-medium">{selectedFile.name}</h2>
                          <p className="text-sm text-muted-foreground">{selectedFile.path}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {selectedFile.language}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          v{selectedFile.version}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="flex-1">
                    <CollaborativeMonacoEditor
                      groupId={groupId}
                      fileId={selectedFile.id}
                      initialContent={selectedFile.content}
                      language={selectedFile.language}
                      currentUserId={currentUserId}
                      userName={userName}
                      onContentChange={(content) => {
                        // Update local file content
                        setSelectedFile(prev => prev ? { ...prev, content } : null);
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Code className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No File Selected</h3>
                    <p className="text-sm">
                      Select a file from the sidebar to start collaborating
                    </p>
                    {files.length === 0 && (
                      <p className="text-xs mt-2">
                        Create your first file to get started
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
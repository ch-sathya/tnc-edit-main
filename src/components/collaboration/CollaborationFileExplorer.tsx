import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  File, 
  Folder, 
  Trash2, 
  Edit3, 
  Code, 
  FileText,
  Settings,
  Save,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Upload,
  Download,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CollaborationFile } from '@/types/collaboration';
import { collaborationFileService } from '@/services/collaboration-file-service';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface CollaborationFileExplorerProps {
  groupId: string;
  currentUserId: string;
  selectedFile: CollaborationFile | null;
  onFileSelect: (file: CollaborationFile) => void;
  onFileChange?: (files: CollaborationFile[]) => void;
}

interface FileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: CollaborationFile;
  children: FileTreeNode[];
  expanded: boolean;
}

export const CollaborationFileExplorer: React.FC<CollaborationFileExplorerProps> = ({
  groupId,
  currentUserId,
  selectedFile,
  onFileSelect,
  onFileChange
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<CollaborationFile[]>([]);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFile, setShowNewFile] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState('javascript');
  const [renameFile, setRenameFile] = useState<CollaborationFile | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files on component mount and when groupId changes
  useEffect(() => {
    if (groupId) {
      loadFiles();
      setupRealtimeSubscription();
    }
  }, [groupId]);

  // Update file tree when files change
  useEffect(() => {
    setFileTree(buildFileTree(files));
  }, [files]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const filesData = await collaborationFileService.getFiles(groupId);
      setFiles(filesData);
      onFileChange?.(filesData);

      // Auto-select first file if none selected
      if (!selectedFile && filesData.length > 0) {
        onFileSelect(filesData[0]);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = useCallback(() => {
    return collaborationFileService.subscribeToFileChanges(groupId, (payload) => {
      console.log('File change received:', payload);
      loadFiles(); // Refresh files list
    });
  }, [groupId]);

  const buildFileTree = (files: CollaborationFile[]): FileTreeNode[] => {
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
            expanded: true // Default to expanded
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
  };

  const createFile = async () => {
    if (!newFileName.trim()) {
      toast({
        title: "Invalid filename",
        description: "Please enter a filename",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if file already exists
      const pathExists = await collaborationFileService.pathExists(groupId, newFileName);
      if (pathExists) {
        toast({
          title: "File exists",
          description: "A file with this path already exists",
          variant: "destructive"
        });
        return;
      }

      const language = collaborationFileService.detectLanguage(newFileName);
      const newFile = await collaborationFileService.createFile({
        name: newFileName.split('/').pop() || newFileName,
        path: newFileName,
        groupId,
        language: newFileLanguage || language,
        createdBy: currentUserId
      });

      toast({
        title: "File created",
        description: `${newFileName} has been created successfully`
      });

      setShowNewFile(false);
      setNewFileName('');
      setNewFileLanguage('javascript');
      
      // Select the new file
      onFileSelect(newFile);
    } catch (error) {
      console.error('Error creating file:', error);
      toast({
        title: "Error",
        description: "Failed to create file",
        variant: "destructive"
      });
    }
  };

  const deleteFile = async (file: CollaborationFile) => {
    if (files.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "You must have at least one file in the collaboration",
        variant: "destructive"
      });
      return;
    }

    try {
      await collaborationFileService.deleteFile(file.id);

      toast({
        title: "File deleted",
        description: `${file.name} has been deleted`
      });

      // If the deleted file was selected, select another file
      if (selectedFile?.id === file.id) {
        const remainingFiles = files.filter(f => f.id !== file.id);
        if (remainingFiles.length > 0) {
          onFileSelect(remainingFiles[0]);
        }
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive"
      });
    }
  };

  const startRename = (file: CollaborationFile) => {
    setRenameFile(file);
    setRenameValue(file.path);
    setShowRename(true);
  };

  const confirmRename = async () => {
    if (!renameFile || !renameValue.trim()) return;

    try {
      // Check if new path already exists
      const pathExists = await collaborationFileService.pathExists(
        groupId, 
        renameValue, 
        renameFile.id
      );
      
      if (pathExists) {
        toast({
          title: "Path exists",
          description: "A file with this path already exists",
          variant: "destructive"
        });
        return;
      }

      const newName = renameValue.split('/').pop() || renameValue;
      await collaborationFileService.renameFile(renameFile.id, newName, renameValue);

      toast({
        title: "File renamed",
        description: `File renamed to ${renameValue}`
      });

      setShowRename(false);
      setRenameFile(null);
      setRenameValue('');
    } catch (error) {
      console.error('Error renaming file:', error);
      toast({
        title: "Error",
        description: "Failed to rename file",
        variant: "destructive"
      });
    }
  };

  const toggleFolder = (path: string) => {
    setFileTree(prevTree => {
      const updateNode = (nodes: FileTreeNode[]): FileTreeNode[] => {
        return nodes.map(node => {
          if (node.path === path && node.isFolder) {
            return { ...node, expanded: !node.expanded };
          }
          if (node.children.length > 0) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      return updateNode(prevTree);
    });
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      let processedFiles = 0;

      for (const file of Array.from(files)) {
        // Validate file size (max 1MB)
        if (file.size > 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 1MB and will be skipped`,
            variant: "destructive"
          });
          processedFiles++;
          setUploadProgress((processedFiles / totalFiles) * 100);
          continue;
        }

        // Validate file type
        if (!isValidFileType(file.name)) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported file type and will be skipped`,
            variant: "destructive"
          });
          processedFiles++;
          setUploadProgress((processedFiles / totalFiles) * 100);
          continue;
        }

        try {
          const content = await readFileContent(file);
          const language = collaborationFileService.detectLanguage(file.name);
          
          // Check if file already exists
          const pathExists = await collaborationFileService.pathExists(groupId, file.name);
          let finalPath = file.name;
          
          if (pathExists) {
            // Generate unique name
            const timestamp = Date.now();
            const nameParts = file.name.split('.');
            if (nameParts.length > 1) {
              const extension = nameParts.pop();
              const baseName = nameParts.join('.');
              finalPath = `${baseName}_${timestamp}.${extension}`;
            } else {
              finalPath = `${file.name}_${timestamp}`;
            }
          }

          await collaborationFileService.createFile({
            name: finalPath.split('/').pop() || finalPath,
            path: finalPath,
            content,
            language,
            groupId,
            createdBy: currentUserId
          });

          processedFiles++;
          setUploadProgress((processedFiles / totalFiles) * 100);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive"
          });
          processedFiles++;
          setUploadProgress((processedFiles / totalFiles) * 100);
        }
      }

      toast({
        title: "Upload complete",
        description: `Successfully uploaded ${processedFiles} file(s)`
      });
    } catch (error) {
      console.error('Error during file upload:', error);
      toast({
        title: "Upload failed",
        description: "An error occurred during file upload",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const isValidFileType = (filename: string): boolean => {
    const validExtensions = [
      'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json', 'md', 'txt',
      'cpp', 'cc', 'cxx', 'java', 'xml', 'yaml', 'yml', 'php', 'rb', 'go',
      'rs', 'swift', 'kt', 'scala', 'sh', 'bat', 'ps1', 'sql', 'r', 'dart'
    ];
    
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? validExtensions.includes(extension) : false;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files);
    }
    // Reset input value to allow uploading the same file again
    e.target.value = '';
  };

  const exportFiles = async () => {
    try {
      const allFiles = await collaborationFileService.getFiles(groupId);
      
      // Create a zip-like structure as JSON
      const exportData = {
        projectName: `collaboration-${groupId}`,
        exportDate: new Date().toISOString(),
        files: allFiles.map(file => ({
          path: file.path,
          content: file.content,
          language: file.language
        }))
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `collaboration-project-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Project files have been exported"
      });
    } catch (error) {
      console.error('Error exporting files:', error);
      toast({
        title: "Export failed",
        description: "Failed to export project files",
        variant: "destructive"
      });
    }
  };

  const importProject = async (file: File) => {
    try {
      const content = await readFileContent(file);
      const projectData = JSON.parse(content);

      if (!projectData.files || !Array.isArray(projectData.files)) {
        throw new Error('Invalid project file format');
      }

      setUploading(true);
      setUploadProgress(0);

      const totalFiles = projectData.files.length;
      let processedFiles = 0;

      for (const fileData of projectData.files) {
        try {
          // Check if file already exists
          const pathExists = await collaborationFileService.pathExists(groupId, fileData.path);
          let finalPath = fileData.path;
          
          if (pathExists) {
            // Generate unique name
            const timestamp = Date.now();
            const pathParts = fileData.path.split('/');
            const fileName = pathParts.pop() || fileData.path;
            const nameParts = fileName.split('.');
            
            if (nameParts.length > 1) {
              const extension = nameParts.pop();
              const baseName = nameParts.join('.');
              const newFileName = `${baseName}_${timestamp}.${extension}`;
              finalPath = pathParts.length > 0 ? `${pathParts.join('/')}/${newFileName}` : newFileName;
            } else {
              const newFileName = `${fileName}_${timestamp}`;
              finalPath = pathParts.length > 0 ? `${pathParts.join('/')}/${newFileName}` : newFileName;
            }
          }

          await collaborationFileService.createFile({
            name: finalPath.split('/').pop() || finalPath,
            path: finalPath,
            content: fileData.content || '',
            language: fileData.language || collaborationFileService.detectLanguage(finalPath),
            groupId,
            createdBy: currentUserId
          });

          processedFiles++;
          setUploadProgress((processedFiles / totalFiles) * 100);
        } catch (error) {
          console.error(`Error importing ${fileData.path}:`, error);
          processedFiles++;
          setUploadProgress((processedFiles / totalFiles) * 100);
        }
      }

      toast({
        title: "Import successful",
        description: `Successfully imported ${processedFiles} file(s) from project`
      });
    } catch (error) {
      console.error('Error importing project:', error);
      toast({
        title: "Import failed",
        description: "Failed to import project file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const renderFileTree = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
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
              <span className="font-medium text-sm">{node.name}</span>
            </>
          ) : (
            <>
              <div className="w-4" /> {/* Spacer for alignment */}
              {getFileIcon(node.file?.language || 'plaintext')}
              <span className="text-sm flex-1 min-w-0 truncate">{node.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <Badge variant="outline" className="text-xs">
                  {node.file?.language}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => node.file && startRename(node.file)}>
                      <Edit3 className="h-3 w-3 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => node.file && deleteFile(node.file)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
    <Card className={`h-full flex flex-col ${dragOver ? 'border-primary border-2 border-dashed' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Files ({files.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={triggerFileUpload}>
                  <Upload className="h-3 w-3 mr-2" />
                  Upload Files
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) importProject(file);
                  };
                  input.click();
                }}>
                  <Download className="h-3 w-3 mr-2" />
                  Import Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportFiles}>
                  <Download className="h-3 w-3 mr-2" />
                  Export Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Dialog open={showNewFile} onOpenChange={setShowNewFile}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New File</DialogTitle>
                  <DialogDescription>
                    Add a new file to the collaboration space. You can include folders by using "/" in the path.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="filename">File Path</Label>
                    <Input
                      id="filename"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="src/components/example.tsx"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use "/" to create folders (e.g., "src/utils/helper.js")
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={newFileLanguage} onValueChange={setNewFileLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="css">CSS</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="cpp">C++</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createFile} disabled={!newFileName.trim()}>
                    <Save className="h-4 w-4 mr-2" />
                    Create File
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      
      <Separator />
      
      {/* Upload Progress */}
      {uploading && (
        <div className="px-4 py-2 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Upload className="h-4 w-4" />
            Uploading files...
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Drag and Drop Overlay */}
      {dragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium text-primary">Drop files here to upload</p>
            <p className="text-xs text-muted-foreground">Supported: JS, TS, Python, HTML, CSS, JSON, MD, and more</p>
          </div>
        </div>
      )}
      
      <CardContent className="flex-1 p-0 relative">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-1 group">
            {fileTree.length > 0 ? (
              renderFileTree(fileTree)
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No files yet</p>
                <p className="text-xs">Create your first file to get started</p>
                <div className="mt-4 space-y-2">
                  <Button variant="outline" size="sm" onClick={triggerFileUpload}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Or drag and drop files here
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".js,.ts,.jsx,.tsx,.py,.html,.css,.json,.md,.txt,.cpp,.cc,.cxx,.java,.xml,.yaml,.yml,.php,.rb,.go,.rs,.swift,.kt,.scala,.sh,.bat,.ps1,.sql,.r,.dart"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Rename Dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter the new path for the file. Use "/" to move to different folders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename">New Path</Label>
              <Input
                id="rename"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="new/path/filename.ext"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRename(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRename} disabled={!renameValue.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  File, 
  Folder, 
  Trash2, 
  Edit3, 
  Code, 
  FileText,
  Image,
  Settings,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FileItem {
  id: string;
  file_path: string;
  content: string;
  language: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

interface FileManagerProps {
  roomId: string;
  currentUserId: string;
  onFileSelect: (file: FileItem) => void;
  selectedFile: FileItem | null;
}

export const FileManager: React.FC<FileManagerProps> = ({
  roomId,
  currentUserId,
  onFileSelect,
  selectedFile
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState('javascript');

  useEffect(() => {
    fetchFiles();
    setupRealtimeSubscription();
  }, [roomId]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('collaboration_files')
        .select('*')
        .eq('room_id', roomId)
        .order('file_path');

      if (error) throw error;
      
      const filesData = data || [];
      setFiles(filesData);

      // If no file is selected and we have files, select the first one
      if (!selectedFile && filesData.length > 0) {
        onFileSelect(filesData[0]);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase.channel(`collaboration_files:${roomId}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'collaboration_files',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        console.log('File change received:', payload);
        fetchFiles(); // Refresh files list
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

    // Check if file already exists
    const existingFile = files.find(f => f.file_path === newFileName);
    if (existingFile) {
      toast({
        title: "File exists",
        description: "A file with this name already exists",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('collaboration_files')
        .insert([{
          room_id: roomId,
          file_path: newFileName,
          content: getDefaultContent(newFileLanguage),
          language: newFileLanguage,
          created_by: currentUserId,
          updated_by: currentUserId
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "File created",
        description: `${newFileName} has been created successfully`
      });

      setShowNewFile(false);
      setNewFileName('');
      setNewFileLanguage('javascript');
      
      // Select the new file
      if (data) {
        onFileSelect(data);
      }
    } catch (error) {
      console.error('Error creating file:', error);
      toast({
        title: "Error",
        description: "Failed to create file",
        variant: "destructive"
      });
    }
  };

  const deleteFile = async (fileId: string, fileName: string) => {
    if (files.length <= 1) {
      toast({
        title: "Cannot delete",
        description: "You must have at least one file in the room",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('collaboration_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      toast({
        title: "File deleted",
        description: `${fileName} has been deleted`
      });

      // If the deleted file was selected, select another file
      if (selectedFile?.id === fileId) {
        const remainingFiles = files.filter(f => f.id !== fileId);
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

  const getDefaultContent = (language: string): string => {
    switch (language) {
      case 'javascript':
        return `// Welcome to the collaboration room!
// Start coding together

function hello() {
  console.log("Hello from ${newFileName}!");
}

hello();`;
      case 'typescript':
        return `// TypeScript collaboration file
interface User {
  name: string;
  id: number;
}

const user: User = {
  name: "Developer",
  id: 1
};

console.log(user);`;
      case 'python':
        return `# Python collaboration file
def hello():
    print(f"Hello from ${newFileName}!")

if __name__ == "__main__":
    hello()`;
      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Collaboration Project</title>
</head>
<body>
    <h1>Hello from ${newFileName}!</h1>
    <p>Start building together!</p>
</body>
</html>`;
      case 'css':
        return `/* CSS collaboration file */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}`;
      case 'json':
        return `{
  "name": "${newFileName}",
  "version": "1.0.0",
  "description": "Collaboration project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}`;
      default:
        return `// ${newFileName}\n// Start coding together!`;
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
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading files...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Files ({files.length})
          </CardTitle>
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
                  Add a new file to the collaboration room
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="filename">File Name</Label>
                  <Input
                    id="filename"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="example.js"
                  />
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
      <CardContent className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className={`flex items-center justify-between p-3 rounded-md border transition-colors cursor-pointer ${
              selectedFile?.id === file.id
                ? 'bg-primary/10 border-primary'
                : 'bg-muted/50 border-border hover:bg-muted'
            }`}
            onClick={() => onFileSelect(file)}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {getFileIcon(file.language)}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{file.file_path}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {file.language}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(file.updated_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                deleteFile(file.id, file.file_path);
              }}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        
        {files.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No files yet</p>
            <p className="text-xs">Create your first file to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
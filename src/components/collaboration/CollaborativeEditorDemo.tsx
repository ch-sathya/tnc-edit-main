import React, { useState } from 'react';
import { CollaborativeEditor } from './CollaborativeEditor';
import { CollaborationFile } from '@/types/collaboration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CollaborativeEditorDemoProps {
  className?: string;
}

export const CollaborativeEditorDemo: React.FC<CollaborativeEditorDemoProps> = ({
  className = ''
}) => {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState('');
  const [fileId, setFileId] = useState('');
  const [isEditorActive, setIsEditorActive] = useState(false);

  const handleStartCollaboration = () => {
    if (!groupId.trim()) {
      toast({
        title: "Group ID Required",
        description: "Please enter a valid group ID to start collaboration",
        variant: "destructive"
      });
      return;
    }

    setIsEditorActive(true);
  };

  const handleFileChange = (file: CollaborationFile) => {
    console.log('File changed:', file);
    toast({
      title: "File Changed",
      description: `Now editing: ${file.name}`,
      variant: "default"
    });
  };

  const handleUserJoin = (user: any) => {
    console.log('User joined:', user);
    toast({
      title: "User Joined",
      description: `${user.name} joined the collaboration`,
      variant: "default"
    });
  };

  const handleUserLeave = (userId: string) => {
    console.log('User left:', userId);
    toast({
      title: "User Left",
      description: "A user left the collaboration",
      variant: "default"
    });
  };

  if (isEditorActive) {
    return (
      <div className={`h-screen ${className}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b bg-background">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">Collaborative Editor Demo</h1>
              <Button 
                variant="outline" 
                onClick={() => setIsEditorActive(false)}
              >
                Exit Editor
              </Button>
            </div>
          </div>
          
          <div className="flex-1">
            <CollaborativeEditor
              groupId={groupId}
              initialFileId={fileId || undefined}
              onFileChange={handleFileChange}
              onUserJoin={handleUserJoin}
              onUserLeave={handleUserLeave}
              className="h-full"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center min-h-screen p-4 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Start Collaborative Editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupId">Group ID</Label>
            <Input
              id="groupId"
              placeholder="Enter group ID"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fileId">Initial File ID (Optional)</Label>
            <Input
              id="fileId"
              placeholder="Enter file ID to open initially"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={handleStartCollaboration}
            className="w-full"
            disabled={!groupId.trim()}
          >
            Start Collaboration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollaborativeEditorDemo;
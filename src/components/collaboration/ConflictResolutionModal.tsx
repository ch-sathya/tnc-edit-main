import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OperationConflict } from '@/lib/operational-transform';
import { conflictResolutionService } from '@/lib/conflict-resolution-service';
import { AlertTriangle, Users, Clock, FileText } from 'lucide-react';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: OperationConflict[];
  onResolve: (conflict: OperationConflict, resolution: 'accept-local' | 'accept-remote' | 'merge', mergedContent?: string) => void;
  currentContent: string;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolve,
  currentContent
}) => {
  const [selectedConflict, setSelectedConflict] = useState<OperationConflict | null>(null);
  const [mergedContent, setMergedContent] = useState('');
  const [activeTab, setActiveTab] = useState('local');

  useEffect(() => {
    if (conflicts.length > 0 && !selectedConflict) {
      setSelectedConflict(conflicts[0]);
    }
  }, [conflicts, selectedConflict]);

  useEffect(() => {
    if (selectedConflict) {
      // Initialize merged content with a combination of both changes
      const localText = selectedConflict.operation1.text;
      const remoteText = selectedConflict.operation2.text;
      setMergedContent(`${localText}\n${remoteText}`);
    }
  }, [selectedConflict]);

  if (!isOpen || conflicts.length === 0) {
    return null;
  }

  const handleResolve = (resolution: 'accept-local' | 'accept-remote' | 'merge') => {
    if (!selectedConflict) return;

    const content = resolution === 'merge' ? mergedContent : undefined;
    onResolve(selectedConflict, resolution, content);

    // Move to next conflict or close if done
    const currentIndex = conflicts.indexOf(selectedConflict);
    const nextConflict = conflicts[currentIndex + 1];
    
    if (nextConflict) {
      setSelectedConflict(nextConflict);
    } else {
      onClose();
    }
  };

  const getConflictTypeColor = (type: string) => {
    switch (type) {
      case 'overlap': return 'bg-red-100 text-red-800 border-red-200';
      case 'nested': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'adjacent': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getPreviewContent = (operation: any, content: string) => {
    try {
      // Simple preview - in practice, this would apply the operation to show the result
      const lines = content.split('\n');
      const startLine = operation.range.startLineNumber - 1;
      const endLine = operation.range.endLineNumber - 1;
      
      // Show context around the change
      const contextStart = Math.max(0, startLine - 2);
      const contextEnd = Math.min(lines.length - 1, endLine + 2);
      
      const contextLines = lines.slice(contextStart, contextEnd + 1);
      
      // Highlight the changed area
      const result = contextLines.map((line, index) => {
        const actualLineNumber = contextStart + index + 1;
        const isInRange = actualLineNumber >= operation.range.startLineNumber && 
                         actualLineNumber <= operation.range.endLineNumber;
        
        return {
          lineNumber: actualLineNumber,
          content: line,
          isChanged: isInRange
        };
      });
      
      return result;
    } catch (error) {
      return [{ lineNumber: 1, content: 'Error generating preview', isChanged: false }];
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle>Resolve Conflicts</CardTitle>
              <Badge variant="outline">
                {conflicts.indexOf(selectedConflict!) + 1} of {conflicts.length}
              </Badge>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
          <CardDescription>
            Multiple users have made conflicting changes. Choose how to resolve each conflict.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {selectedConflict && (
            <div className="grid grid-cols-1 lg:grid-cols-3 h-[60vh]">
              {/* Conflict List Sidebar */}
              <div className="border-r p-4 overflow-y-auto">
                <h3 className="font-semibold mb-3">Conflicts</h3>
                <div className="space-y-2">
                  {conflicts.map((conflict, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-colors ${
                        conflict === selectedConflict ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedConflict(conflict)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={getConflictTypeColor(conflict.conflictType)}>
                            {conflict.conflictType}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span className="text-xs">
                              {conflict.operation1.userId} vs {conflict.operation2.userId}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">
                              {formatTimestamp(conflict.operation1.timestamp)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Conflict Resolution Area */}
              <div className="col-span-2 flex flex-col">
                <div className="p-4 border-b">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <h3 className="font-semibold">
                      {selectedConflict.conflictType.charAt(0).toUpperCase() + 
                       selectedConflict.conflictType.slice(1)} Conflict
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Two users made changes to the same area. Choose which version to keep or create a merged version.
                  </p>
                </div>

                <div className="flex-1 overflow-hidden">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
                      <TabsTrigger value="local">Your Changes</TabsTrigger>
                      <TabsTrigger value="remote">Their Changes</TabsTrigger>
                      <TabsTrigger value="merge">Merge</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-hidden">
                      <TabsContent value="local" className="h-full p-4 overflow-y-auto">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Your Version</h4>
                            <Badge variant="outline">Local</Badge>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded p-3">
                            <pre className="text-sm whitespace-pre-wrap font-mono">
                              {selectedConflict.operation1.text || '(deletion)'}
                            </pre>
                          </div>
                          <div className="text-xs text-gray-500">
                            <div>User: {selectedConflict.operation1.userId}</div>
                            <div>Time: {formatTimestamp(selectedConflict.operation1.timestamp)}</div>
                            <div>Version: {selectedConflict.operation1.version}</div>
                          </div>
                          <Button 
                            onClick={() => handleResolve('accept-local')}
                            className="w-full"
                            variant="outline"
                          >
                            Accept Your Changes
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="remote" className="h-full p-4 overflow-y-auto">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Their Version</h4>
                            <Badge variant="outline">Remote</Badge>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <pre className="text-sm whitespace-pre-wrap font-mono">
                              {selectedConflict.operation2.text || '(deletion)'}
                            </pre>
                          </div>
                          <div className="text-xs text-gray-500">
                            <div>User: {selectedConflict.operation2.userId}</div>
                            <div>Time: {formatTimestamp(selectedConflict.operation2.timestamp)}</div>
                            <div>Version: {selectedConflict.operation2.version}</div>
                          </div>
                          <Button 
                            onClick={() => handleResolve('accept-remote')}
                            className="w-full"
                            variant="outline"
                          >
                            Accept Their Changes
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="merge" className="h-full p-4 overflow-y-auto">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Merged Version</h4>
                            <Badge variant="outline">Custom</Badge>
                          </div>
                          <Textarea
                            value={mergedContent}
                            onChange={(e) => setMergedContent(e.target.value)}
                            placeholder="Edit the merged content..."
                            className="min-h-[200px] font-mono text-sm"
                          />
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Manually edit the content above to create a merged version that combines both changes.
                            </AlertDescription>
                          </Alert>
                          <Button 
                            onClick={() => handleResolve('merge')}
                            className="w-full"
                            disabled={!mergedContent.trim()}
                          >
                            Apply Merged Changes
                          </Button>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConflictResolutionModal;
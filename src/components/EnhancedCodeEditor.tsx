import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Copy, Play, Download, Settings, Save } from 'lucide-react';

interface User {
  id: string;
  name: string;
  color: string;
}

interface RoomParticipant {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
  } | null;
}

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

interface CursorInfo {
  user_id: string;
  cursor_position: { lineNumber: number; column: number };
  selection_range?: { 
    startLineNumber: number; 
    startColumn: number; 
    endLineNumber: number; 
    endColumn: number; 
  };
  user_name: string;
  user_color: string;
}

interface EnhancedCodeEditorProps {
  projectId: string;
  currentUser: User;
  participants: RoomParticipant[];
  selectedFile: FileItem;
  onFileUpdate: (file: FileItem) => void;
}

const EnhancedCodeEditor: React.FC<EnhancedCodeEditorProps> = ({
  projectId,
  currentUser,
  participants,
  selectedFile,
  onFileUpdate
}) => {
  const { toast } = useToast();
  const [code, setCode] = useState(selectedFile.content);
  const [isLoading, setIsLoading] = useState(false);
  const [cursors, setCursors] = useState<CursorInfo[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const channelRef = useRef<any>(null);
  const cursorChannelRef = useRef<any>(null);
  const isUpdatingRef = useRef(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Convert participants to display users
  const onlineUsers: User[] = participants.map((participant, index) => ({
    id: participant.user_id,
    name: participant.profiles?.display_name || participant.profiles?.username || 'Unknown',
    color: getRandomColor(index)
  }));

  useEffect(() => {
    setCode(selectedFile.content);
    setHasUnsavedChanges(false);
    setupRealtimeSubscriptions();
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (cursorChannelRef.current) {
        supabase.removeChannel(cursorChannelRef.current);
      }
    };
  }, [selectedFile.id]);

  function getRandomColor(index: number): string {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    return colors[index % colors.length];
  }

  const setupRealtimeSubscriptions = () => {
    // File content subscription
    const channel = supabase.channel(`collaboration_files:${selectedFile.id}`);
    
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'collaboration_files',
        filter: `id=eq.${selectedFile.id}`
      },
      (payload) => {
        if (payload.new && !isUpdatingRef.current) {
          const newData = payload.new as FileItem;
          if (newData.content !== code) {
            setCode(newData.content);
            onFileUpdate(newData);
            setHasUnsavedChanges(false);
          }
        }
      }
    );

    channel.subscribe();
    channelRef.current = channel;

    // Cursor tracking subscription
    const cursorChannel = supabase.channel(`cursors:${projectId}:${selectedFile.file_path}`);
    
    cursorChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'collaboration_cursors',
        filter: `room_id=eq.${projectId}.and.file_path=eq.${selectedFile.file_path}`
      },
      () => {
        fetchCursors();
      }
    );

    cursorChannel.subscribe();
    cursorChannelRef.current = cursorChannel;
    
    fetchCursors();
  };

  const fetchCursors = async () => {
    try {
      const { data, error } = await supabase
        .from('collaboration_cursors')
        .select(`
          *,
          profiles:user_id (
            display_name,
            username
          )
        `)
        .eq('room_id', projectId)
        .eq('file_path', selectedFile.file_path)
        .neq('user_id', currentUser.id)
        .gte('last_active', new Date(Date.now() - 30000).toISOString()); // Active in last 30 seconds

      if (error) throw error;

      const cursorData = data.map((cursor, index) => ({
        user_id: cursor.user_id,
        cursor_position: cursor.cursor_position,
        selection_range: cursor.selection_range,
        user_name: cursor.profiles?.display_name || cursor.profiles?.username || 'Unknown',
        user_color: getRandomColor(index)
      }));

      setCursors(cursorData);
    } catch (error) {
      console.error('Error fetching cursors:', error);
    }
  };

  const updateCursorPosition = async (position: any, selection?: any) => {
    try {
      await supabase
        .from('collaboration_cursors')
        .upsert({
          room_id: projectId,
          file_path: selectedFile.file_path,
          user_id: currentUser.id,
          cursor_position: position,
          selection_range: selection,
          last_active: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating cursor:', error);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && value !== selectedFile.content) {
      setCode(value);
      setHasUnsavedChanges(true);
    }
  };

  const handleCursorPositionChange = (event: any) => {
    if (editorRef.current) {
      const position = editorRef.current.getPosition();
      const selection = editorRef.current.getSelection();
      
      if (position) {
        updateCursorPosition(
          { lineNumber: position.lineNumber, column: position.column },
          selection ? {
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn: selection.endColumn
          } : null
        );
      }
    }
  };

  const saveFile = async () => {
    if (!hasUnsavedChanges) {
      toast({
        title: "No changes to save",
        description: "File is already up to date"
      });
      return;
    }

    setIsLoading(true);
    isUpdatingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('collaboration_files')
        .update({
          content: code,
          updated_by: currentUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedFile.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        onFileUpdate(data);
        setHasUnsavedChanges(false);
        
        toast({
          title: "File saved",
          description: `${selectedFile.file_path} has been saved successfully`
        });
      }
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        title: "Save failed",
        description: "Failed to save file changes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Listen for cursor position changes
    editor.onDidChangeCursorPosition(handleCursorPositionChange);
    editor.onDidChangeCursorSelection(handleCursorPositionChange);

    // Render remote cursors
    const decorationsCollection = editor.createDecorationsCollection();
    
    const updateDecorations = () => {
      const decorations = cursors.map(cursor => ({
        range: new monaco.Range(
          cursor.cursor_position.lineNumber,
          cursor.cursor_position.column,
          cursor.cursor_position.lineNumber,
          cursor.cursor_position.column + 1
        ),
        options: {
          className: 'remote-cursor',
          glyphMarginClassName: 'remote-cursor-glyph',
          hoverMessage: { value: `${cursor.user_name}'s cursor` },
          before: {
            content: cursor.user_name.charAt(0),
            backgroundColor: cursor.user_color,
            color: 'white'
          }
        }
      }));

      decorationsCollection.set(decorations);
    };

    // Update decorations when cursors change
    const interval = setInterval(updateDecorations, 500);
    
    return () => clearInterval(interval);
  };

  const copyProjectId = () => {
    navigator.clipboard.writeText(projectId);
    toast({
      title: "Copied to clipboard",
      description: "Room ID has been copied to clipboard"
    });
  };

  const downloadFile = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.file_path;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full bg-background flex flex-col">
      {/* File Header */}
      <div className="h-12 bg-muted border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{selectedFile.file_path}</span>
            <Badge variant="outline" className="text-xs">
              {selectedFile.language}
            </Badge>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="text-xs">
                Unsaved
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={saveFile}
            disabled={!hasUnsavedChanges || isLoading}
            className="glass-card"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-2" />
                Save {hasUnsavedChanges && '*'}
              </>
            )}
          </Button>
          
          <Button variant="outline" size="sm" onClick={downloadFile}>
            <Download className="h-3 w-3 mr-2" />
            Download
          </Button>
          
          <Button variant="outline" size="sm" onClick={copyProjectId}>
            <Copy className="h-3 w-3 mr-2" />
            Copy Room ID
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={selectedFile.language}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Monaco, Menlo, "Ubuntu Mono", monospace',
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            minimap: { enabled: true },
            folding: true,
            lineNumbersMinChars: 3,
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            contextmenu: true,
            selectOnLineNumbers: true,
            glyphMargin: true
          }}
        />
        
        {/* Cursor Indicators */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1">
          {cursors.map((cursor) => (
            <div
              key={cursor.user_id}
              className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border rounded-md px-2 py-1 text-xs"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cursor.user_color }}
              />
              <span className="text-foreground">{cursor.user_name}</span>
              <span className="text-muted-foreground">
                L{cursor.cursor_position.lineNumber}:C{cursor.cursor_position.column}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnhancedCodeEditor;
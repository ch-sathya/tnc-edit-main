import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { CursorManager } from './CursorManager';
import { TypingIndicator } from './TypingIndicator';
import ConflictResolutionModal from './ConflictResolutionModal';
import { socketService } from '@/services/socket-service';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { conflictResolutionService } from '@/lib/conflict-resolution-service';
import { OperationalTransform, OperationConflict } from '@/lib/operational-transform';
import {
  CollaborationFile,
  CollaborationUser,
  EditorChange,
  CursorPosition,
  TextSelection
} from '@/types/collaboration';
import './collaboration.css';

interface CollaborativeMonacoEditorProps {
  groupId: string;
  currentUser: CollaborationUser;
  currentFile: CollaborationFile;
  onFileChange?: (file: CollaborationFile) => void;
  onContentChange?: (content: string) => void;
  className?: string;
  height?: string;
  theme?: string;
  readOnly?: boolean;
}

// Language detection based on file extensions
const getLanguageFromPath = (filePath: string): string => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'md': 'markdown',
    'markdown': 'markdown',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'yml': 'yaml',
    'yaml': 'yaml'
  };

  return languageMap[extension || ''] || 'plaintext';
};

export const CollaborativeMonacoEditor: React.FC<CollaborativeMonacoEditorProps> = ({
  groupId,
  currentUser,
  currentFile,
  onFileChange,
  onContentChange,
  className = '',
  height = '100%',
  theme = 'vs-dark',
  readOnly = false
}) => {
  const { toast } = useToast();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const isUpdatingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // State
  const [content, setContent] = useState(currentFile.content);
  const [language, setLanguage] = useState(getLanguageFromPath(currentFile.path));
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [selections, setSelections] = useState<TextSelection[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(socketService.isConnected());
  const [decorationsCollection, setDecorationsCollection] = useState<any>(null);
  const [conflicts, setConflicts] = useState<OperationConflict[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [lastChangeEvent, setLastChangeEvent] = useState<any>(null);

  // Initialize editor and set up subscriptions
  useEffect(() => {
    setupRealtimeSubscriptions();
    setupSocketListeners();
    
    return () => {
      cleanup();
    };
  }, [currentFile.id, groupId]);

  // Update content when file changes
  useEffect(() => {
    if (currentFile.content !== content && !isUpdatingRef.current) {
      setContent(currentFile.content);
      setLanguage(getLanguageFromPath(currentFile.path));
    }
  }, [currentFile]);

  // Update selection decorations when selections change
  useEffect(() => {
    if (decorationsCollection && monacoRef.current && selections.length > 0) {
      const decorations = selections.map(selection => {
        // Convert hex color to rgba for background
        const hexToRgba = (hex: string, alpha: number) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        return {
          range: new monacoRef.current.Range(
            selection.startLine,
            selection.startColumn,
            selection.endLine,
            selection.endColumn
          ),
          options: {
            className: 'collaboration-selection',
            stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            inlineClassName: 'collaboration-selection-inline',
            hoverMessage: { value: `${selection.userName}'s selection` },
            minimap: {
              color: selection.color,
              position: monacoRef.current.editor.MinimapPosition.Inline
            },
            // Dynamic styling based on user color
            backgroundColor: hexToRgba(selection.color, 0.2),
            border: `1px solid ${hexToRgba(selection.color, 0.4)}`,
            borderRadius: '2px'
          }
        };
      });

      decorationsCollection.set(decorations);
    } else if (decorationsCollection) {
      decorationsCollection.clear();
    }
  }, [selections, decorationsCollection]);

  // Setup Supabase real-time subscriptions for file content changes
  const setupRealtimeSubscriptions = useCallback(() => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabase.channel(`collaboration_files:${currentFile.id}`);
    
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'collaboration_files',
        filter: `id=eq.${currentFile.id}`
      },
      (payload) => {
        if (payload.new && !isUpdatingRef.current) {
          const updatedFile = payload.new as CollaborationFile;
          if (updatedFile.content !== content) {
            setContent(updatedFile.content);
            onFileChange?.(updatedFile);
          }
        }
      }
    );

    channel.subscribe((status) => {
      console.log('File subscription status:', status);
    });

    realtimeChannelRef.current = channel;
  }, [currentFile.id, content, onFileChange]);

  // Setup Socket.IO listeners for real-time collaboration
  const setupSocketListeners = useCallback(() => {
    // Connection status
    socketService.on('connection-status-changed', (status: string) => {
      setIsConnected(status === 'connected');
    });

    // Cursor updates
    socketService.on('cursor-updated', (data: { fileId: string; cursor: CursorPosition }) => {
      if (data.fileId === currentFile.id && data.cursor.userId !== currentUser.id) {
        setCursors(prev => {
          const filtered = prev.filter(c => c.userId !== data.cursor.userId);
          return [...filtered, data.cursor];
        });
        
        // Store user name for typing indicator
        setUserNames(prev => ({
          ...prev,
          [data.cursor.userId]: data.cursor.userName
        }));
      }
    });

    // Selection updates
    socketService.on('selection-updated', (data: { fileId: string; selection: TextSelection }) => {
      if (data.fileId === currentFile.id && data.selection.userId !== currentUser.id) {
        setSelections(prev => {
          const filtered = prev.filter(s => s.userId !== data.selection.userId);
          return [...filtered, data.selection];
        });
        
        // Store user name for typing indicator
        setUserNames(prev => ({
          ...prev,
          [data.selection.userId]: data.selection.userName
        }));
      }
    });

    // Typing indicators
    socketService.on('user-typing', (data: { fileId: string; userId: string; isTyping: boolean }) => {
      if (data.fileId === currentFile.id && data.userId !== currentUser.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.userId);
          } else {
            newSet.delete(data.userId);
          }
          return newSet;
        });
      }
    });

    // User left
    socketService.on('user-left', (userId: string) => {
      setCursors(prev => prev.filter(c => c.userId !== userId));
      setSelections(prev => prev.filter(s => s.userId !== userId));
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });
  }, [currentFile.id, currentUser.id]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Remove socket listeners
    socketService.off('connection-status-changed', () => {});
    socketService.off('cursor-updated', () => {});
    socketService.off('selection-updated', () => {});
    socketService.off('user-typing', () => {});
    socketService.off('user-left', () => {});
  }, []);

  // Handle editor mounting
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Create decorations collection for selections
    const decorations = editor.createDecorationsCollection();
    setDecorationsCollection(decorations);

    // Set up cursor position change listener
    editor.onDidChangeCursorPosition((e: any) => {
      if (!readOnly && isConnected) {
        const position = editor.getPosition();
        if (position) {
          const cursor: CursorPosition = {
            line: position.lineNumber,
            column: position.column,
            userId: currentUser.id,
            userName: currentUser.name,
            color: currentUser.cursorColor,
            timestamp: Date.now()
          };
          
          socketService.updateCursor(groupId, currentFile.id, cursor);
        }
      }
    });

    // Set up selection change listener with enhanced tracking
    editor.onDidChangeCursorSelection((e: any) => {
      if (!readOnly && isConnected) {
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
          const textSelection: TextSelection = {
            startLine: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLine: selection.endLineNumber,
            endColumn: selection.endColumn,
            userId: currentUser.id,
            userName: currentUser.name,
            color: currentUser.cursorColor
          };
          
          socketService.updateSelection(groupId, currentFile.id, textSelection);
        }
      }
    });

    // Focus the editor
    editor.focus();
  }, [groupId, currentFile.id, currentUser, readOnly, isConnected]);

  // Handle content changes with operational transformation
  const handleEditorChange = useCallback(async (value: string | undefined, event?: any) => {
    if (value === undefined || readOnly || isUpdatingRef.current) return;

    // Store the change event for operational transformation
    setLastChangeEvent(event);

    // Create EditorChange object from Monaco change event
    let editorChange: EditorChange | null = null;
    
    if (event && event.changes && event.changes.length > 0) {
      const change = event.changes[0]; // Handle first change for simplicity
      editorChange = {
        range: {
          startLineNumber: change.range.startLineNumber,
          startColumn: change.range.startColumn,
          endLineNumber: change.range.endLineNumber,
          endColumn: change.range.endColumn
        },
        text: change.text,
        rangeLength: change.rangeLength,
        userId: currentUser.id,
        timestamp: Date.now(),
        version: currentFile.version + 1
      };
    }

    // Process change through conflict resolution service
    if (editorChange) {
      try {
        const result = await conflictResolutionService.processChange(
          currentFile.id,
          editorChange,
          content
        );

        // Check for conflicts
        if (result.conflicts.length > 0) {
          setConflicts(result.conflicts);
          
          // Show conflict modal for manual conflicts
          const manualConflicts = result.conflicts.filter(c => !OperationalTransform.canAutoResolve(c));
          if (manualConflicts.length > 0) {
            setShowConflictModal(true);
            toast({
              title: "Conflicts Detected",
              description: `${manualConflicts.length} conflict(s) need manual resolution.`,
              variant: "destructive"
            });
          }
        }

        // Use the resolved content
        setContent(result.finalContent);
        onContentChange?.(result.finalContent);
      } catch (error) {
        console.error('Error processing change with conflict resolution:', error);
        // Fallback to original behavior
        setContent(value);
        onContentChange?.(value);
      }
    } else {
      // Fallback for changes without proper event data
      setContent(value);
      onContentChange?.(value);
    }

    // Start typing indicator
    if (isConnected) {
      socketService.startTyping(groupId, currentFile.id, currentUser.id);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(groupId, currentFile.id, currentUser.id);
      }, 2000);
    }

    // Broadcast content changes to Supabase
    try {
      isUpdatingRef.current = true;
      
      const { error } = await supabase
        .from('collaboration_files')
        .update({
          content: value,
          updated_at: new Date().toISOString(),
          version: currentFile.version + 1
        })
        .eq('id', currentFile.id);

      if (error) {
        console.error('Error updating file content:', error);
        toast({
          title: "Sync Error",
          description: "Failed to sync changes. Your changes may not be saved.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error broadcasting content change:', error);
    } finally {
      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  }, [groupId, currentFile.id, currentFile.version, currentUser.id, readOnly, isConnected, onContentChange, toast, content]);

  // Handle cursor updates from CursorManager
  const handleCursorUpdate = useCallback((cursor: CursorPosition) => {
    if (isConnected) {
      socketService.updateCursor(groupId, currentFile.id, cursor);
    }
  }, [groupId, currentFile.id, isConnected]);

  // Handle selection updates from CursorManager
  const handleSelectionUpdate = useCallback((selection: TextSelection) => {
    if (isConnected) {
      socketService.updateSelection(groupId, currentFile.id, selection);
    }
  }, [groupId, currentFile.id, isConnected]);

  // Handle conflict resolution
  const handleConflictResolve = useCallback(async (
    conflict: OperationConflict,
    resolution: 'accept-local' | 'accept-remote' | 'merge',
    mergedContent?: string
  ) => {
    try {
      const resolvedChange = await conflictResolutionService.resolveConflictManually(
        conflict,
        resolution,
        mergedContent
      );

      // Apply the resolved change
      const newContent = OperationalTransform.apply(content, resolvedChange);
      setContent(newContent);
      onContentChange?.(newContent);

      // Remove resolved conflict from state
      setConflicts(prev => prev.filter(c => c !== conflict));

      toast({
        title: "Conflict Resolved",
        description: "The conflict has been resolved successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast({
        title: "Resolution Error",
        description: "Failed to resolve the conflict. Please try again.",
        variant: "destructive"
      });
    }
  }, [content, onContentChange, toast]);

  // Handle closing conflict modal
  const handleCloseConflictModal = useCallback(() => {
    setShowConflictModal(false);
    
    // Auto-resolve any remaining conflicts if possible
    conflictResolutionService.processAutoResolvableConflicts().then(result => {
      if (result.resolved > 0) {
        toast({
          title: "Auto-resolved Conflicts",
          description: `${result.resolved} conflict(s) were automatically resolved.`,
          variant: "default"
        });
      }
    });
  }, [toast]);

  // Check for pending conflicts periodically
  useEffect(() => {
    const checkConflicts = () => {
      const pendingConflicts = conflictResolutionService.getPendingConflicts();
      if (pendingConflicts.length > 0 && !showConflictModal) {
        setConflicts(pendingConflicts);
        setShowConflictModal(true);
      }
    };

    const interval = setInterval(checkConflicts, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [showConflictModal]);

  return (
    <div className={`relative ${className}`}>
      <Editor
        height={height}
        language={language}
        value={content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={theme}
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
          glyphMargin: true,
          readOnly,
          // Collaboration-specific options
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          mouseWheelScrollSensitivity: 1,
          fastScrollSensitivity: 5,
          scrollbar: {
            useShadows: false,
            verticalHasArrows: true,
            horizontalHasArrows: true,
            vertical: 'visible',
            horizontal: 'visible',
            verticalScrollbarSize: 17,
            horizontalScrollbarSize: 17
          }
        }}
      />
      
      {/* Cursor Manager for displaying other users' cursors */}
      <CursorManager
        cursors={cursors}
        selections={selections}
        editorRef={editorRef}
        onCursorUpdate={handleCursorUpdate}
        onSelectionUpdate={handleSelectionUpdate}
      />
      
      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
        <TypingIndicator
          typingUsers={Array.from(typingUsers)}
          userNames={userNames}
          className="absolute bottom-4 left-4"
        />
      )}
      
      {/* Connection Status Indicator */}
      {!isConnected && (
        <div className="absolute top-4 right-4 connection-status-indicator px-3 py-2 rounded-md text-sm text-red-400 border border-red-500/30">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Disconnected - Changes may not sync</span>
          </div>
        </div>
      )}

      {/* Conflict Indicator */}
      {conflicts.length > 0 && !showConflictModal && (
        <div className="absolute top-4 left-4 px-3 py-2 rounded-md text-sm text-orange-400 border border-orange-500/30 bg-orange-900/20">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span>{conflicts.length} conflict(s) detected</span>
            <button
              onClick={() => setShowConflictModal(true)}
              className="text-orange-300 hover:text-orange-100 underline ml-2"
            >
              Resolve
            </button>
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={showConflictModal}
        onClose={handleCloseConflictModal}
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        currentContent={content}
      />
    </div>
  );
};

export default CollaborativeMonacoEditor;
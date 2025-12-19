import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type * as Monaco from 'monaco-editor';

export interface CollaboratorCursor {
  id: string;
  name: string;
  color: string;
  position: {
    lineNumber: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  lastUpdate: number;
}

interface CursorMessage {
  userId: string;
  userName: string;
  userColor: string;
  position: {
    lineNumber: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  fileId: string;
}

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
];

const getUserColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

export const useRealtimeCursors = (
  roomId: string | undefined,
  userId: string | undefined,
  userName: string,
  currentFileId: string | undefined
) => {
  const [collaborators, setCollaborators] = useState<Map<string, CollaboratorCursor>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const widgetsRef = useRef<Map<string, Monaco.editor.IContentWidget>>(new Map());

  // Broadcast cursor position
  const broadcastCursor = useCallback((
    position: { lineNumber: number; column: number },
    selection?: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }
  ) => {
    if (!channelRef.current || !userId || !currentFileId) return;

    const message: CursorMessage = {
      userId,
      userName,
      userColor: getUserColor(userId),
      position,
      selection,
      fileId: currentFileId
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor-move',
      payload: message
    });
  }, [userId, userName, currentFileId]);

  // Subscribe to cursor updates
  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = supabase.channel(`cursors:${roomId}`, {
      config: {
        presence: { key: userId },
        broadcast: { self: false }
      }
    });

    channel
      .on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
        const msg = payload as CursorMessage;
        
        // Only show cursors for the same file
        if (msg.fileId !== currentFileId) return;
        
        // Don't show own cursor
        if (msg.userId === userId) return;

        setCollaborators(prev => {
          const updated = new Map(prev);
          updated.set(msg.userId, {
            id: msg.userId,
            name: msg.userName,
            color: msg.userColor,
            position: msg.position,
            selection: msg.selection,
            lastUpdate: Date.now()
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setCollaborators(prev => {
          const updated = new Map(prev);
          updated.delete(key);
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: userId,
            name: userName,
            color: getUserColor(userId),
            online_at: new Date().toISOString()
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomId, userId, userName, currentFileId]);

  // Clean up stale cursors (older than 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCollaborators(prev => {
        const updated = new Map(prev);
        let changed = false;
        
        prev.forEach((cursor, id) => {
          if (now - cursor.lastUpdate > 10000) {
            updated.delete(id);
            changed = true;
          }
        });
        
        return changed ? updated : prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Render cursors in Monaco editor
  const renderCursors = useCallback((
    editor: Monaco.editor.IStandaloneCodeEditor,
    monaco: typeof Monaco
  ) => {
    if (!editor || !monaco) return;

    // Clear existing decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

    // Clear existing widgets
    widgetsRef.current.forEach((widget) => {
      editor.removeContentWidget(widget);
    });
    widgetsRef.current.clear();

    const newDecorations: Monaco.editor.IModelDeltaDecoration[] = [];

    collaborators.forEach((cursor) => {
      // Create cursor decoration
      newDecorations.push({
        range: new monaco.Range(
          cursor.position.lineNumber,
          cursor.position.column,
          cursor.position.lineNumber,
          cursor.position.column + 1
        ),
        options: {
          className: `collaborator-cursor-${cursor.id.replace(/[^a-zA-Z0-9]/g, '')}`,
          beforeContentClassName: `collaborator-cursor-line-${cursor.id.replace(/[^a-zA-Z0-9]/g, '')}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      });

      // Create selection decoration if exists
      if (cursor.selection) {
        newDecorations.push({
          range: new monaco.Range(
            cursor.selection.startLineNumber,
            cursor.selection.startColumn,
            cursor.selection.endLineNumber,
            cursor.selection.endColumn
          ),
          options: {
            className: `collaborator-selection-${cursor.id.replace(/[^a-zA-Z0-9]/g, '')}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        });
      }

      // Create name label widget
      const widget: Monaco.editor.IContentWidget = {
        getId: () => `cursor-label-${cursor.id}`,
        getDomNode: () => {
          const node = document.createElement('div');
          node.className = 'collaborator-cursor-label';
          node.style.cssText = `
            position: absolute;
            background-color: ${cursor.color};
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
            pointer-events: none;
            z-index: 100;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transform: translateY(-100%);
            margin-top: -4px;
          `;
          node.textContent = cursor.name;
          return node;
        },
        getPosition: () => ({
          position: { lineNumber: cursor.position.lineNumber, column: cursor.position.column },
          preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE]
        })
      };

      editor.addContentWidget(widget);
      widgetsRef.current.set(cursor.id, widget);
    });

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations([], newDecorations);

    // Inject dynamic styles
    const styleId = 'collaborator-cursor-styles';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    let styles = '';
    collaborators.forEach((cursor) => {
      const safeId = cursor.id.replace(/[^a-zA-Z0-9]/g, '');
      styles += `
        .collaborator-cursor-line-${safeId}::before {
          content: '';
          position: absolute;
          width: 2px;
          height: 18px;
          background-color: ${cursor.color};
          animation: cursor-blink 1s ease-in-out infinite;
        }
        .collaborator-selection-${safeId} {
          background-color: ${cursor.color}33;
        }
      `;
    });

    styles += `
      @keyframes cursor-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;

    styleEl.textContent = styles;
  }, [collaborators]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const styleEl = document.getElementById('collaborator-cursor-styles');
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, []);

  return {
    collaborators: Array.from(collaborators.values()),
    broadcastCursor,
    renderCursors
  };
};

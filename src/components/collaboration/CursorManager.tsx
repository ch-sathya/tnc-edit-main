import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { CursorPosition, TextSelection } from '@/types/collaboration';

interface CursorManagerProps {
  cursors: CursorPosition[];
  selections: TextSelection[];
  editorRef: React.RefObject<any>; // Monaco editor instance
  onCursorUpdate?: (cursor: CursorPosition) => void;
  onSelectionUpdate?: (selection: TextSelection) => void;
  currentUserId: string;
  currentUserName: string;
  currentUserColor: string;
}

interface CursorDecoration {
  id: string;
  range: any; // Monaco Range
  options: any; // Monaco decoration options
}

export const CursorManager: React.FC<CursorManagerProps> = ({
  cursors,
  selections,
  editorRef,
  onCursorUpdate,
  onSelectionUpdate,
  currentUserId,
  currentUserName,
  currentUserColor
}) => {
  const decorationsRef = useRef<string[]>([]);
  const cursorWidgetsRef = useRef<Map<string, any>>(new Map());
  const lastCursorPositionRef = useRef<CursorPosition | null>(null);
  const lastSelectionRef = useRef<TextSelection | null>(null);

  // Generate unique colors for users
  const generateUserColor = useCallback((userId: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  // Filter out current user's cursor and selections
  const otherUsersCursors = useMemo(() => 
    cursors.filter(cursor => cursor.userId !== currentUserId),
    [cursors, currentUserId]
  );

  const otherUsersSelections = useMemo(() => 
    selections.filter(selection => selection.userId !== currentUserId),
    [selections, currentUserId]
  );

  // Handle cursor position changes from Monaco editor
  const handleCursorPositionChange = useCallback((e: any) => {
    if (!editorRef.current || !onCursorUpdate) return;

    const position = e.position;
    if (!position) return;

    const newCursor: CursorPosition = {
      line: position.lineNumber,
      column: position.column,
      userId: currentUserId,
      userName: currentUserName,
      color: currentUserColor,
      timestamp: Date.now()
    };

    // Only emit if position actually changed
    const lastCursor = lastCursorPositionRef.current;
    if (!lastCursor || 
        lastCursor.line !== newCursor.line || 
        lastCursor.column !== newCursor.column) {
      lastCursorPositionRef.current = newCursor;
      onCursorUpdate(newCursor);
    }
  }, [currentUserId, currentUserName, currentUserColor, onCursorUpdate, editorRef]);

  // Handle selection changes from Monaco editor
  const handleSelectionChange = useCallback((e: any) => {
    if (!editorRef.current || !onSelectionUpdate) return;

    const selection = e.selection;
    if (!selection) return;

    // Only emit if there's an actual selection (not just cursor)
    if (selection.isEmpty()) return;

    const newSelection: TextSelection = {
      startLine: selection.startLineNumber,
      startColumn: selection.startColumn,
      endLine: selection.endLineNumber,
      endColumn: selection.endColumn,
      userId: currentUserId,
      userName: currentUserName,
      color: currentUserColor
    };

    // Only emit if selection actually changed
    const lastSelection = lastSelectionRef.current;
    if (!lastSelection ||
        lastSelection.startLine !== newSelection.startLine ||
        lastSelection.startColumn !== newSelection.startColumn ||
        lastSelection.endLine !== newSelection.endLine ||
        lastSelection.endColumn !== newSelection.endColumn) {
      lastSelectionRef.current = newSelection;
      onSelectionUpdate(newSelection);
    }
  }, [currentUserId, currentUserName, currentUserColor, onSelectionUpdate, editorRef]);

  // Create cursor widget for other users
  const createCursorWidget = useCallback((cursor: CursorPosition) => {
    if (!editorRef.current) return null;

    const editor = editorRef.current;
    const monaco = (window as any).monaco;
    
    if (!monaco) return null;

    // Create cursor element
    const cursorElement = document.createElement('div');
    cursorElement.className = 'collaboration-cursor';
    cursorElement.style.cssText = `
      position: absolute;
      width: 2px;
      height: 18px;
      background-color: ${cursor.color};
      pointer-events: none;
      z-index: 1000;
      animation: cursor-blink 1s infinite;
    `;

    // Create user name label
    const labelElement = document.createElement('div');
    labelElement.className = 'collaboration-cursor-label';
    labelElement.textContent = cursor.userName;
    labelElement.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      background-color: ${cursor.color};
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1001;
    `;

    cursorElement.appendChild(labelElement);

    // Create Monaco content widget
    const widget = {
      getId: () => `cursor-${cursor.userId}`,
      getDomNode: () => cursorElement,
      getPosition: () => ({
        position: {
          lineNumber: cursor.line,
          column: cursor.column
        },
        preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
      })
    };

    editor.addContentWidget(widget);
    return widget;
  }, [editorRef]);

  // Update cursor decorations and widgets
  const updateCursorsAndSelections = useCallback(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const monaco = (window as any).monaco;
    
    if (!monaco) return;

    // Clear existing cursor widgets
    cursorWidgetsRef.current.forEach((widget, userId) => {
      editor.removeContentWidget(widget);
    });
    cursorWidgetsRef.current.clear();

    // Create new cursor widgets
    otherUsersCursors.forEach(cursor => {
      const widget = createCursorWidget(cursor);
      if (widget) {
        cursorWidgetsRef.current.set(cursor.userId, widget);
      }
    });

    // Create selection decorations
    const newDecorations = otherUsersSelections.map(selection => ({
      range: new monaco.Range(
        selection.startLine,
        selection.startColumn,
        selection.endLine,
        selection.endColumn
      ),
      options: {
        className: 'collaboration-selection',
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        inlineClassName: `collaboration-selection-inline`,
        style: `background-color: ${selection.color}33; border: 1px solid ${selection.color}66;`
      }
    }));

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [editorRef, otherUsersCursors, otherUsersSelections, createCursorWidget]);

  // Set up Monaco editor event listeners
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    
    // Add event listeners
    const cursorDisposable = editor.onDidChangeCursorPosition(handleCursorPositionChange);
    const selectionDisposable = editor.onDidChangeCursorSelection(handleSelectionChange);

    return () => {
      cursorDisposable?.dispose();
      selectionDisposable?.dispose();
    };
  }, [editorRef, handleCursorPositionChange, handleSelectionChange]);

  // Update cursors and selections when they change
  useEffect(() => {
    updateCursorsAndSelections();
  }, [updateCursorsAndSelections]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        // Clear decorations
        decorationsRef.current = editorRef.current.deltaDecorations(
          decorationsRef.current,
          []
        );

        // Remove cursor widgets
        cursorWidgetsRef.current.forEach((widget) => {
          editorRef.current.removeContentWidget(widget);
        });
        cursorWidgetsRef.current.clear();
      }
    };
  }, [editorRef]);

  // Add CSS styles for cursor animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes cursor-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }
      
      .collaboration-cursor {
        animation: cursor-blink 1s infinite;
      }
      
      .collaboration-selection {
        position: relative;
      }
      
      .collaboration-selection-inline {
        border-radius: 2px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // This component doesn't render anything visible - it manages Monaco editor decorations
  return null;
};

export default CursorManager;
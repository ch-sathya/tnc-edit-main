import { supabase } from '@/integrations/supabase/client';
import { 
  CollaborationFile, 
  EditorChange, 
  FileChange,
  CollaborationError 
} from '@/types/collaboration';
import { collaborationFileService } from './collaboration-file-service';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Interface for sync event callbacks
 */
export interface SyncEventCallbacks {
  onFileUpdated?: (file: CollaborationFile) => void;
  onFileCreated?: (file: CollaborationFile) => void;
  onFileDeleted?: (fileId: string) => void;
  onConflictDetected?: (fileId: string, conflicts: EditorChange[]) => void;
  onSyncError?: (error: CollaborationError) => void;
  onConnectionStatusChanged?: (connected: boolean) => void;
}

/**
 * Interface for queued changes during offline mode
 */
interface QueuedChange {
  id: string;
  fileId: string;
  change: EditorChange;
  timestamp: number;
  retryCount: number;
}

/**
 * Operational transformation utilities
 */
class OperationalTransform {
  /**
   * Transforms two concurrent operations
   */
  static transform(op1: EditorChange, op2: EditorChange): EditorChange[] {
    // Simple operational transformation for text operations
    // This is a basic implementation - in production, you'd want a more robust OT library
    
    const result: EditorChange[] = [];
    
    // If operations don't overlap, both can be applied as-is
    if (!this.operationsOverlap(op1, op2)) {
      result.push(op1, op2);
      return result;
    }
    
    // Handle overlapping operations
    if (op1.timestamp < op2.timestamp) {
      // op1 happened first, transform op2 based on op1
      const transformedOp2 = this.transformOperation(op2, op1);
      result.push(op1, transformedOp2);
    } else {
      // op2 happened first, transform op1 based on op2
      const transformedOp1 = this.transformOperation(op1, op2);
      result.push(op2, transformedOp1);
    }
    
    return result;
  }

  /**
   * Checks if two operations overlap
   */
  private static operationsOverlap(op1: EditorChange, op2: EditorChange): boolean {
    const op1Start = this.getAbsolutePosition(op1.range.startLineNumber, op1.range.startColumn);
    const op1End = this.getAbsolutePosition(op1.range.endLineNumber, op1.range.endColumn);
    const op2Start = this.getAbsolutePosition(op2.range.startLineNumber, op2.range.startColumn);
    const op2End = this.getAbsolutePosition(op2.range.endLineNumber, op2.range.endColumn);
    
    return !(op1End <= op2Start || op2End <= op1Start);
  }

  /**
   * Transforms an operation based on another operation that happened before it
   */
  private static transformOperation(op: EditorChange, baseOp: EditorChange): EditorChange {
    // Simple transformation: adjust positions based on the base operation
    const baseOpStart = this.getAbsolutePosition(baseOp.range.startLineNumber, baseOp.range.startColumn);
    const baseOpEnd = this.getAbsolutePosition(baseOp.range.endLineNumber, baseOp.range.endColumn);
    const opStart = this.getAbsolutePosition(op.range.startLineNumber, op.range.startColumn);
    
    let offset = 0;
    if (baseOp.text.length > baseOp.rangeLength) {
      // Insertion
      offset = baseOp.text.length - baseOp.rangeLength;
    } else if (baseOp.text.length < baseOp.rangeLength) {
      // Deletion
      offset = baseOp.text.length - baseOp.rangeLength;
    }
    
    // Adjust operation position if it comes after the base operation
    if (opStart >= baseOpEnd) {
      const newPosition = this.getLineColumnFromAbsolute(opStart + offset);
      return {
        ...op,
        range: {
          ...op.range,
          startLineNumber: newPosition.line,
          startColumn: newPosition.column,
        }
      };
    }
    
    return op;
  }

  /**
   * Converts line/column to absolute position (simplified)
   */
  private static getAbsolutePosition(line: number, column: number): number {
    // Simplified calculation - in reality, you'd need the actual document content
    return (line - 1) * 100 + column; // Assuming average line length of 100
  }

  /**
   * Converts absolute position back to line/column (simplified)
   */
  private static getLineColumnFromAbsolute(position: number): { line: number; column: number } {
    const line = Math.floor(position / 100) + 1;
    const column = position % 100;
    return { line, column };
  }

  /**
   * Applies an operation to text content
   */
  static applyOperation(content: string, operation: EditorChange): string {
    const lines = content.split('\n');
    const startLine = operation.range.startLineNumber - 1;
    const endLine = operation.range.endLineNumber - 1;
    const startCol = operation.range.startColumn - 1;
    const endCol = operation.range.endColumn - 1;

    if (startLine === endLine) {
      // Single line operation
      const line = lines[startLine];
      const before = line.substring(0, startCol);
      const after = line.substring(endCol);
      lines[startLine] = before + operation.text + after;
    } else {
      // Multi-line operation
      const firstLine = lines[startLine].substring(0, startCol);
      const lastLine = lines[endLine].substring(endCol);
      const newLines = operation.text.split('\n');
      
      // Replace the affected lines
      const replacement = [firstLine + newLines[0]];
      replacement.push(...newLines.slice(1, -1));
      replacement.push(newLines[newLines.length - 1] + lastLine);
      
      lines.splice(startLine, endLine - startLine + 1, ...replacement);
    }

    return lines.join('\n');
  }
}

/**
 * Service for real-time file synchronization with conflict resolution
 */
export class CollaborationSyncService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private callbacks: SyncEventCallbacks = {};
  private changeQueue: QueuedChange[] = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor() {
    this.setupConnectionMonitoring();
    this.loadQueuedChanges();
  }

  /**
   * Sets up connection monitoring
   */
  private setupConnectionMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.callbacks.onConnectionStatusChanged?.(true);
      this.processPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.callbacks.onConnectionStatusChanged?.(false);
    });

    // Monitor Supabase connection status
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        this.processPendingChanges();
      }
    });
  }

  /**
   * Subscribes to real-time updates for a group's files
   */
  async subscribeToGroup(groupId: string, callbacks: SyncEventCallbacks): Promise<void> {
    try {
      this.callbacks = { ...this.callbacks, ...callbacks };

      // Unsubscribe from existing channel if it exists
      await this.unsubscribeFromGroup(groupId);

      // Create new channel for the group
      const channel = supabase
        .channel(`collaboration_files_${groupId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'collaboration_files',
            filter: `group_id=eq.${groupId}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            this.handleFileChange(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'file_changes',
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            this.handleFileChangeEvent(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to collaboration updates for group ${groupId}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`Failed to subscribe to group ${groupId}`);
            this.callbacks.onSyncError?.({
              message: 'Failed to establish real-time connection',
              code: 'SUBSCRIPTION_ERROR',
            });
          }
        });

      this.channels.set(groupId, channel);
    } catch (error) {
      console.error('Error subscribing to group:', error);
      this.callbacks.onSyncError?.({
        message: error instanceof Error ? error.message : 'Unknown subscription error',
        code: 'SUBSCRIPTION_ERROR',
      });
    }
  }

  /**
   * Unsubscribes from real-time updates for a group
   */
  async unsubscribeFromGroup(groupId: string): Promise<void> {
    const channel = this.channels.get(groupId);
    if (channel) {
      await supabase.removeChannel(channel);
      this.channels.delete(groupId);
    }
  }

  /**
   * Handles file change events from real-time subscription
   */
  private handleFileChange(payload: RealtimePostgresChangesPayload<any>): void {
    try {
      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new) {
            const file = this.mapRowToCollaborationFile(payload.new);
            this.callbacks.onFileCreated?.(file);
          }
          break;
        case 'UPDATE':
          if (payload.new) {
            const file = this.mapRowToCollaborationFile(payload.new);
            this.callbacks.onFileUpdated?.(file);
          }
          break;
        case 'DELETE':
          if (payload.old) {
            this.callbacks.onFileDeleted?.(payload.old.id);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling file change:', error);
      this.callbacks.onSyncError?.({
        message: 'Error processing file change',
        code: 'CHANGE_PROCESSING_ERROR',
      });
    }
  }

  /**
   * Handles file change events for operational transformation
   */
  private async handleFileChangeEvent(payload: RealtimePostgresChangesPayload<any>): Promise<void> {
    try {
      if (payload.eventType === 'INSERT' && payload.new) {
        const change = payload.new;
        
        // Check if this change conflicts with any pending changes
        const conflicts = await this.detectConflicts(change.file_id, change);
        if (conflicts.length > 0) {
          this.callbacks.onConflictDetected?.(change.file_id, conflicts);
        }
      }
    } catch (error) {
      console.error('Error handling file change event:', error);
    }
  }

  /**
   * Queues a change for synchronization
   */
  async queueChange(fileId: string, change: EditorChange): Promise<void> {
    const queuedChange: QueuedChange = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileId,
      change,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.changeQueue.push(queuedChange);
    this.saveQueuedChanges();

    if (this.isOnline) {
      await this.processPendingChanges();
    }
  }

  /**
   * Processes pending changes in the queue
   */
  private async processPendingChanges(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.changeQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      const changesToProcess = [...this.changeQueue];
      this.changeQueue = [];

      for (const queuedChange of changesToProcess) {
        try {
          await this.applyQueuedChange(queuedChange);
        } catch (error) {
          console.error('Error applying queued change:', error);
          
          // Retry logic
          if (queuedChange.retryCount < this.MAX_RETRY_COUNT) {
            queuedChange.retryCount++;
            this.changeQueue.push(queuedChange);
            
            // Exponential backoff
            setTimeout(() => {
              this.processPendingChanges();
            }, this.RETRY_DELAY * Math.pow(2, queuedChange.retryCount));
          } else {
            // Max retries reached, report error
            this.callbacks.onSyncError?.({
              message: `Failed to sync change after ${this.MAX_RETRY_COUNT} retries`,
              code: 'SYNC_RETRY_EXCEEDED',
              details: queuedChange,
            });
          }
        }
      }

      this.saveQueuedChanges();
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Applies a queued change to the server
   */
  private async applyQueuedChange(queuedChange: QueuedChange): Promise<void> {
    // Get current file to check for conflicts
    const currentFile = await collaborationFileService.getFile(queuedChange.fileId);
    if (!currentFile) {
      throw new Error('File not found');
    }

    // Check for version conflicts
    if (currentFile.version !== queuedChange.change.version) {
      // Conflict detected, need to resolve
      const conflicts = await this.resolveConflicts(queuedChange.fileId, [queuedChange.change]);
      if (conflicts.length > 0) {
        this.callbacks.onConflictDetected?.(queuedChange.fileId, conflicts);
        return;
      }
    }

    // Apply the change
    const newContent = OperationalTransform.applyOperation(currentFile.content, queuedChange.change);
    await collaborationFileService.applyFileChanges(queuedChange.fileId, newContent);
  }

  /**
   * Detects conflicts between a new change and existing changes
   */
  private async detectConflicts(fileId: string, newChange: any): Promise<EditorChange[]> {
    try {
      const pendingChanges = await collaborationFileService.getPendingChanges(fileId);
      const conflicts: EditorChange[] = [];

      // Convert pending changes to EditorChange format for comparison
      for (const pendingChange of pendingChanges) {
        const editorChange = this.convertFileChangeToEditorChange(pendingChange);
        
        // Check if changes overlap
        if (this.changesOverlap(editorChange, newChange)) {
          conflicts.push(editorChange);
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return [];
    }
  }

  /**
   * Resolves conflicts using operational transformation
   */
  private async resolveConflicts(fileId: string, changes: EditorChange[]): Promise<EditorChange[]> {
    try {
      const pendingChanges = await collaborationFileService.getPendingChanges(fileId);
      const conflicts: EditorChange[] = [];

      for (const change of changes) {
        for (const pendingChange of pendingChanges) {
          const pendingEditorChange = this.convertFileChangeToEditorChange(pendingChange);
          
          if (this.changesOverlap(change, pendingEditorChange)) {
            // Apply operational transformation
            const transformedChanges = OperationalTransform.transform(change, pendingEditorChange);
            conflicts.push(...transformedChanges);
          }
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      return changes; // Return original changes if resolution fails
    }
  }

  /**
   * Checks if two changes overlap
   */
  private changesOverlap(change1: EditorChange, change2: any): boolean {
    // Simplified overlap detection
    const c1Start = (change1.range.startLineNumber - 1) * 1000 + change1.range.startColumn;
    const c1End = (change1.range.endLineNumber - 1) * 1000 + change1.range.endColumn;
    const c2Start = change2.position_start || 0;
    const c2End = change2.position_end || c2Start;

    return !(c1End <= c2Start || c2End <= c1Start);
  }

  /**
   * Converts FileChange to EditorChange format
   */
  private convertFileChangeToEditorChange(fileChange: FileChange): EditorChange {
    // Simplified conversion - in reality, you'd need more sophisticated position mapping
    const startLine = Math.floor(fileChange.positionStart / 1000) + 1;
    const startColumn = fileChange.positionStart % 1000;
    const endLine = fileChange.positionEnd ? Math.floor(fileChange.positionEnd / 1000) + 1 : startLine;
    const endColumn = fileChange.positionEnd ? fileChange.positionEnd % 1000 : startColumn;

    return {
      range: {
        startLineNumber: startLine,
        startColumn,
        endLineNumber: endLine,
        endColumn,
      },
      text: fileChange.content || '',
      rangeLength: (fileChange.positionEnd || fileChange.positionStart) - fileChange.positionStart,
      userId: fileChange.userId,
      timestamp: fileChange.timestamp.getTime(),
      version: fileChange.version,
    };
  }

  /**
   * Maps database row to CollaborationFile
   */
  private mapRowToCollaborationFile(row: any): CollaborationFile {
    return {
      id: row.id,
      groupId: row.group_id,
      name: row.name,
      path: row.path,
      content: row.content,
      language: row.language,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      version: row.version,
    };
  }

  /**
   * Saves queued changes to localStorage
   */
  private saveQueuedChanges(): void {
    try {
      localStorage.setItem('collaboration_queued_changes', JSON.stringify(this.changeQueue));
    } catch (error) {
      console.error('Error saving queued changes:', error);
    }
  }

  /**
   * Loads queued changes from localStorage
   */
  private loadQueuedChanges(): void {
    try {
      const saved = localStorage.getItem('collaboration_queued_changes');
      if (saved) {
        this.changeQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading queued changes:', error);
      this.changeQueue = [];
    }
  }

  /**
   * Clears all queued changes
   */
  clearQueue(): void {
    this.changeQueue = [];
    this.saveQueuedChanges();
  }

  /**
   * Gets the current queue status
   */
  getQueueStatus(): { pending: number; isOnline: boolean; syncInProgress: boolean } {
    return {
      pending: this.changeQueue.length,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
    };
  }

  /**
   * Manually triggers sync of pending changes
   */
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.processPendingChanges();
    }
  }

  /**
   * Cleanup method to unsubscribe from all channels
   */
  async cleanup(): Promise<void> {
    for (const [groupId] of this.channels) {
      await this.unsubscribeFromGroup(groupId);
    }
    this.callbacks = {};
  }
}

// Export singleton instance
export const collaborationSyncService = new CollaborationSyncService();
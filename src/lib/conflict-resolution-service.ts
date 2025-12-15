import { OperationalTransform, OperationConflict } from './operational-transform';
import { EditorChange } from '@/types/collaboration';
import { supabase } from '@/integrations/supabase/client';

// Define the row type manually since the table was just created
interface FileChangeRow {
  id: string;
  file_id: string;
  user_id: string;
  operation_type: string;
  position_start: number;
  position_end: number | null;
  content: string | null;
  version: number;
  timestamp: string;
  applied: boolean;
}

/**
 * Service for handling conflict resolution in collaborative editing
 */
export class ConflictResolutionService {
  private pendingChanges: Map<string, EditorChange[]> = new Map();
  private conflictQueue: OperationConflict[] = [];

  /**
   * Process an incoming editor change and resolve conflicts
   */
  async processChange(
    fileId: string,
    change: EditorChange,
    currentContent: string
  ): Promise<{
    resolvedChange: EditorChange;
    conflicts: OperationConflict[];
    finalContent: string;
  }> {
    // Get pending changes for this file
    const pending = this.pendingChanges.get(fileId) || [];
    
    // Check for conflicts with pending changes
    const conflicts: OperationConflict[] = [];
    let resolvedChange = change;
    
    for (const pendingChange of pending) {
      const transformResult = OperationalTransform.transform(resolvedChange, pendingChange);
      
      if (transformResult.conflicts.length > 0) {
        conflicts.push(...transformResult.conflicts);
        
        // Try to auto-resolve simple conflicts
        for (const conflict of transformResult.conflicts) {
          if (OperationalTransform.canAutoResolve(conflict)) {
            const autoResolved = OperationalTransform.autoResolve(conflict);
            resolvedChange = autoResolved.operation1Prime;
            
            // Update the pending change
            const pendingIndex = pending.indexOf(pendingChange);
            if (pendingIndex >= 0) {
              pending[pendingIndex] = autoResolved.operation2Prime;
            }
          } else {
            // Add to conflict queue for manual resolution
            this.conflictQueue.push(conflict);
          }
        }
      } else {
        // No conflicts, use transformed operations
        resolvedChange = transformResult.operation1Prime;
        
        // Update the pending change
        const pendingIndex = pending.indexOf(pendingChange);
        if (pendingIndex >= 0) {
          pending[pendingIndex] = transformResult.operation2Prime;
        }
      }
    }
    
    // Apply the resolved change to get final content
    const finalContent = OperationalTransform.apply(currentContent, resolvedChange);
    
    // Add this change to pending changes
    pending.push(resolvedChange);
    this.pendingChanges.set(fileId, pending);
    
    // Clean up old pending changes (keep only recent ones)
    this.cleanupPendingChanges(fileId);
    
    return {
      resolvedChange,
      conflicts,
      finalContent
    };
  }

  /**
   * Get pending conflicts that need manual resolution
   */
  getPendingConflicts(): OperationConflict[] {
    return [...this.conflictQueue];
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflictManually(
    conflict: OperationConflict,
    resolution: 'accept-local' | 'accept-remote' | 'merge',
    mergedContent?: string
  ): Promise<EditorChange> {
    // Remove from conflict queue
    const index = this.conflictQueue.indexOf(conflict);
    if (index >= 0) {
      this.conflictQueue.splice(index, 1);
    }
    
    switch (resolution) {
      case 'accept-local':
        return conflict.operation1;
      
      case 'accept-remote':
        return conflict.operation2;
      
      case 'merge':
        if (!mergedContent) {
          throw new Error('Merged content is required for merge resolution');
        }
        
        // Create a new change that represents the merged result
        return {
          range: {
            startLineNumber: Math.min(
              conflict.operation1.range.startLineNumber,
              conflict.operation2.range.startLineNumber
            ),
            startColumn: Math.min(
              conflict.operation1.range.startColumn,
              conflict.operation2.range.startColumn
            ),
            endLineNumber: Math.max(
              conflict.operation1.range.endLineNumber,
              conflict.operation2.range.endLineNumber
            ),
            endColumn: Math.max(
              conflict.operation1.range.endColumn,
              conflict.operation2.range.endColumn
            )
          },
          text: mergedContent,
          rangeLength: Math.max(conflict.operation1.rangeLength, conflict.operation2.rangeLength),
          userId: conflict.operation1.userId, // Use local user's ID
          timestamp: Date.now(),
          version: Math.max(conflict.operation1.version, conflict.operation2.version) + 1
        };
      
      default:
        throw new Error(`Unknown resolution type: ${resolution}`);
    }
  }

  /**
   * Apply operational transformation to synchronize with server state
   */
  async synchronizeWithServer(
    fileId: string,
    localChanges: EditorChange[],
    serverVersion: number
  ): Promise<{
    transformedChanges: EditorChange[];
    conflicts: OperationConflict[];
  }> {
    // Get server changes since our last sync
    const { data: serverChanges, error } = await supabase
      .from('file_changes' as any)
      .select('*')
      .eq('file_id', fileId)
      .gt('version', serverVersion)
      .order('timestamp', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to fetch server changes: ${error.message}`);
    }
    
    const transformedChanges: EditorChange[] = [];
    const conflicts: OperationConflict[] = [];
    
    // Transform each local change against server changes
    for (const localChange of localChanges) {
      let transformedChange = localChange;
      
      for (const serverChange of (serverChanges as unknown as FileChangeRow[] || [])) {
        const serverEditorChange: EditorChange = {
          range: {
            startLineNumber: 1, // Simplified - would need proper conversion
            startColumn: serverChange.position_start + 1,
            endLineNumber: 1,
            endColumn: (serverChange.position_end || serverChange.position_start) + 1
          },
          text: serverChange.content || '',
          rangeLength: (serverChange.position_end || serverChange.position_start) - serverChange.position_start,
          userId: serverChange.user_id,
          timestamp: new Date(serverChange.timestamp).getTime(),
          version: serverChange.version
        };
        
        const transformResult = OperationalTransform.transform(transformedChange, serverEditorChange);
        transformedChange = transformResult.operation1Prime;
        
        if (transformResult.conflicts.length > 0) {
          conflicts.push(...transformResult.conflicts);
        }
      }
      
      transformedChanges.push(transformedChange);
    }
    
    return {
      transformedChanges,
      conflicts
    };
  }

  /**
   * Clean up old pending changes to prevent memory leaks
   */
  private cleanupPendingChanges(fileId: string): void {
    const pending = this.pendingChanges.get(fileId);
    if (!pending) return;
    
    // Keep only the last 50 changes
    const maxChanges = 50;
    if (pending.length > maxChanges) {
      const recentChanges = pending.slice(-maxChanges);
      this.pendingChanges.set(fileId, recentChanges);
    }
    
    // Remove changes older than 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentChanges = pending.filter(change => change.timestamp > fiveMinutesAgo);
    this.pendingChanges.set(fileId, recentChanges);
  }

  /**
   * Clear all pending changes for a file
   */
  clearPendingChanges(fileId: string): void {
    this.pendingChanges.delete(fileId);
  }

  /**
   * Get statistics about pending changes and conflicts
   */
  getStats(): {
    pendingChangesCount: number;
    conflictsCount: number;
    filesWithPendingChanges: string[];
  } {
    const filesWithPendingChanges = Array.from(this.pendingChanges.keys());
    const pendingChangesCount = Array.from(this.pendingChanges.values())
      .reduce((total, changes) => total + changes.length, 0);
    
    return {
      pendingChangesCount,
      conflictsCount: this.conflictQueue.length,
      filesWithPendingChanges
    };
  }

  /**
   * Process all pending conflicts automatically where possible
   */
  async processAutoResolvableConflicts(): Promise<{
    resolved: number;
    remaining: number;
  }> {
    let resolved = 0;
    const remaining: OperationConflict[] = [];
    
    for (const conflict of this.conflictQueue) {
      if (OperationalTransform.canAutoResolve(conflict)) {
        try {
          await this.resolveConflictManually(conflict, 'accept-local');
          resolved++;
        } catch (error) {
          console.error('Failed to auto-resolve conflict:', error);
          remaining.push(conflict);
        }
      } else {
        remaining.push(conflict);
      }
    }
    
    this.conflictQueue = remaining;
    
    return {
      resolved,
      remaining: remaining.length
    };
  }
}

// Export a singleton instance
export const conflictResolutionService = new ConflictResolutionService();

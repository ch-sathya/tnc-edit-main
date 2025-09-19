/**
 * Example usage of the CollaborationFileService and CollaborationSyncService
 * This demonstrates how to integrate file management with real-time synchronization
 */

import { collaborationFileService } from './collaboration-file-service';
import { collaborationSyncService } from './collaboration-sync-service';
import { CollaborationFile, EditorChange } from '@/types/collaboration';

/**
 * Example class showing how to use the collaboration services together
 */
export class CollaborationExample {
  private currentGroupId: string | null = null;
  private currentFile: CollaborationFile | null = null;

  /**
   * Initialize collaboration for a group
   */
  async initializeCollaboration(groupId: string): Promise<void> {
    this.currentGroupId = groupId;

    // Subscribe to real-time updates for the group
    await collaborationSyncService.subscribeToGroup(groupId, {
      onFileUpdated: (file) => {
        console.log('File updated:', file.name);
        if (this.currentFile && this.currentFile.id === file.id) {
          this.currentFile = file;
          this.onCurrentFileUpdated(file);
        }
      },
      onFileCreated: (file) => {
        console.log('New file created:', file.name);
        this.onFileCreated(file);
      },
      onFileDeleted: (fileId) => {
        console.log('File deleted:', fileId);
        if (this.currentFile && this.currentFile.id === fileId) {
          this.currentFile = null;
          this.onCurrentFileDeleted();
        }
      },
      onConflictDetected: (fileId, conflicts) => {
        console.log('Conflicts detected for file:', fileId, conflicts);
        this.onConflictsDetected(fileId, conflicts);
      },
      onSyncError: (error) => {
        console.error('Sync error:', error);
        this.onSyncError(error);
      },
      onConnectionStatusChanged: (connected) => {
        console.log('Connection status changed:', connected ? 'online' : 'offline');
        this.onConnectionStatusChanged(connected);
      },
    });
  }

  /**
   * Create a new file in the current group
   */
  async createFile(name: string, path: string, content: string = ''): Promise<CollaborationFile> {
    if (!this.currentGroupId) {
      throw new Error('No group selected');
    }

    const file = await collaborationFileService.createFile({
      name,
      path,
      content,
      language: 'plaintext', // Will be auto-detected
      groupId: this.currentGroupId,
    });

    console.log('Created file:', file.name, 'with language:', file.language);
    return file;
  }

  /**
   * Load and switch to a file
   */
  async loadFile(fileId: string): Promise<CollaborationFile | null> {
    const file = await collaborationFileService.getFile(fileId);
    if (file) {
      this.currentFile = file;
      console.log('Loaded file:', file.name, 'version:', file.version);
    }
    return file;
  }

  /**
   * Get all files in the current group
   */
  async getGroupFiles(): Promise<CollaborationFile[]> {
    if (!this.currentGroupId) {
      throw new Error('No group selected');
    }

    const files = await collaborationFileService.getFilesByGroup(this.currentGroupId);
    console.log('Found', files.length, 'files in group');
    return files;
  }

  /**
   * Apply a text change to the current file
   */
  async applyTextChange(change: EditorChange): Promise<void> {
    if (!this.currentFile) {
      throw new Error('No file selected');
    }

    // Queue the change for synchronization
    await collaborationSyncService.queueChange(this.currentFile.id, change);
    
    console.log('Queued change for file:', this.currentFile.name);
  }

  /**
   * Update file content directly (for larger changes)
   */
  async updateFileContent(content: string): Promise<CollaborationFile> {
    if (!this.currentFile) {
      throw new Error('No file selected');
    }

    const updatedFile = await collaborationFileService.updateFile(this.currentFile.id, {
      content,
      version: this.currentFile.version,
    });

    this.currentFile = updatedFile;
    console.log('Updated file content, new version:', updatedFile.version);
    return updatedFile;
  }

  /**
   * Rename the current file
   */
  async renameCurrentFile(newName: string, newPath: string): Promise<CollaborationFile> {
    if (!this.currentFile) {
      throw new Error('No file selected');
    }

    const renamedFile = await collaborationFileService.renameFile(
      this.currentFile.id,
      newName,
      newPath
    );

    this.currentFile = renamedFile;
    console.log('Renamed file to:', newName, 'with language:', renamedFile.language);
    return renamedFile;
  }

  /**
   * Delete the current file
   */
  async deleteCurrentFile(): Promise<void> {
    if (!this.currentFile) {
      throw new Error('No file selected');
    }

    await collaborationFileService.deleteFile(this.currentFile.id);
    console.log('Deleted file:', this.currentFile.name);
    this.currentFile = null;
  }

  /**
   * Get group file statistics
   */
  async getGroupStats(): Promise<any> {
    if (!this.currentGroupId) {
      throw new Error('No group selected');
    }

    const stats = await collaborationFileService.getGroupFileStats(this.currentGroupId);
    console.log('Group stats:', stats);
    return stats;
  }

  /**
   * Get sync queue status
   */
  getSyncStatus(): any {
    const status = collaborationSyncService.getQueueStatus();
    console.log('Sync status:', status);
    return status;
  }

  /**
   * Force sync pending changes
   */
  async forcSync(): Promise<void> {
    await collaborationSyncService.forcSync();
    console.log('Forced sync completed');
  }

  /**
   * Cleanup collaboration resources
   */
  async cleanup(): Promise<void> {
    if (this.currentGroupId) {
      await collaborationSyncService.unsubscribeFromGroup(this.currentGroupId);
    }
    await collaborationSyncService.cleanup();
    this.currentGroupId = null;
    this.currentFile = null;
    console.log('Collaboration cleanup completed');
  }

  // Event handlers (to be overridden by implementing classes)
  protected onCurrentFileUpdated(file: CollaborationFile): void {
    // Override in subclass to handle file updates
  }

  protected onFileCreated(file: CollaborationFile): void {
    // Override in subclass to handle new files
  }

  protected onCurrentFileDeleted(): void {
    // Override in subclass to handle file deletion
  }

  protected onConflictsDetected(fileId: string, conflicts: EditorChange[]): void {
    // Override in subclass to handle conflicts
  }

  protected onSyncError(error: any): void {
    // Override in subclass to handle sync errors
  }

  protected onConnectionStatusChanged(connected: boolean): void {
    // Override in subclass to handle connection changes
  }

  // Getters
  get currentFileInfo(): CollaborationFile | null {
    return this.currentFile;
  }

  get currentGroup(): string | null {
    return this.currentGroupId;
  }
}

/**
 * Example usage function
 */
export async function exampleUsage(): Promise<void> {
  const collaboration = new CollaborationExample();

  try {
    // Initialize collaboration for a group
    await collaboration.initializeCollaboration('550e8400-e29b-41d4-a716-446655440000');

    // Create a new JavaScript file
    const jsFile = await collaboration.createFile(
      'example.js',
      '/src/example.js',
      'console.log("Hello, World!");'
    );

    // Load the file
    await collaboration.loadFile(jsFile.id);

    // Simulate a text change
    const change: EditorChange = {
      range: {
        startLineNumber: 1,
        startColumn: 13,
        endLineNumber: 1,
        endColumn: 26,
      },
      text: 'Collaborative World',
      rangeLength: 13,
      userId: 'current-user-id',
      timestamp: Date.now(),
      version: jsFile.version,
    };

    await collaboration.applyTextChange(change);

    // Get group statistics
    await collaboration.getGroupStats();

    // Check sync status
    collaboration.getSyncStatus();

    // Cleanup
    await collaboration.cleanup();
  } catch (error) {
    console.error('Example error:', error);
    await collaboration.cleanup();
  }
}

// Export the example for use in other parts of the application
export default CollaborationExample;
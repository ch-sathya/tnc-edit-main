import { EditorChange } from '@/types/collaboration';

/**
 * Operation types for operational transformation
 */
export interface Operation {
  type: 'retain' | 'insert' | 'delete';
  length?: number;
  text?: string;
  attributes?: Record<string, any>;
}

/**
 * Represents a conflict between two operations
 */
export interface OperationConflict {
  operation1: EditorChange;
  operation2: EditorChange;
  conflictType: 'overlap' | 'adjacent' | 'nested';
  resolution: 'manual' | 'automatic';
}

/**
 * Result of transforming two operations
 */
export interface TransformResult {
  operation1Prime: EditorChange;
  operation2Prime: EditorChange;
  conflicts: OperationConflict[];
}

/**
 * OperationalTransform utility class for handling concurrent text operations
 * Implements operational transformation algorithms for conflict resolution
 */
export class OperationalTransform {
  /**
   * Transform two concurrent operations against each other
   * This is the core of operational transformation
   */
  static transform(op1: EditorChange, op2: EditorChange): TransformResult {
    const conflicts: OperationConflict[] = [];
    
    // Convert EditorChange to normalized operations
    const ops1 = this.editorChangeToOperations(op1);
    const ops2 = this.editorChangeToOperations(op2);
    
    // Detect conflicts
    const conflict = this.detectConflict(op1, op2);
    if (conflict) {
      conflicts.push(conflict);
    }
    
    // Transform operations based on their relationship
    const { op1Prime, op2Prime } = this.transformOperations(op1, op2);
    
    return {
      operation1Prime: op1Prime,
      operation2Prime: op2Prime,
      conflicts
    };
  }

  /**
   * Transform operation1 against operation2
   * Returns the transformed version of operation1
   */
  private static transformOperations(op1: EditorChange, op2: EditorChange): {
    op1Prime: EditorChange;
    op2Prime: EditorChange;
  } {
    const op1Start = this.getAbsolutePosition(op1.range.startLineNumber, op1.range.startColumn);
    const op1End = this.getAbsolutePosition(op1.range.endLineNumber, op1.range.endColumn);
    const op2Start = this.getAbsolutePosition(op2.range.startLineNumber, op2.range.startColumn);
    const op2End = this.getAbsolutePosition(op2.range.endLineNumber, op2.range.endColumn);
    
    let op1Prime = { ...op1 };
    let op2Prime = { ...op2 };
    
    // Case 1: op2 is completely before op1
    if (op2End <= op1Start) {
      const offset = this.calculateOffset(op2);
      op1Prime = this.offsetOperation(op1, offset);
    }
    // Case 2: op1 is completely before op2
    else if (op1End <= op2Start) {
      const offset = this.calculateOffset(op1);
      op2Prime = this.offsetOperation(op2, offset);
    }
    // Case 3: Operations overlap - need conflict resolution
    else {
      const resolved = this.resolveOverlappingOperations(op1, op2);
      op1Prime = resolved.op1;
      op2Prime = resolved.op2;
    }
    
    return { op1Prime, op2Prime };
  }

  /**
   * Detect conflicts between two operations
   */
  private static detectConflict(op1: EditorChange, op2: EditorChange): OperationConflict | null {
    const op1Start = this.getAbsolutePosition(op1.range.startLineNumber, op1.range.startColumn);
    const op1End = this.getAbsolutePosition(op1.range.endLineNumber, op1.range.endColumn);
    const op2Start = this.getAbsolutePosition(op2.range.startLineNumber, op2.range.startColumn);
    const op2End = this.getAbsolutePosition(op2.range.endLineNumber, op2.range.endColumn);
    
    // Check for overlap or adjacency
    const hasOverlap = !(op1End <= op2Start || op2End <= op1Start);
    const isAdjacent = Math.abs(op1End - op2Start) <= 1 || Math.abs(op2End - op1Start) <= 1;
    
    if (hasOverlap || isAdjacent) {
      let conflictType: 'overlap' | 'adjacent' | 'nested';
      
      // Determine conflict type
      if (isAdjacent && !hasOverlap) {
        conflictType = 'adjacent';
      } else if (op1Start === op2Start && op1End === op2End) {
        // Identical ranges are overlaps, not nested
        conflictType = 'overlap';
      } else if ((op1Start < op2Start && op1End > op2End) || (op2Start < op1Start && op2End > op1End)) {
        conflictType = 'nested';
      } else {
        conflictType = 'overlap';
      }
      
      // Simple conflicts can be resolved automatically
      const resolution = conflictType === 'adjacent' ? 'automatic' : 'manual';
      
      return {
        operation1: op1,
        operation2: op2,
        conflictType,
        resolution
      };
    }
    
    return null;
  }

  /**
   * Resolve overlapping operations using operational transformation rules
   */
  private static resolveOverlappingOperations(op1: EditorChange, op2: EditorChange): {
    op1: EditorChange;
    op2: EditorChange;
  } {
    const op1Start = this.getAbsolutePosition(op1.range.startLineNumber, op1.range.startColumn);
    const op1End = this.getAbsolutePosition(op1.range.endLineNumber, op1.range.endColumn);
    const op2Start = this.getAbsolutePosition(op2.range.startLineNumber, op2.range.startColumn);
    const op2End = this.getAbsolutePosition(op2.range.endLineNumber, op2.range.endColumn);
    
    // For overlapping operations, we need to split and transform them
    // This is a simplified approach - in practice, this would be more complex
    
    let transformedOp1 = { ...op1 };
    let transformedOp2 = { ...op2 };
    
    // If op1 starts before op2, adjust op2's start position
    if (op1Start < op2Start) {
      const insertLength = op1.text.length;
      const deleteLength = op1.rangeLength;
      const offset = insertLength - deleteLength;
      
      transformedOp2 = this.offsetOperation(op2, offset);
    }
    // If op2 starts before op1, adjust op1's start position
    else if (op2Start < op1Start) {
      const insertLength = op2.text.length;
      const deleteLength = op2.rangeLength;
      const offset = insertLength - deleteLength;
      
      transformedOp1 = this.offsetOperation(op1, offset);
    }
    
    return {
      op1: transformedOp1,
      op2: transformedOp2
    };
  }

  /**
   * Compose multiple operations into a single operation
   */
  static compose(changes: EditorChange[]): EditorChange {
    if (changes.length === 0) {
      throw new Error('Cannot compose empty array of changes');
    }
    
    if (changes.length === 1) {
      return changes[0];
    }
    
    // Sort changes by position to ensure correct composition
    const sortedChanges = [...changes].sort((a, b) => {
      const posA = this.getAbsolutePosition(a.range.startLineNumber, a.range.startColumn);
      const posB = this.getAbsolutePosition(b.range.startLineNumber, b.range.startColumn);
      return posA - posB;
    });
    
    let composed = sortedChanges[0];
    
    for (let i = 1; i < sortedChanges.length; i++) {
      composed = this.composeTwo(composed, sortedChanges[i]);
    }
    
    return composed;
  }

  /**
   * Compose two operations into one
   */
  private static composeTwo(op1: EditorChange, op2: EditorChange): EditorChange {
    // This is a simplified composition - in practice, this would handle
    // more complex cases like overlapping ranges, etc.
    
    const op1Start = this.getAbsolutePosition(op1.range.startLineNumber, op1.range.startColumn);
    const op1End = this.getAbsolutePosition(op1.range.endLineNumber, op1.range.endColumn);
    const op2Start = this.getAbsolutePosition(op2.range.startLineNumber, op2.range.startColumn);
    
    // If operations are adjacent, merge them
    if (Math.abs(op2Start - op1End) <= 1) {
      const combinedText = op1.text + op2.text;
      const combinedRangeLength = op1.rangeLength + op2.rangeLength;
      
      return {
        ...op1,
        text: combinedText,
        rangeLength: combinedRangeLength,
        range: {
          startLineNumber: Math.min(op1.range.startLineNumber, op2.range.startLineNumber),
          startColumn: Math.min(op1.range.startColumn, op2.range.startColumn),
          endLineNumber: Math.max(op1.range.endLineNumber, op2.range.endLineNumber),
          endColumn: Math.max(op1.range.endColumn, op2.range.endColumn)
        },
        timestamp: Math.max(op1.timestamp, op2.timestamp),
        version: Math.max(op1.version, op2.version)
      };
    }
    
    // If operations are separate, create a composite operation that includes both
    // For simplicity, we'll return a combined text operation
    return {
      range: {
        startLineNumber: Math.min(op1.range.startLineNumber, op2.range.startLineNumber),
        startColumn: Math.min(op1.range.startColumn, op2.range.startColumn),
        endLineNumber: Math.max(op1.range.endLineNumber, op2.range.endLineNumber),
        endColumn: Math.max(op1.range.endColumn, op2.range.endColumn)
      },
      text: op1.text + op2.text,
      rangeLength: op1.rangeLength + op2.rangeLength,
      userId: op1.userId, // Use first user's ID
      timestamp: Math.max(op1.timestamp, op2.timestamp),
      version: Math.max(op1.version, op2.version)
    };
  }

  /**
   * Invert an operation (create the opposite operation)
   */
  static invert(change: EditorChange, originalContent: string): EditorChange {
    // Get the text that was replaced by this change
    const lines = originalContent.split('\n');
    const startLine = change.range.startLineNumber - 1;
    const endLine = change.range.endLineNumber - 1;
    const startCol = change.range.startColumn - 1;
    const endCol = change.range.endColumn - 1;
    
    let originalText = '';
    
    if (startLine === endLine) {
      // Single line change
      originalText = lines[startLine]?.substring(startCol, endCol) || '';
    } else {
      // Multi-line change
      for (let i = startLine; i <= endLine; i++) {
        if (i === startLine) {
          originalText += lines[i]?.substring(startCol) || '';
        } else if (i === endLine) {
          originalText += '\n' + (lines[i]?.substring(0, endCol) || '');
        } else {
          originalText += '\n' + (lines[i] || '');
        }
      }
    }
    
    // Create the inverse operation
    return {
      range: change.range,
      text: originalText,
      rangeLength: change.text.length,
      userId: change.userId,
      timestamp: Date.now(),
      version: change.version + 1
    };
  }

  /**
   * Apply an operation to text content
   */
  static apply(content: string, change: EditorChange): string {
    const lines = content.split('\n');
    const startLine = change.range.startLineNumber - 1;
    const endLine = change.range.endLineNumber - 1;
    const startCol = change.range.startColumn - 1;
    const endCol = change.range.endColumn - 1;
    
    // Handle single line changes
    if (startLine === endLine) {
      const line = lines[startLine] || '';
      const before = line.substring(0, startCol);
      const after = line.substring(endCol);
      lines[startLine] = before + change.text + after;
    } else {
      // Handle multi-line changes
      const firstLine = lines[startLine] || '';
      const lastLine = lines[endLine] || '';
      const before = firstLine.substring(0, startCol);
      const after = lastLine.substring(endCol);
      
      const newText = change.text;
      const newLines = newText.split('\n');
      
      // Replace the affected lines
      const replacement = [before + newLines[0]];
      for (let i = 1; i < newLines.length - 1; i++) {
        replacement.push(newLines[i]);
      }
      if (newLines.length > 1) {
        replacement.push(newLines[newLines.length - 1] + after);
      } else {
        replacement[0] += after;
      }
      
      lines.splice(startLine, endLine - startLine + 1, ...replacement);
    }
    
    return lines.join('\n');
  }

  /**
   * Convert EditorChange to a sequence of operations
   */
  private static editorChangeToOperations(change: EditorChange): Operation[] {
    const operations: Operation[] = [];
    
    // Add retain operation for content before the change
    const startPos = this.getAbsolutePosition(change.range.startLineNumber, change.range.startColumn);
    if (startPos > 0) {
      operations.push({ type: 'retain', length: startPos });
    }
    
    // Add delete operation if there's content to delete
    if (change.rangeLength > 0) {
      operations.push({ type: 'delete', length: change.rangeLength });
    }
    
    // Add insert operation if there's content to insert
    if (change.text.length > 0) {
      operations.push({ type: 'insert', text: change.text });
    }
    
    return operations;
  }

  /**
   * Calculate the offset caused by an operation
   */
  private static calculateOffset(change: EditorChange): number {
    return change.text.length - change.rangeLength;
  }

  /**
   * Offset an operation by a given amount
   */
  private static offsetOperation(change: EditorChange, offset: number): EditorChange {
    if (offset === 0) return change;
    
    const { line: startLine, column: startCol } = this.getLineColumnFromAbsolute(
      this.getAbsolutePosition(change.range.startLineNumber, change.range.startColumn) + offset
    );
    
    const { line: endLine, column: endCol } = this.getLineColumnFromAbsolute(
      this.getAbsolutePosition(change.range.endLineNumber, change.range.endColumn) + offset
    );
    
    return {
      ...change,
      range: {
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: endLine,
        endColumn: endCol
      }
    };
  }

  /**
   * Convert line/column position to absolute position
   * This is a simplified version - in practice, you'd need the actual document
   */
  private static getAbsolutePosition(line: number, column: number): number {
    // Simplified calculation assuming average line length of 80 characters
    // In practice, this would need the actual document content
    return (line - 1) * 80 + (column - 1);
  }

  /**
   * Convert absolute position back to line/column
   */
  private static getLineColumnFromAbsolute(position: number): { line: number; column: number } {
    // Simplified calculation - in practice, this would need the actual document
    const line = Math.floor(position / 80) + 1;
    const column = (position % 80) + 1;
    return { line, column };
  }

  /**
   * Check if two operations can be automatically resolved
   */
  static canAutoResolve(conflict: OperationConflict): boolean {
    return conflict.resolution === 'automatic' || conflict.conflictType === 'adjacent';
  }

  /**
   * Automatically resolve simple conflicts
   */
  static autoResolve(conflict: OperationConflict): TransformResult {
    if (!this.canAutoResolve(conflict)) {
      throw new Error('Conflict cannot be automatically resolved');
    }
    
    // For adjacent conflicts, simply apply both operations in order
    if (conflict.conflictType === 'adjacent') {
      const op1Start = this.getAbsolutePosition(
        conflict.operation1.range.startLineNumber,
        conflict.operation1.range.startColumn
      );
      const op2Start = this.getAbsolutePosition(
        conflict.operation2.range.startLineNumber,
        conflict.operation2.range.startColumn
      );
      
      if (op1Start <= op2Start) {
        // op1 comes first, adjust op2
        const offset = this.calculateOffset(conflict.operation1);
        return {
          operation1Prime: conflict.operation1,
          operation2Prime: this.offsetOperation(conflict.operation2, offset),
          conflicts: []
        };
      } else {
        // op2 comes first, adjust op1
        const offset = this.calculateOffset(conflict.operation2);
        return {
          operation1Prime: this.offsetOperation(conflict.operation1, offset),
          operation2Prime: conflict.operation2,
          conflicts: []
        };
      }
    }
    
    // For other auto-resolvable conflicts, use the transform method
    return this.transform(conflict.operation1, conflict.operation2);
  }
}
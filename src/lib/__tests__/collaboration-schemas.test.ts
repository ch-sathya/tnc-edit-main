import { describe, it, expect } from 'vitest';
import {
  validateCollaborationFile,
  validateCollaborationUser,
  validateEditorChange,
  validateCreateFileRequest,
  validateUpdateFileRequest,
  safeValidateCollaborationFile,
  safeValidateCollaborationUser,
} from '../collaboration-schemas';

describe('Collaboration Schemas', () => {
  describe('validateCollaborationFile', () => {
    it('should validate a valid collaboration file', () => {
      const validFile = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        groupId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'test.js',
        path: '/src/test.js',
        content: 'console.log("hello");',
        language: 'javascript',
        createdBy: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      expect(() => validateCollaborationFile(validFile)).not.toThrow();
    });

    it('should throw for invalid file name', () => {
      const invalidFile = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        groupId: '123e4567-e89b-12d3-a456-426614174001',
        name: '', // Invalid: empty name
        path: '/src/test.js',
        content: 'console.log("hello");',
        language: 'javascript',
        createdBy: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      expect(() => validateCollaborationFile(invalidFile)).toThrow();
    });
  });

  describe('validateCollaborationUser', () => {
    it('should validate a valid collaboration user', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
        status: 'online' as const,
        lastActivity: new Date(),
        cursorColor: '#FF6B6B',
      };

      expect(() => validateCollaborationUser(validUser)).not.toThrow();
    });

    it('should throw for invalid cursor color', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        status: 'online' as const,
        lastActivity: new Date(),
        cursorColor: 'invalid-color', // Invalid color format
      };

      expect(() => validateCollaborationUser(invalidUser)).toThrow();
    });
  });

  describe('validateEditorChange', () => {
    it('should validate a valid editor change', () => {
      const validChange = {
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 5,
        },
        text: 'test',
        rangeLength: 4,
        userId: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: Date.now(),
        version: 1,
      };

      expect(() => validateEditorChange(validChange)).not.toThrow();
    });
  });

  describe('validateCreateFileRequest', () => {
    it('should validate a valid create file request', () => {
      const validRequest = {
        name: 'test.js',
        path: '/src/test.js',
        content: 'console.log("hello");',
        language: 'javascript',
        groupId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => validateCreateFileRequest(validRequest)).not.toThrow();
    });

    it('should use default empty content when not provided', () => {
      const request = {
        name: 'test.js',
        path: '/src/test.js',
        language: 'javascript',
        groupId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateCreateFileRequest(request);
      expect(result.content).toBe('');
    });
  });

  describe('validateUpdateFileRequest', () => {
    it('should validate a valid update file request', () => {
      const validRequest = {
        content: 'console.log("updated");',
        language: 'javascript',
        version: 2,
      };

      expect(() => validateUpdateFileRequest(validRequest)).not.toThrow();
    });
  });

  describe('safe validation functions', () => {
    it('should return success result for valid data', () => {
      const validFile = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        groupId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'test.js',
        path: '/src/test.js',
        content: 'console.log("hello");',
        language: 'javascript',
        createdBy: '123e4567-e89b-12d3-a456-426614174002',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const result = safeValidateCollaborationFile(validFile);
      expect(result.success).toBe(true);
    });

    it('should return error result for invalid data', () => {
      const invalidFile = {
        id: 'invalid-uuid',
        name: '',
      };

      const result = safeValidateCollaborationFile(invalidFile);
      expect(result.success).toBe(false);
    });
  });
});
import { describe, it, expect } from 'vitest';
import { CollaborationClient, collaborationUtils } from '../collaboration-client';

describe('CollaborationClient', () => {
  describe('detectLanguageFromPath', () => {
    it('should detect JavaScript from .js extension', () => {
      expect(CollaborationClient.detectLanguageFromPath('test.js')).toBe('javascript');
      expect(CollaborationClient.detectLanguageFromPath('/src/components/test.jsx')).toBe('javascript');
    });

    it('should detect TypeScript from .ts extension', () => {
      expect(CollaborationClient.detectLanguageFromPath('test.ts')).toBe('typescript');
      expect(CollaborationClient.detectLanguageFromPath('/src/components/test.tsx')).toBe('typescript');
    });

    it('should detect Python from .py extension', () => {
      expect(CollaborationClient.detectLanguageFromPath('script.py')).toBe('python');
    });

    it('should return plaintext for unknown extensions', () => {
      expect(CollaborationClient.detectLanguageFromPath('unknown.xyz')).toBe('plaintext');
      expect(CollaborationClient.detectLanguageFromPath('no-extension')).toBe('plaintext');
    });
  });

  describe('generateCursorColor', () => {
    it('should generate consistent colors for the same user ID', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const color1 = CollaborationClient.generateCursorColor(userId);
      const color2 = CollaborationClient.generateCursorColor(userId);
      
      expect(color1).toBe(color2);
    });

    it('should generate different colors for different user IDs', () => {
      const userId1 = '123e4567-e89b-12d3-a456-426614174000';
      const userId2 = '123e4567-e89b-12d3-a456-426614174001';
      
      const color1 = CollaborationClient.generateCursorColor(userId1);
      const color2 = CollaborationClient.generateCursorColor(userId2);
      
      expect(color1).not.toBe(color2);
    });

    it('should generate valid hex colors', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const color = CollaborationClient.generateCursorColor(userId);
      
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('collaborationUtils', () => {
  describe('isValidFileName', () => {
    it('should accept valid file names', () => {
      expect(collaborationUtils.isValidFileName('test.js')).toBe(true);
      expect(collaborationUtils.isValidFileName('my-file.txt')).toBe(true);
      expect(collaborationUtils.isValidFileName('file_name.py')).toBe(true);
    });

    it('should reject invalid file names', () => {
      expect(collaborationUtils.isValidFileName('')).toBe(false);
      expect(collaborationUtils.isValidFileName('file<name.txt')).toBe(false);
      expect(collaborationUtils.isValidFileName('file>name.txt')).toBe(false);
      expect(collaborationUtils.isValidFileName('file:name.txt')).toBe(false);
      expect(collaborationUtils.isValidFileName('file"name.txt')).toBe(false);
      expect(collaborationUtils.isValidFileName('file/name.txt')).toBe(false);
      expect(collaborationUtils.isValidFileName('file\\name.txt')).toBe(false);
      expect(collaborationUtils.isValidFileName('file|name.txt')).toBe(false);
      expect(collaborationUtils.isValidFileName('file?name.txt')).toBe(false);
      expect(collaborationUtils.isValidFileName('file*name.txt')).toBe(false);
    });

    it('should reject names that are too long', () => {
      const longName = 'a'.repeat(256);
      expect(collaborationUtils.isValidFileName(longName)).toBe(false);
    });
  });

  describe('isValidFilePath', () => {
    it('should accept valid file paths', () => {
      expect(collaborationUtils.isValidFilePath('/src/test.js')).toBe(true);
      expect(collaborationUtils.isValidFilePath('relative/path/file.txt')).toBe(true);
      expect(collaborationUtils.isValidFilePath('file.js')).toBe(true);
    });

    it('should reject invalid file paths', () => {
      expect(collaborationUtils.isValidFilePath('')).toBe(false);
      expect(collaborationUtils.isValidFilePath('../../../etc/passwd')).toBe(false);
      expect(collaborationUtils.isValidFilePath('path/../file.txt')).toBe(false);
    });

    it('should reject paths that are too long', () => {
      const longPath = 'a'.repeat(501);
      expect(collaborationUtils.isValidFilePath(longPath)).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extensions correctly', () => {
      expect(collaborationUtils.getFileExtension('test.js')).toBe('js');
      expect(collaborationUtils.getFileExtension('/path/to/file.tsx')).toBe('tsx');
      expect(collaborationUtils.getFileExtension('file.tar.gz')).toBe('gz');
    });

    it('should return empty string for files without extension', () => {
      expect(collaborationUtils.getFileExtension('README')).toBe('');
      expect(collaborationUtils.getFileExtension('/path/to/file')).toBe('');
    });
  });

  describe('getFileName', () => {
    it('should extract file names from paths', () => {
      expect(collaborationUtils.getFileName('/path/to/file.js')).toBe('file.js');
      expect(collaborationUtils.getFileName('file.js')).toBe('file.js');
      expect(collaborationUtils.getFileName('/single/file.txt')).toBe('file.txt');
    });
  });

  describe('getDirectory', () => {
    it('should extract directory from paths', () => {
      expect(collaborationUtils.getDirectory('/path/to/file.js')).toBe('/path/to');
      expect(collaborationUtils.getDirectory('relative/path/file.js')).toBe('relative/path');
      expect(collaborationUtils.getDirectory('file.js')).toBe('/');
    });
  });
});
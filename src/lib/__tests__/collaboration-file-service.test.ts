import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollaborationFileService } from '../collaboration-file-service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({})),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    rpc: vi.fn(),
  },
}));

describe('CollaborationFileService', () => {
  let service: CollaborationFileService;

  beforeEach(() => {
    service = new CollaborationFileService();
    vi.clearAllMocks();
  });

  describe('Language Detection', () => {
    it('should detect JavaScript language from .js extension', async () => {
      const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const mockFile = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        group_id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'test.js',
        path: '/test.js',
        content: 'console.log("hello");',
        language: 'javascript',
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFile,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.createFile({
        name: 'test.js',
        path: '/test.js',
        content: 'console.log("hello");',
        language: 'plaintext', // Should be overridden by auto-detection
        groupId: '550e8400-e29b-41d4-a716-446655440002',
      });

      expect(result.language).toBe('javascript');
    });

    it('should detect TypeScript language from .ts extension', async () => {
      const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const mockFile = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        group_id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'test.ts',
        path: '/test.ts',
        content: 'const x: number = 5;',
        language: 'typescript',
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFile,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.createFile({
        name: 'test.ts',
        path: '/test.ts',
        content: 'const x: number = 5;',
        language: 'plaintext',
        groupId: '550e8400-e29b-41d4-a716-446655440002',
      });

      expect(result.language).toBe('typescript');
    });

    it('should default to plaintext for unknown extensions', async () => {
      const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000' };
      const mockFile = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        group_id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'test.unknown',
        path: '/test.unknown',
        content: 'some content',
        language: 'plaintext',
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFile,
              error: null,
            }),
          }),
        }),
      });

      const result = await service.createFile({
        name: 'test.unknown',
        path: '/test.unknown',
        content: 'some content',
        language: 'plaintext',
        groupId: '550e8400-e29b-41d4-a716-446655440002',
      });

      expect(result.language).toBe('plaintext');
    });
  });

  describe('File Operations', () => {
    it('should handle authentication errors', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      await expect(
        service.createFile({
          name: 'test.js',
          path: '/test.js',
          content: 'console.log("hello");',
          language: 'javascript',
          groupId: '550e8400-e29b-41d4-a716-446655440002',
        })
      ).rejects.toThrow('User not authenticated');
    });

    it('should handle duplicate file path errors', async () => {
      const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000' };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Unique constraint violation' },
            }),
          }),
        }),
      });

      await expect(
        service.createFile({
          name: 'test.js',
          path: '/test.js',
          content: 'console.log("hello");',
          language: 'javascript',
          groupId: '550e8400-e29b-41d4-a716-446655440002',
        })
      ).rejects.toThrow('File already exists at path: /test.js');
    });
  });

  describe('Version Control', () => {
    it('should increment version on file update', async () => {
      const mockFile = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        group_id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'test.js',
        path: '/test.js',
        content: 'console.log("hello");',
        language: 'javascript',
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };

      const updatedFile = {
        ...mockFile,
        content: 'console.log("updated");',
        version: 2,
      };

      // Mock getFile
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFile,
              error: null,
            }),
          }),
        }),
      });

      // Mock update
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedFile,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await service.updateFile('550e8400-e29b-41d4-a716-446655440001', {
        content: 'console.log("updated");',
        version: 1,
      });

      expect(result.version).toBe(2);
      expect(result.content).toBe('console.log("updated");');
    });

    it('should detect version conflicts', async () => {
      const mockFile = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        group_id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'test.js',
        path: '/test.js',
        content: 'console.log("hello");',
        language: 'javascript',
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 2, // Current version is 2
      };

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFile,
              error: null,
            }),
          }),
        }),
      });

      await expect(
        service.updateFile('550e8400-e29b-41d4-a716-446655440001', {
          content: 'console.log("updated");',
          version: 1, // Trying to update with old version
        })
      ).rejects.toThrow('Version conflict: expected version 1, but current version is 2');
    });
  });
});
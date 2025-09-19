import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CollaborationFileExplorer } from '../CollaborationFileExplorer';
import { collaborationFileService } from '@/services/collaboration-file-service';
import { CollaborationFile } from '@/types/collaboration';

// Mock the service
vi.mock('@/services/collaboration-file-service', () => ({
  collaborationFileService: {
    getFiles: vi.fn(),
    createFile: vi.fn(),
    deleteFile: vi.fn(),
    renameFile: vi.fn(),
    pathExists: vi.fn(),
    subscribeToFileChanges: vi.fn(() => () => {}),
    detectLanguage: vi.fn()
  }
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const mockFiles: CollaborationFile[] = [
  {
    id: '1',
    groupId: 'group1',
    name: 'index.js',
    path: 'index.js',
    content: 'console.log("Hello");',
    language: 'javascript',
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  },
  {
    id: '2',
    groupId: 'group1',
    name: 'utils.ts',
    path: 'src/utils.ts',
    content: 'export const helper = () => {};',
    language: 'typescript',
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  }
];

describe('CollaborationFileExplorer', () => {
  const mockProps = {
    groupId: 'group1',
    currentUserId: 'user1',
    selectedFile: null,
    onFileSelect: vi.fn(),
    onFileChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (collaborationFileService.getFiles as any).mockResolvedValue(mockFiles);
    (collaborationFileService.subscribeToFileChanges as any).mockReturnValue(() => {});
  });

  it('renders file explorer with files', async () => {
    render(<CollaborationFileExplorer {...mockProps} />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('Files (2)')).toBeInTheDocument();
    });

    // Check if files are displayed
    expect(screen.getByText('index.js')).toBeInTheDocument();
    expect(screen.getByText('utils.ts')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<CollaborationFileExplorer {...mockProps} />);
    expect(screen.getByText('Loading files...')).toBeInTheDocument();
  });

  it('displays folder structure correctly', async () => {
    render(<CollaborationFileExplorer {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument();
    });

    // Check if folder icon is present
    const folderElement = screen.getByText('src').closest('div');
    expect(folderElement).toBeInTheDocument();
  });

  it('calls onFileSelect when file is clicked', async () => {
    render(<CollaborationFileExplorer {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('index.js')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('index.js'));
    expect(mockProps.onFileSelect).toHaveBeenCalledWith(mockFiles[0]);
  });

  it('opens new file dialog when New File button is clicked', async () => {
    render(<CollaborationFileExplorer {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('New File')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New File'));
    expect(screen.getByText('Create New File')).toBeInTheDocument();
  });

  it('shows empty state when no files exist', async () => {
    (collaborationFileService.getFiles as any).mockResolvedValue([]);
    
    render(<CollaborationFileExplorer {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('No files yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Create your first file to get started')).toBeInTheDocument();
  });

  it('handles file creation', async () => {
    const newFile: CollaborationFile = {
      id: '3',
      groupId: 'group1',
      name: 'test.js',
      path: 'test.js',
      content: '',
      language: 'javascript',
      createdBy: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    (collaborationFileService.pathExists as any).mockResolvedValue(false);
    (collaborationFileService.createFile as any).mockResolvedValue(newFile);
    (collaborationFileService.detectLanguage as any).mockReturnValue('javascript');

    render(<CollaborationFileExplorer {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('New File')).toBeInTheDocument();
    });

    // Open new file dialog
    fireEvent.click(screen.getByText('New File'));
    
    // Fill in file name
    const fileNameInput = screen.getByLabelText('File Path');
    fireEvent.change(fileNameInput, { target: { value: 'test.js' } });

    // Click create
    fireEvent.click(screen.getByText('Create File'));

    await waitFor(() => {
      expect(collaborationFileService.createFile).toHaveBeenCalledWith({
        name: 'test.js',
        path: 'test.js',
        groupId: 'group1',
        language: 'javascript',
        createdBy: 'user1'
      });
    });
  });

  it('shows import button and handles file upload', async () => {
    render(<CollaborationFileExplorer {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Import')).toBeInTheDocument();
    });

    // Check if import dropdown exists
    fireEvent.click(screen.getByText('Import'));
    expect(screen.getByText('Upload Files')).toBeInTheDocument();
    expect(screen.getByText('Import Project')).toBeInTheDocument();
    expect(screen.getByText('Export Project')).toBeInTheDocument();
  });

  it('handles drag and drop', async () => {
    render(<CollaborationFileExplorer {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Files (2)')).toBeInTheDocument();
    });

    const card = screen.getByText('Files (2)').closest('.h-full');
    expect(card).toBeInTheDocument();

    // Simulate drag over
    fireEvent.dragOver(card!);
    
    // Should show drag overlay (though we can't easily test the visual state)
    // The component should handle the drag events without errors
  });
});
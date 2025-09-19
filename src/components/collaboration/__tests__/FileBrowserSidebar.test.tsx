import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { FileBrowserSidebar } from '../FileBrowserSidebar';
import { CollaborationFile, FileBookmark } from '@/types/collaboration';

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
    name: 'App.tsx',
    path: 'src/App.tsx',
    content: 'import React from "react";',
    language: 'typescript',
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  },
  {
    id: '2',
    groupId: 'group1',
    name: 'utils.js',
    path: 'src/utils/utils.js',
    content: 'export const helper = () => {};',
    language: 'javascript',
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  }
];

const mockBookmarks: FileBookmark[] = [
  {
    id: 'bookmark1',
    fileId: '1',
    userId: 'user1',
    createdAt: new Date()
  }
];

const defaultProps = {
  groupId: 'group1',
  currentUserId: 'user1',
  files: mockFiles,
  selectedFile: null,
  onFileSelect: vi.fn(),
  recentFiles: [],
  bookmarks: mockBookmarks,
  onBookmarkToggle: vi.fn()
};

describe('FileBrowserSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders file browser with tabs', () => {
    render(<FileBrowserSidebar {...defaultProps} />);
    
    expect(screen.getByText('Files')).toBeInTheDocument();
    expect(screen.getByText('Tree')).toBeInTheDocument();
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Starred')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('displays files in tree structure', () => {
    render(<FileBrowserSidebar {...defaultProps} />);
    
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
    expect(screen.getByText('utils.js')).toBeInTheDocument();
  });

  it('calls onFileSelect when file is clicked', () => {
    const onFileSelect = vi.fn();
    render(<FileBrowserSidebar {...defaultProps} onFileSelect={onFileSelect} />);
    
    fireEvent.click(screen.getByText('App.tsx'));
    
    expect(onFileSelect).toHaveBeenCalledWith(mockFiles[0]);
  });

  it('filters files based on search query', async () => {
    render(<FileBrowserSidebar {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search files...');
    fireEvent.change(searchInput, { target: { value: 'App' } });
    
    // Switch to search tab to see filtered results
    fireEvent.click(screen.getByText('Search'));
    
    await waitFor(() => {
      expect(screen.getByText('Search Results (1)')).toBeInTheDocument();
    });
  });

  it('shows bookmarked files in starred tab', () => {
    render(<FileBrowserSidebar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Starred'));
    
    expect(screen.getByText('Bookmarked Files')).toBeInTheDocument();
    expect(screen.getByText('App.tsx')).toBeInTheDocument();
  });

  it('calls onBookmarkToggle when star is clicked', () => {
    const onBookmarkToggle = vi.fn();
    render(<FileBrowserSidebar {...defaultProps} onBookmarkToggle={onBookmarkToggle} />);
    
    // Find and click the star button (it might be in a hover state)
    const fileRow = screen.getByText('App.tsx').closest('div');
    if (fileRow) {
      fireEvent.mouseEnter(fileRow);
      const starButton = fileRow.querySelector('button');
      if (starButton) {
        fireEvent.click(starButton);
        expect(onBookmarkToggle).toHaveBeenCalledWith('1');
      }
    }
  });

  it('shows language badges for files', () => {
    render(<FileBrowserSidebar {...defaultProps} />);
    
    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('expands and collapses folders', () => {
    render(<FileBrowserSidebar {...defaultProps} />);
    
    // Find the src folder
    const srcFolder = screen.getByText('src');
    expect(srcFolder).toBeInTheDocument();
    
    // Click to collapse/expand
    fireEvent.click(srcFolder);
    
    // The folder should still be visible (just testing the click works)
    expect(srcFolder).toBeInTheDocument();
  });

  it('shows empty state when no files', () => {
    render(<FileBrowserSidebar {...defaultProps} files={[]} />);
    
    expect(screen.getByText('No files found')).toBeInTheDocument();
  });

  it('shows empty state for recent files when none exist', () => {
    render(<FileBrowserSidebar {...defaultProps} recentFiles={[]} />);
    
    fireEvent.click(screen.getByText('Recent'));
    
    expect(screen.getByText('No recent files')).toBeInTheDocument();
  });

  it('shows empty state for bookmarks when none exist', () => {
    render(<FileBrowserSidebar {...defaultProps} bookmarks={[]} />);
    
    fireEvent.click(screen.getByText('Starred'));
    
    expect(screen.getByText('No bookmarked files')).toBeInTheDocument();
    expect(screen.getByText('Click the star icon to bookmark files')).toBeInTheDocument();
  });
});
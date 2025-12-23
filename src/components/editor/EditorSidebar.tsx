import React, { useState } from 'react';
import { ProjectFile } from '@/pages/Editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  Plus, 
  FolderPlus,
  Trash2,
  Edit2,
  FileCode,
  FileJson,
  FileText,
  FileType
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorSidebarProps {
  files: ProjectFile[];
  activeFile: ProjectFile | null;
  onOpenFile: (file: ProjectFile) => void;
  onCreateFile: (name: string, path?: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
}

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <FileCode className="h-4 w-4 text-yellow-500" />;
    case 'json':
      return <FileJson className="h-4 w-4 text-yellow-600" />;
    case 'md':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'html':
      return <FileType className="h-4 w-4 text-orange-500" />;
    case 'css':
      return <FileType className="h-4 w-4 text-blue-400" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
};

export const EditorSidebar = ({
  files,
  activeFile,
  onOpenFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  width,
  onWidthChange
}: EditorSidebarProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']));

  // Group files by folder
  const fileTree = React.useMemo(() => {
    const tree: Record<string, ProjectFile[]> = { '/': [] };
    
    files.forEach(file => {
      const parts = file.path.split('/').filter(Boolean);
      if (parts.length === 1) {
        tree['/'].push(file);
      } else {
        const folder = '/' + parts.slice(0, -1).join('/');
        if (!tree[folder]) tree[folder] = [];
        tree[folder].push(file);
      }
    });

    return tree;
  }, [files]);

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      onCreateFile(newFileName.trim());
      setNewFileName('');
      setIsCreating(false);
    }
  };

  const handleRename = (fileId: string) => {
    if (renameValue.trim()) {
      onRenameFile(fileId, renameValue.trim());
      setRenamingId(null);
      setRenameValue('');
    }
  };

  const startRename = (file: ProjectFile) => {
    setRenamingId(file.id);
    setRenameValue(file.name);
  };

  return (
    <div 
      className="border-r bg-card flex flex-col"
      style={{ width: `${width}px`, minWidth: '200px', maxWidth: '400px' }}
    >
      {/* Header */}
      <div className="h-10 border-b flex items-center justify-between px-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Explorer</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
          >
            <FolderPlus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* File tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* New file input */}
          {isCreating && (
            <div className="mb-2">
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFile();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewFileName('');
                  }
                }}
                onBlur={() => {
                  if (!newFileName.trim()) setIsCreating(false);
                }}
                placeholder="filename.js"
                className="h-7 text-sm"
                autoFocus
              />
            </div>
          )}

          {/* Files */}
          {Object.entries(fileTree).map(([folder, folderFiles]) => (
            <div key={folder}>
              {folder !== '/' && (
                <div 
                  className="flex items-center gap-1 px-1 py-1 cursor-pointer hover:bg-muted/50 rounded"
                  onClick={() => {
                    setExpandedFolders(prev => {
                      const next = new Set(prev);
                      if (next.has(folder)) next.delete(folder);
                      else next.add(folder);
                      return next;
                    });
                  }}
                >
                  {expandedFolders.has(folder) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <Folder className="h-4 w-4 text-blue-400" />
                  <span className="text-sm">{folder.split('/').pop()}</span>
                </div>
              )}
              
              {(folder === '/' || expandedFolders.has(folder)) && (
                <div className={cn(folder !== '/' && 'ml-4')}>
                  {folderFiles.map(file => (
                    <ContextMenu key={file.id}>
                      <ContextMenuTrigger>
                        <div
                          className={cn(
                            'flex items-center gap-2 px-2 py-1 cursor-pointer rounded text-sm',
                            'hover:bg-muted/50',
                            activeFile?.id === file.id && 'bg-muted'
                          )}
                          onClick={() => onOpenFile(file)}
                        >
                          {renamingId === file.id ? (
                            <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(file.id);
                                if (e.key === 'Escape') {
                                  setRenamingId(null);
                                  setRenameValue('');
                                }
                              }}
                              onBlur={() => handleRename(file.id)}
                              className="h-6 text-sm"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              {getFileIcon(file.name)}
                              <span className="truncate flex-1">{file.name}</span>
                              {file.isModified && (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </>
                          )}
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => startRename(file)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Rename
                        </ContextMenuItem>
                        <ContextMenuItem 
                          onClick={() => onDeleteFile(file.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </div>
              )}
            </div>
          ))}

          {files.length === 0 && !isCreating && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>No files yet</p>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setIsCreating(true)}
              >
                Create your first file
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

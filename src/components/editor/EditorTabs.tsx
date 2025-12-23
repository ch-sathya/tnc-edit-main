import React from 'react';
import { ProjectFile } from '@/pages/Editor';
import { X, FileCode, FileJson, FileText, FileType, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface EditorTabsProps {
  openFiles: ProjectFile[];
  activeFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onCloseFile: (fileId: string) => void;
}

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <FileCode className="h-3.5 w-3.5 text-yellow-500" />;
    case 'json':
      return <FileJson className="h-3.5 w-3.5 text-yellow-600" />;
    case 'md':
      return <FileText className="h-3.5 w-3.5 text-blue-500" />;
    case 'html':
      return <FileType className="h-3.5 w-3.5 text-orange-500" />;
    case 'css':
      return <FileType className="h-3.5 w-3.5 text-blue-400" />;
    default:
      return <File className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

export const EditorTabs = ({
  openFiles,
  activeFile,
  onSelectFile,
  onCloseFile
}: EditorTabsProps) => {
  if (openFiles.length === 0) {
    return <div className="h-9 border-b bg-muted/30" />;
  }

  return (
    <div className="h-9 border-b bg-muted/30">
      <ScrollArea className="h-full">
        <div className="flex h-full">
          {openFiles.map(file => (
            <div
              key={file.id}
              className={cn(
                'flex items-center gap-2 px-3 border-r cursor-pointer min-w-[120px] max-w-[200px]',
                'hover:bg-muted/50 transition-colors group',
                activeFile?.id === file.id 
                  ? 'bg-background border-b-2 border-b-primary' 
                  : 'bg-muted/20'
              )}
              onClick={() => onSelectFile(file)}
            >
              {getFileIcon(file.name)}
              <span className="text-sm truncate flex-1">{file.name}</span>
              {file.isModified && (
                <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
              )}
              <button
                className={cn(
                  'h-4 w-4 rounded flex items-center justify-center flex-shrink-0',
                  'opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseFile(file.id);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

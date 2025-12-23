import React from 'react';
import Editor from '@monaco-editor/react';
import { ProjectFile } from '@/pages/Editor';
import { FileCode } from 'lucide-react';

interface EditorMainProps {
  file: ProjectFile | null;
  onChange: (content: string) => void;
}

export const EditorMain = ({ file, onChange }: EditorMainProps) => {
  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <FileCode className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">No file open</p>
          <p className="text-sm">Select a file from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={file.language}
      value={file.content}
      onChange={(value) => onChange(value || '')}
      theme="vs-dark"
      options={{
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        bracketPairColorization: { enabled: true },
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        padding: { top: 16 },
        suggest: {
          showKeywords: true,
          showSnippets: true,
        },
        quickSuggestions: true,
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
};

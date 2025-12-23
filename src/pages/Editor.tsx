import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditorSidebar } from '@/components/editor/EditorSidebar';
import { EditorTabs } from '@/components/editor/EditorTabs';
import { EditorMain } from '@/components/editor/EditorMain';
import { EditorTerminal } from '@/components/editor/EditorTerminal';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { executeCode } from '@/lib/codeExecution';

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isNew?: boolean;
  isModified?: boolean;
}

interface Project {
  id: string;
  title: string;
  description: string;
  user_id: string;
}

const Editor = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // File management
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [openFiles, setOpenFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);
  
  // UI state
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Welcome to the terminal. Type "help" for commands.']);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Auto-save ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch project and files
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId || !user) return;
      
      try {
        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, title, description, user_id')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        
        if (projectData.user_id !== user.id) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to edit this project',
            variant: 'destructive'
          });
          navigate('/portfolio');
          return;
        }
        
        setProject(projectData);

        // Fetch project files from collaboration_files table
        const { data: filesData, error: filesError } = await supabase
          .from('collaboration_files')
          .select('*')
          .eq('room_id', projectId);

        if (filesError && filesError.code !== 'PGRST116') {
          console.error('Error fetching files:', filesError);
        }

        if (filesData && filesData.length > 0) {
          const mappedFiles: ProjectFile[] = filesData.map(f => ({
            id: f.id,
            name: f.name,
            path: f.path,
            content: f.content || '',
            language: f.language || 'javascript'
          }));
          setFiles(mappedFiles);
        } else {
          // Create default file for new project
          const defaultFile: ProjectFile = {
            id: 'temp-' + Date.now(),
            name: 'index.js',
            path: '/index.js',
            content: '// Welcome to your new project!\n\nconsole.log("Hello, World!");\n',
            language: 'javascript',
            isNew: true
          };
          setFiles([defaultFile]);
          setOpenFiles([defaultFile]);
          setActiveFile(defaultFile);
        }
      } catch (error) {
        console.error('Error loading project:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (user && projectId) {
      fetchProject();
    }
  }, [projectId, user, navigate, toast]);

  // Auto-save functionality
  const saveFile = useCallback(async (file: ProjectFile) => {
    if (!projectId || !user) return;
    
    setSaving(true);
    try {
      if (file.isNew || file.id.startsWith('temp-')) {
        // Create new file
        const { data, error } = await supabase
          .from('collaboration_files')
          .insert({
            room_id: projectId,
            name: file.name,
            path: file.path,
            content: file.content,
            language: file.language,
            created_by: user.id
          })
          .select()
          .single();

        if (error) throw error;

        // Update file with real ID
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, id: data.id, isNew: false, isModified: false } : f
        ));
        setOpenFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, id: data.id, isNew: false, isModified: false } : f
        ));
        if (activeFile?.id === file.id) {
          setActiveFile(prev => prev ? { ...prev, id: data.id, isNew: false, isModified: false } : null);
        }
      } else {
        // Update existing file
        const { error } = await supabase
          .from('collaboration_files')
          .update({
            content: file.content,
            updated_at: new Date().toISOString()
          })
          .eq('id', file.id);

        if (error) throw error;

        // Mark as saved
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, isModified: false } : f));
        setOpenFiles(prev => prev.map(f => f.id === file.id ? { ...f, isModified: false } : f));
        if (activeFile?.id === file.id) {
          setActiveFile(prev => prev ? { ...prev, isModified: false } : null);
        }
      }
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        title: 'Error',
        description: 'Failed to save file',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, user, activeFile, toast]);

  // Handle file content change with auto-save
  const handleContentChange = useCallback((content: string) => {
    if (!activeFile) return;

    const updatedFile = { ...activeFile, content, isModified: true };
    
    setActiveFile(updatedFile);
    setOpenFiles(prev => prev.map(f => f.id === activeFile.id ? updatedFile : f));
    setFiles(prev => prev.map(f => f.id === activeFile.id ? updatedFile : f));

    // Auto-save after 2 seconds of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveFile(updatedFile);
    }, 2000);
  }, [activeFile, saveFile]);

  // File operations
  const handleOpenFile = useCallback((file: ProjectFile) => {
    if (!openFiles.find(f => f.id === file.id)) {
      setOpenFiles(prev => [...prev, file]);
    }
    setActiveFile(file);
  }, [openFiles]);

  const handleCloseFile = useCallback((fileId: string) => {
    setOpenFiles(prev => {
      const newOpenFiles = prev.filter(f => f.id !== fileId);
      if (activeFile?.id === fileId && newOpenFiles.length > 0) {
        setActiveFile(newOpenFiles[newOpenFiles.length - 1]);
      } else if (newOpenFiles.length === 0) {
        setActiveFile(null);
      }
      return newOpenFiles;
    });
  }, [activeFile]);

  const handleCreateFile = useCallback((name: string, path: string = '/') => {
    const extension = name.split('.').pop() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'py': 'python'
    };
    
    const newFile: ProjectFile = {
      id: 'temp-' + Date.now(),
      name,
      path: path === '/' ? `/${name}` : `${path}/${name}`,
      content: '',
      language: languageMap[extension] || 'plaintext',
      isNew: true
    };

    setFiles(prev => [...prev, newFile]);
    setOpenFiles(prev => [...prev, newFile]);
    setActiveFile(newFile);
  }, []);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    if (!confirm(`Delete "${file.name}"? This action cannot be undone.`)) return;

    try {
      if (!file.isNew && !fileId.startsWith('temp-')) {
        const { error } = await supabase
          .from('collaboration_files')
          .delete()
          .eq('id', fileId);

        if (error) throw error;
      }

      setFiles(prev => prev.filter(f => f.id !== fileId));
      handleCloseFile(fileId);
      
      toast({ title: 'File deleted' });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive'
      });
    }
  }, [files, handleCloseFile, toast]);

  const handleRenameFile = useCallback(async (fileId: string, newName: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const newPath = file.path.replace(file.name, newName);
    
    try {
      if (!file.isNew && !fileId.startsWith('temp-')) {
        const { error } = await supabase
          .from('collaboration_files')
          .update({ name: newName, path: newPath })
          .eq('id', fileId);

        if (error) throw error;
      }

      const updatedFile = { ...file, name: newName, path: newPath };
      setFiles(prev => prev.map(f => f.id === fileId ? updatedFile : f));
      setOpenFiles(prev => prev.map(f => f.id === fileId ? updatedFile : f));
      if (activeFile?.id === fileId) {
        setActiveFile(updatedFile);
      }
    } catch (error) {
      console.error('Error renaming file:', error);
      toast({
        title: 'Error',
        description: 'Failed to rename file',
        variant: 'destructive'
      });
    }
  }, [files, activeFile, toast]);

  // Run code execution
  const runCode = useCallback(async () => {
    if (!activeFile) {
      setTerminalOutput(prev => [...prev, '> No file selected to run']);
      return;
    }

    setIsExecuting(true);
    setShowTerminal(true);
    setTerminalOutput(prev => [...prev, `$ run ${activeFile.name}`, `> Executing ${activeFile.language} code...`]);

    try {
      const result = await executeCode(activeFile.content, activeFile.language);
      
      if (result.success) {
        setTerminalOutput(prev => [
          ...prev,
          `> Execution completed in ${result.executionTime}ms`,
          '',
          result.output,
          ''
        ]);
      } else {
        setTerminalOutput(prev => [
          ...prev,
          `> Execution failed (${result.executionTime}ms)`,
          `> Error: ${result.error}`,
          ''
        ]);
      }
    } catch (error) {
      setTerminalOutput(prev => [
        ...prev,
        `> Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ''
      ]);
    } finally {
      setIsExecuting(false);
    }
  }, [activeFile]);

  // Terminal command handler
  const handleTerminalCommand = useCallback(async (command: string) => {
    const cmd = command.trim().toLowerCase();
    const parts = command.trim().split(' ');
    let output: string[] = [];

    switch (parts[0].toLowerCase()) {
      case 'help':
        output = [
          '> Available commands:',
          '  help     - Show this help message',
          '  clear    - Clear terminal',
          '  files    - List all files',
          '  run      - Run the active file',
          '  run <filename> - Run a specific file',
          '  save     - Save all files',
          '  node <code> - Execute JavaScript directly',
          '  python <code> - Execute Python directly'
        ];
        break;
      case 'clear':
        setTerminalOutput([]);
        return;
      case 'files':
        output = ['> Files:', ...files.map(f => `  ${f.path}`)];
        break;
      case 'run':
        setTerminalOutput(prev => [...prev, `$ ${command}`]);
        await runCode();
        return;
      case 'save':
        if (activeFile) {
          saveFile(activeFile);
          output = ['> Saving files...'];
        } else {
          output = ['> No file to save'];
        }
        break;
      case 'node':
        const jsCode = parts.slice(1).join(' ');
        if (jsCode) {
          setTerminalOutput(prev => [...prev, `$ ${command}`]);
          const result = await executeCode(jsCode, 'javascript');
          setTerminalOutput(prev => [...prev, result.success ? result.output : `Error: ${result.error}`]);
          return;
        }
        output = ['> Usage: node <code>'];
        break;
      case 'python':
        const pyCode = parts.slice(1).join(' ');
        if (pyCode) {
          setTerminalOutput(prev => [...prev, `$ ${command}`]);
          const result = await executeCode(pyCode, 'python');
          setTerminalOutput(prev => [...prev, result.success ? result.output : `Error: ${result.error}`]);
          return;
        }
        output = ['> Usage: python <code>'];
        break;
      default:
        output = [`> Unknown command: ${parts[0]}. Type "help" for available commands.`];
    }

    setTerminalOutput(prev => [...prev, `$ ${command}`, ...output]);
  }, [files, activeFile, saveFile, runCode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile) {
          saveFile(activeFile);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setShowTerminal(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, saveFile]);

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Sign in required</h2>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <EditorToolbar 
        project={project}
        saving={saving}
        isExecuting={isExecuting}
        onSave={() => activeFile && saveFile(activeFile)}
        onRun={runCode}
        onToggleTerminal={() => setShowTerminal(prev => !prev)}
        showTerminal={showTerminal}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <EditorSidebar
          files={files}
          activeFile={activeFile}
          onOpenFile={handleOpenFile}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
        />

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <EditorTabs
            openFiles={openFiles}
            activeFile={activeFile}
            onSelectFile={setActiveFile}
            onCloseFile={handleCloseFile}
          />

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <EditorMain
              file={activeFile}
              onChange={handleContentChange}
            />
          </div>

          {/* Terminal */}
          {showTerminal && (
            <EditorTerminal
              output={terminalOutput}
              onCommand={handleTerminalCommand}
              onClose={() => setShowTerminal(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;

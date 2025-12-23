import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeCursors } from '@/hooks/useRealtimeCursors';
import { executeCode } from '@/lib/codeExecution';
import { RoomChat } from '@/components/RoomChat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import Editor, { OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import {
  FolderOpen, 
  FileCode, 
  FilePlus, 
  ChevronRight, 
  ChevronDown,
  X,
  Save,
  Play,
  Settings,
  Users,
  ArrowLeft,
  MoreVertical,
  Trash2,
  Search,
  Terminal,
  Circle,
  FileJson,
  FileText,
  File as FileIcon,
  MessageSquare,
  UserCog,
  Copy,
  Check
} from 'lucide-react';

interface RoomFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isFolder?: boolean;
  children?: RoomFile[];
  isOpen?: boolean;
  isDirty?: boolean;
}

interface Participant {
  id: string;
  user_id: string;
  role: string;
  status?: 'online' | 'away' | 'offline';
  profile?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface Room {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  created_by: string;
}

const languageMap: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  html: 'html',
  css: 'css',
  scss: 'scss',
  json: 'json',
  md: 'markdown',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  go: 'go',
  rs: 'rust',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  sh: 'shell',
  bash: 'shell',
};

const getFileIcon = (fileName: string, isFolder: boolean) => {
  if (isFolder) return <FolderOpen className="h-4 w-4 text-yellow-500" />;
  
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  switch (ext) {
    case 'js':
    case 'jsx':
      return <FileCode className="h-4 w-4 text-yellow-400" />;
    case 'ts':
    case 'tsx':
      return <FileCode className="h-4 w-4 text-blue-400" />;
    case 'json':
      return <FileJson className="h-4 w-4 text-yellow-300" />;
    case 'md':
    case 'txt':
      return <FileText className="h-4 w-4 text-gray-400" />;
    case 'html':
      return <FileCode className="h-4 w-4 text-orange-400" />;
    case 'css':
    case 'scss':
      return <FileCode className="h-4 w-4 text-blue-300" />;
    case 'py':
      return <FileCode className="h-4 w-4 text-green-400" />;
    default:
      return <FileIcon className="h-4 w-4 text-gray-400" />;
  }
};

const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return languageMap[ext] || 'plaintext';
};

const CollaborationRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [openFiles, setOpenFiles] = useState<RoomFile[]>([]);
  const [activeFile, setActiveFile] = useState<RoomFile | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Chat & presence state
  const [showChat, setShowChat] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Editor refs
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  // Get user display name
  const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Anonymous';

  // Real-time cursor synchronization
  const { collaborators, broadcastCursor, renderCursors } = useRealtimeCursors(
    roomId,
    user?.id,
    userName,
    activeFile?.id
  );

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Listen to cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      const selection = editor.getSelection();
      broadcastCursor(
        { lineNumber: e.position.lineNumber, column: e.position.column },
        selection && !selection.isEmpty() ? {
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn
        } : undefined
      );
    });

    // Listen to selection changes
    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      const position = editor.getPosition();
      if (position) {
        broadcastCursor(
          { lineNumber: position.lineNumber, column: position.column },
          !selection.isEmpty() ? {
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn: selection.endColumn
          } : undefined
        );
      }
    });
  }, [broadcastCursor]);

  // Render collaborator cursors when they change
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      renderCursors(editorRef.current, monacoRef.current);
    }
  }, [collaborators, renderCursors]);

  // Fetch room data
  useEffect(() => {
    if (!roomId) return;
    
    const fetchRoom = async () => {
      try {
        setLoading(true);
        
        // Fetch room details
        const { data: roomData, error: roomError } = await supabase
          .from('collaboration_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData);

        // Check if user is a participant
        if (user) {
          const { data: participantData } = await supabase
            .from('room_participants')
            .select('*')
            .eq('room_id', roomId)
            .eq('user_id', user.id)
            .maybeSingle();

          setIsParticipant(!!participantData);

          // If not a participant, auto-join
          if (!participantData) {
            await supabase
              .from('room_participants')
              .insert([{ room_id: roomId, user_id: user.id, role: 'member' }]);
            setIsParticipant(true);
          }
        }

        // Fetch participants
        const { data: participantsData } = await supabase
          .from('room_participants')
          .select(`
            *,
            profile:user_id (
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('room_id', roomId);

        setParticipants((participantsData as any) || []);

        // Fetch room code/files
        const { data: codeData } = await supabase
          .from('collaboration_code')
          .select('*')
          .eq('room_id', roomId);

        if (codeData && codeData.length > 0) {
          const roomFiles: RoomFile[] = codeData.map((code: any) => ({
            id: code.id,
            name: `main.${code.language === 'javascript' ? 'js' : code.language}`,
            path: `/main.${code.language === 'javascript' ? 'js' : code.language}`,
            content: code.content,
            language: code.language,
          }));
          setFiles(roomFiles);
        } else {
          // Create default file structure
          const defaultFiles: RoomFile[] = [
            {
              id: 'default-1',
              name: 'index.js',
              path: '/index.js',
              content: '// Welcome to the collaboration room!\n// Start coding together!\n\nconsole.log("Hello, World!");\n',
              language: 'javascript',
            }
          ];
          setFiles(defaultFiles);
        }

      } catch (error) {
        console.error('Error fetching room:', error);
        toast({
          title: "Error",
          description: "Failed to load collaboration room",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();

    // Set up real-time presence tracking
    if (user && roomId) {
      const presenceChannel = supabase.channel(`room-presence-${roomId}`);
      
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = presenceChannel.presenceState();
          const currentOnline = new Set<string>();
          Object.values(presenceState).forEach((presence: any) => {
            presence.forEach((p: any) => {
              if (p.user_id) currentOnline.add(p.user_id);
            });
          });
          setOnlineUsers(currentOnline);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: user.id,
              user_name: userName,
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        supabase.removeChannel(presenceChannel);
      };
    }
  }, [roomId, user, toast, userName]);

  // Delete room function
  const handleDeleteRoom = useCallback(async () => {
    if (!roomId || !room) return;

    try {
      // Delete participants
      await supabase.from('room_participants').delete().eq('room_id', roomId);
      // Delete files
      await supabase.from('collaboration_files').delete().eq('room_id', roomId);
      // Delete code
      await supabase.from('collaboration_code').delete().eq('room_id', roomId);
      // Delete messages
      await supabase.from('room_messages').delete().eq('room_id', roomId);
      // Delete invitations
      await supabase.from('room_invitations').delete().eq('room_id', roomId);
      // Delete room
      const { error } = await supabase.from('collaboration_rooms').delete().eq('id', roomId);

      if (error) throw error;

      toast({ title: "Success", description: "Room deleted successfully" });
      navigate('/collaborate');
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({ title: "Error", description: "Failed to delete room", variant: "destructive" });
    }
  }, [roomId, room, navigate, toast]);

  // Copy room ID
  const handleCopyRoomId = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(`${window.location.origin}/collaborate/${roomId}`);
    setCopiedRoomId(true);
    setTimeout(() => setCopiedRoomId(false), 2000);
    toast({ title: "Copied!", description: "Room link copied to clipboard" });
  }, [roomId, toast]);

  // Check if current user is owner
  const isOwner = room?.created_by === user?.id;

  // Handle file selection
  const handleFileSelect = useCallback((file: RoomFile) => {
    if (file.isFolder) {
      // Toggle folder
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.id === file.id ? { ...f, isOpen: !f.isOpen } : f
        )
      );
      return;
    }

    // Check if file is already open
    const isAlreadyOpen = openFiles.some(f => f.id === file.id);
    if (!isAlreadyOpen) {
      setOpenFiles(prev => [...prev, file]);
    }
    setActiveFile(file);
  }, [openFiles]);

  // Handle file close
  const handleFileClose = useCallback((fileId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFile?.id === fileId) {
      const remainingFiles = openFiles.filter(f => f.id !== fileId);
      setActiveFile(remainingFiles.length > 0 ? remainingFiles[remainingFiles.length - 1] : null);
    }
  }, [activeFile, openFiles]);

  // Handle code change
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (!activeFile || value === undefined) return;
    
    // Update file content
    setFiles(prevFiles =>
      prevFiles.map(f =>
        f.id === activeFile.id ? { ...f, content: value, isDirty: true } : f
      )
    );
    
    // Update in open files
    setOpenFiles(prevOpenFiles =>
      prevOpenFiles.map(f =>
        f.id === activeFile.id ? { ...f, content: value, isDirty: true } : f
      )
    );

    // Update active file
    setActiveFile(prev => prev ? { ...prev, content: value, isDirty: true } : null);
  }, [activeFile]);

  // Save file
  const handleSaveFile = useCallback(async () => {
    if (!activeFile || !roomId) return;

    try {
      // Try to update existing code or insert new
      const { data: existingCode } = await supabase
        .from('collaboration_code')
        .select('id')
        .eq('room_id', roomId)
        .maybeSingle();

      if (existingCode) {
        await supabase
          .from('collaboration_code')
          .update({
            content: activeFile.content,
            language: activeFile.language,
            updated_by: user?.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCode.id);
      } else {
        await supabase
          .from('collaboration_code')
          .insert([{
            room_id: roomId,
            content: activeFile.content,
            language: activeFile.language,
            updated_by: user?.id
          }]);
      }

      // Mark file as saved
      setFiles(prevFiles =>
        prevFiles.map(f =>
          f.id === activeFile.id ? { ...f, isDirty: false } : f
        )
      );
      setOpenFiles(prevOpenFiles =>
        prevOpenFiles.map(f =>
          f.id === activeFile.id ? { ...f, isDirty: false } : f
        )
      );
      setActiveFile(prev => prev ? { ...prev, isDirty: false } : null);

      toast({
        title: "Saved",
        description: "File saved successfully"
      });
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        title: "Error",
        description: "Failed to save file",
        variant: "destructive"
      });
    }
  }, [activeFile, roomId, user, toast]);

  // Create new file
  const handleCreateFile = useCallback(() => {
    if (!newFileName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a file name",
        variant: "destructive"
      });
      return;
    }

    const language = getLanguageFromFileName(newFileName);
    const newFile: RoomFile = {
      id: `file-${Date.now()}`,
      name: newFileName,
      path: `/${newFileName}`,
      content: '',
      language,
    };

    setFiles(prev => [...prev, newFile]);
    setOpenFiles(prev => [...prev, newFile]);
    setActiveFile(newFile);
    setShowNewFileDialog(false);
    setNewFileName('');
  }, [newFileName, toast]);

  // Delete file
  const handleDeleteFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setOpenFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFile?.id === fileId) {
      setActiveFile(null);
    }
    toast({
      title: "Deleted",
      description: "File deleted"
    });
  }, [activeFile, toast]);

  // Run code
  const handleRunCode = useCallback(async () => {
    if (!activeFile) return;

    setShowTerminal(true);
    setTerminalOutput(prev => [
      ...prev,
      `> Running ${activeFile.name}...`,
      ''
    ]);

    try {
      const result = await executeCode(activeFile.content, activeFile.language);
      
      if (result.success) {
        setTerminalOutput(prev => [
          ...prev,
          `✓ Executed successfully (${result.executionTime}ms)`,
          '',
          result.output,
          ''
        ]);
      } else {
        setTerminalOutput(prev => [
          ...prev,
          `✗ Execution failed (${result.executionTime}ms)`,
          `Error: ${result.error}`,
          ''
        ]);
      }
    } catch (error) {
      setTerminalOutput(prev => [
        ...prev,
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ''
      ]);
    }
  }, [activeFile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setShowSearch(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowNewFileDialog(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        setShowTerminal(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveFile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-48 mb-4 mx-auto bg-[#2d2d2d]" />
          <Skeleton className="h-4 w-32 mx-auto bg-[#2d2d2d]" />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Room not found</h1>
          <Button onClick={() => navigate('/collaborate')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Rooms
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      {/* Top Bar */}
      <div className="h-12 bg-[#323233] border-b border-[#3c3c3c] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/collaborate')}
            className="text-gray-300 hover:text-white hover:bg-[#464647]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit
          </Button>
          <div className="h-4 w-px bg-[#3c3c3c]" />
          <span className="font-semibold text-sm">{room.name}</span>
          {room.is_private && (
            <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-400">
              Private
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Participants with presence indicators */}
          <TooltipProvider>
            <div className="flex items-center gap-1 mr-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">{participants.length}</span>
              <div className="flex -space-x-2 ml-2">
                {participants.slice(0, 5).map((p) => {
                  const isOnline = onlineUsers.has(p.user_id);
                  const displayName = (p.profile as any)?.display_name || (p.profile as any)?.username || 'User';
                  const statusColor = isOnline ? 'bg-green-500' : 'bg-gray-500';
                  
                  return (
                    <Tooltip key={p.id}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <div
                            className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold border-2 border-[#323233] cursor-pointer"
                          >
                            {displayName[0].toUpperCase()}
                          </div>
                          {/* Status dot */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusColor} border-2 border-[#323233]`} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-[#252526] border-[#3c3c3c] text-white">
                        <p className="font-medium">{displayName}</p>
                        <p className="text-xs text-gray-400">{p.role} • {isOnline ? 'Online' : 'Offline'}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {participants.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-[#464647] flex items-center justify-center text-xs border-2 border-[#323233]">
                    +{participants.length - 5}
                  </div>
                )}
              </div>
            </div>
          </TooltipProvider>

          <div className="h-4 w-px bg-[#3c3c3c]" />

          {/* Chat button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChat(prev => !prev)}
            className={`text-gray-300 hover:text-white hover:bg-[#464647] ${showChat ? 'bg-[#464647]' : ''}`}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(true)}
            className="text-gray-300 hover:text-white hover:bg-[#464647]"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveFile}
            className="text-gray-300 hover:text-white hover:bg-[#464647]"
            disabled={!activeFile?.isDirty}
          >
            <Save className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRunCode}
            className="text-gray-300 hover:text-white hover:bg-[#464647]"
            disabled={!activeFile}
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTerminal(prev => !prev)}
            className={`text-gray-300 hover:text-white hover:bg-[#464647] ${showTerminal ? 'bg-[#464647]' : ''}`}
          >
            <Terminal className="h-4 w-4" />
          </Button>

          {/* Room settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-[#464647]"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#252526] border-[#3c3c3c]">
              <DropdownMenuItem
                className="text-gray-300 hover:bg-[#094771] hover:text-white focus:bg-[#094771] focus:text-white"
                onClick={handleCopyRoomId}
              >
                {copiedRoomId ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy Room Link
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-gray-300 hover:bg-[#094771] hover:text-white focus:bg-[#094771] focus:text-white"
                onClick={() => setShowSettingsDialog(true)}
              >
                <UserCog className="h-4 w-4 mr-2" />
                Room Info
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuSeparator className="bg-[#3c3c3c]" />
                  <DropdownMenuItem
                    className="text-red-400 hover:bg-red-900/30 hover:text-red-300 focus:bg-red-900/30 focus:text-red-300"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Room
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          {showSidebar && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <div className="h-full bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
                  {/* Sidebar Header */}
                  <div className="h-10 flex items-center justify-between px-4 border-b border-[#3c3c3c]">
                    <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                      Explorer
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-white hover:bg-[#37373d]"
                        onClick={() => setShowNewFileDialog(true)}
                      >
                        <FilePlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* File Tree */}
                  <ScrollArea className="flex-1">
                    <div className="py-2">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className={`flex items-center gap-2 px-4 py-1 cursor-pointer hover:bg-[#2a2d2e] group ${
                            activeFile?.id === file.id ? 'bg-[#37373d]' : ''
                          }`}
                          onClick={() => handleFileSelect(file)}
                        >
                          {file.isFolder && (
                            file.isOpen ? 
                              <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                          {getFileIcon(file.name, !!file.isFolder)}
                          <span className="text-sm text-gray-300 flex-1 truncate">
                            {file.name}
                          </span>
                          {file.isDirty && (
                            <Circle className="h-2 w-2 fill-white text-white" />
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white hover:bg-[#37373d]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[#3c3c3c] border-[#454545]">
                              <DropdownMenuItem 
                                className="text-gray-300 hover:bg-[#094771] hover:text-white focus:bg-[#094771] focus:text-white"
                                onClick={() => handleDeleteFile(file.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
              <ResizableHandle className="w-1 bg-[#3c3c3c] hover:bg-[#094771] transition-colors" />
            </>
          )}

          {/* Editor Area */}
          <ResizablePanel defaultSize={showSidebar ? 80 : 100}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={showTerminal ? 70 : 100}>
                <div className="h-full flex flex-col">
                  {/* Tabs */}
                  {openFiles.length > 0 && (
                    <div className="h-9 bg-[#252526] flex items-center overflow-x-auto border-b border-[#3c3c3c]">
                      {openFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`flex items-center gap-2 px-3 h-full cursor-pointer border-r border-[#3c3c3c] group min-w-max ${
                            activeFile?.id === file.id 
                              ? 'bg-[#1e1e1e] border-t-2 border-t-[#094771]' 
                              : 'bg-[#2d2d2d] hover:bg-[#2a2d2e]'
                          }`}
                          onClick={() => setActiveFile(file)}
                        >
                          {getFileIcon(file.name, false)}
                          <span className="text-sm text-gray-300">
                            {file.name}
                          </span>
                          {file.isDirty && (
                            <Circle className="h-2 w-2 fill-white text-white" />
                          )}
                          <button
                            className="ml-1 p-0.5 rounded hover:bg-[#3c3c3c] opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleFileClose(file.id, e)}
                          >
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Editor */}
                  <div className="flex-1 overflow-hidden">
                    {activeFile ? (
                      <Editor
                        height="100%"
                        language={activeFile.language}
                        value={activeFile.content}
                        onChange={handleCodeChange}
                        onMount={handleEditorMount}
                        theme="vs-dark"
                        options={{
                          fontSize: 14,
                          fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                          minimap: { enabled: true },
                          lineNumbers: 'on',
                          wordWrap: 'on',
                          automaticLayout: true,
                          scrollBeyondLastLine: false,
                          padding: { top: 16 },
                          cursorBlinking: 'smooth',
                          cursorSmoothCaretAnimation: 'on',
                          smoothScrolling: true,
                          formatOnPaste: true,
                          formatOnType: true,
                          tabSize: 2,
                          bracketPairColorization: { enabled: true },
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <FileCode className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg mb-2">No file open</p>
                          <p className="text-sm">Select a file from the explorer or create a new one</p>
                          <div className="mt-4 flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowNewFileDialog(true)}
                              className="border-[#3c3c3c] text-gray-300 hover:bg-[#37373d]"
                            >
                              <FilePlus className="h-4 w-4 mr-2" />
                              New File
                            </Button>
                          </div>
                          <p className="text-xs mt-4 text-gray-600">
                            Tip: Press Ctrl+N to create a new file
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>

              {/* Terminal */}
              {showTerminal && (
                <>
                  <ResizableHandle className="h-1 bg-[#3c3c3c] hover:bg-[#094771] transition-colors" />
                  <ResizablePanel defaultSize={30} minSize={15}>
                    <div className="h-full bg-[#1e1e1e] border-t border-[#3c3c3c]">
                      <div className="h-9 bg-[#252526] flex items-center justify-between px-4 border-b border-[#3c3c3c]">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-300">Terminal</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-white hover:bg-[#37373d]"
                          onClick={() => setShowTerminal(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <ScrollArea className="h-[calc(100%-36px)]">
                        <div className="p-4 font-mono text-sm text-gray-300">
                          {terminalOutput.length === 0 ? (
                            <p className="text-gray-500">Terminal ready. Press Run to execute code.</p>
                          ) : (
                            terminalOutput.map((line, i) => (
                              <div key={i} className={line.startsWith('Error') ? 'text-red-400' : line.startsWith('✓') ? 'text-green-400' : ''}>
                                {line || <br />}
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Chat Panel */}
          {showChat && (
            <>
              <ResizableHandle className="w-1 bg-[#3c3c3c] hover:bg-[#094771] transition-colors" />
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <RoomChat 
                  roomId={roomId || ''} 
                  isOpen={showChat} 
                  onClose={() => setShowChat(false)} 
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] flex items-center justify-between px-4 text-xs text-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>{activeFile?.language || 'No file'}</span>
          {activeFile && (
            <>
              <span>Line 1, Col 1</span>
              <span>UTF-8</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {collaborators.length > 0 && (
            <div className="flex items-center gap-2">
              <span>Editing:</span>
              <div className="flex -space-x-1">
                {collaborators.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border border-white/50"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  >
                    {c.name[0].toUpperCase()}
                  </div>
                ))}
                {collaborators.length > 4 && (
                  <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[8px]">
                    +{collaborators.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}
          <span>{participants.length} collaborator{participants.length !== 1 ? 's' : ''} online</span>
          <span>Spaces: 2</span>
        </div>
      </div>

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="bg-[#252526] border-[#3c3c3c]">
          <DialogHeader>
            <DialogTitle className="text-white">Create New File</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the file name with extension (e.g., index.js, styles.css)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="filename" className="text-gray-300">File Name</Label>
              <Input
                id="filename"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="index.js"
                className="bg-[#3c3c3c] border-[#3c3c3c] text-white"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewFileDialog(false)}
              className="border-[#3c3c3c] text-gray-300 hover:bg-[#37373d]"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFile}>Create File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="bg-[#252526] border-[#3c3c3c] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Quick Open</DialogTitle>
          </DialogHeader>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to search files..."
            className="bg-[#3c3c3c] border-[#3c3c3c] text-white"
            autoFocus
          />
          <div className="max-h-64 overflow-auto">
            {files
              .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(file => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#094771] rounded"
                  onClick={() => {
                    handleFileSelect(file);
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                >
                  {getFileIcon(file.name, !!file.isFolder)}
                  <span className="text-gray-300">{file.name}</span>
                </div>
              ))
            }
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Room Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#252526] border-[#3c3c3c]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Room</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete "{room?.name}"? This will permanently remove the room, all files, messages, and participants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#3c3c3c] text-gray-300 hover:bg-[#37373d]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Room Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="bg-[#252526] border-[#3c3c3c]">
          <DialogHeader>
            <DialogTitle className="text-white">Room Information</DialogTitle>
            <DialogDescription className="text-gray-400">
              Details about this collaboration room
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400 text-xs">Room Name</Label>
                <p className="text-white font-medium">{room?.name}</p>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Visibility</Label>
                <p className="text-white font-medium">{room?.is_private ? 'Private' : 'Public'}</p>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Your Role</Label>
                <p className="text-white font-medium capitalize">{isOwner ? 'Owner' : 'Member'}</p>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Participants</Label>
                <p className="text-white font-medium">{participants.length}</p>
              </div>
            </div>
            {room?.description && (
              <div>
                <Label className="text-gray-400 text-xs">Description</Label>
                <p className="text-white">{room.description}</p>
              </div>
            )}
            <div>
              <Label className="text-gray-400 text-xs">Share Link</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input 
                  value={`${window.location.origin}/collaborate/${roomId}`}
                  readOnly
                  className="bg-[#3c3c3c] border-[#3c3c3c] text-white text-sm"
                />
                <Button size="sm" onClick={handleCopyRoomId} variant="outline" className="border-[#3c3c3c]">
                  {copiedRoomId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettingsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollaborationRoom;

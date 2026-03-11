import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeCursors } from '@/hooks/useRealtimeCursors';
import { executeCode } from '@/lib/codeExecution';
import { RoomChat } from '@/components/RoomChat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Editor, { OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import {
  FolderOpen, FileCode, FilePlus, ChevronRight, ChevronDown,
  X, Save, Play, Settings, Users, ArrowLeft, MoreVertical,
  Trash2, Search, Terminal, Circle, FileJson, FileText,
  File as FileIcon, MessageSquare, UserCog, Copy, Check,
  Share2, Loader2, PanelLeftClose, PanelLeft, Download,
  RefreshCw, Wifi, WifiOff, Eye, Clock
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────
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
  max_participants: number;
}

// ─── Constants ─────────────────────────────────────────
const languageMap: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', html: 'html', css: 'css', scss: 'scss', json: 'json',
  md: 'markdown', sql: 'sql', yaml: 'yaml', yml: 'yaml', xml: 'xml',
  go: 'go', rs: 'rust', java: 'java', cpp: 'cpp', c: 'c',
  sh: 'shell', bash: 'shell', rb: 'ruby', php: 'php',
};

const IDLE_TIMEOUT = 3 * 60 * 1000;   // 3 min → away
const AWAY_TIMEOUT = 10 * 60 * 1000;  // 10 min → offline

const getFileIcon = (fileName: string, isFolder: boolean) => {
  if (isFolder) return <FolderOpen className="h-4 w-4 text-yellow-500" />;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, React.ReactNode> = {
    js: <FileCode className="h-4 w-4 text-yellow-400" />,
    jsx: <FileCode className="h-4 w-4 text-yellow-400" />,
    ts: <FileCode className="h-4 w-4 text-blue-400" />,
    tsx: <FileCode className="h-4 w-4 text-blue-400" />,
    json: <FileJson className="h-4 w-4 text-yellow-300" />,
    md: <FileText className="h-4 w-4 text-gray-400" />,
    txt: <FileText className="h-4 w-4 text-gray-400" />,
    html: <FileCode className="h-4 w-4 text-orange-400" />,
    css: <FileCode className="h-4 w-4 text-blue-300" />,
    scss: <FileCode className="h-4 w-4 text-pink-400" />,
    py: <FileCode className="h-4 w-4 text-green-400" />,
    go: <FileCode className="h-4 w-4 text-cyan-400" />,
    rs: <FileCode className="h-4 w-4 text-orange-500" />,
    java: <FileCode className="h-4 w-4 text-red-400" />,
  };
  return iconMap[ext] || <FileIcon className="h-4 w-4 text-gray-400" />;
};

const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return languageMap[ext] || 'plaintext';
};

// ─── Presence Status Colors ───────────────────────────
const statusColors: Record<string, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
};

// ─── Main Component ───────────────────────────────────
const CollaborationRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Room & data state
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [openFiles, setOpenFiles] = useState<RoomFile[]>([]);
  const [activeFile, setActiveFile] = useState<RoomFile | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);

  // UI state
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [stdinInput, setStdinInput] = useState('');
  const [showStdinPanel, setShowStdinPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [editorCursorInfo, setEditorCursorInfo] = useState({ line: 1, col: 1 });

  // Presence state
  const [onlineUsers, setOnlineUsers] = useState<Map<string, { status: string; lastActivity: number }>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Refs
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const localSyncedFiles = useRef<Set<string>>(new Set());
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const awayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Anonymous';

  // Cursors
  const { collaborators, broadcastCursor, renderCursors } = useRealtimeCursors(
    roomId, user?.id, userName, activeFile?.id
  );

  // ─── Presence Management ────────────────────────────
  const broadcastPresenceStatus = useCallback(async (status: string) => {
    if (!presenceChannelRef.current || !user) return;
    await presenceChannelRef.current.track({
      user_id: user.id,
      user_name: userName,
      online_at: new Date().toISOString(),
      status,
      lastActivity: Date.now(),
      isTyping: false,
      currentFile: activeFile?.name || null,
    });
  }, [user, userName, activeFile?.name]);

  const resetIdleTimers = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (awayTimerRef.current) clearTimeout(awayTimerRef.current);

    // Broadcast online status
    broadcastPresenceStatus('online');

    // Set idle → away after IDLE_TIMEOUT
    idleTimerRef.current = setTimeout(() => {
      broadcastPresenceStatus('away');

      // Set away → offline after AWAY_TIMEOUT
      awayTimerRef.current = setTimeout(() => {
        broadcastPresenceStatus('offline');
      }, AWAY_TIMEOUT - IDLE_TIMEOUT);
    }, IDLE_TIMEOUT);
  }, [broadcastPresenceStatus]);

  // Activity tracking listeners
  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > 1000) {
        resetIdleTimers();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        broadcastPresenceStatus('away');
      } else {
        resetIdleTimers();
      }
    });

    return () => {
      events.forEach(e => document.removeEventListener(e, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
    };
  }, [resetIdleTimers, broadcastPresenceStatus]);

  // ─── Editor Mount ───────────────────────────────────
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      setEditorCursorInfo({ line: e.position.lineNumber, col: e.position.column });
      const selection = editor.getSelection();
      broadcastCursor(
        { lineNumber: e.position.lineNumber, column: e.position.column },
        selection && !selection.isEmpty() ? {
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn,
        } : undefined
      );
    });
  }, [broadcastCursor]);

  // Render collaborator cursors
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      renderCursors(editorRef.current, monacoRef.current);
    }
  }, [collaborators, renderCursors]);

  // ─── Fetch Room ─────────────────────────────────────
  useEffect(() => {
    if (!roomId || !user) return;

    const fetchRoom = async () => {
      try {
        setLoading(true);

        const { data: roomData, error: roomError } = await supabase
          .from('collaboration_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData);

        // Auto-join
        const { data: participantData } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', roomId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!participantData) {
          await supabase
            .from('room_participants')
            .insert([{ room_id: roomId, user_id: user.id, role: 'member' }]);
        }
        setIsParticipant(true);

        // Fetch participants
        const { data: participantsData } = await supabase
          .from('room_participants')
          .select('*')
          .eq('room_id', roomId);

        if (participantsData) {
          const userIds = participantsData.map(p => p.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', userIds);

          setParticipants(
            participantsData.map(p => ({
              ...p,
              profile: profiles?.find(prof => prof.user_id === p.user_id),
            })) as Participant[]
          );
        }

        // Fetch files
        const { data: filesData } = await supabase
          .from('collaboration_files')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (filesData && filesData.length > 0) {
          const roomFiles: RoomFile[] = filesData.map((file: any) => ({
            id: file.id, name: file.name, path: file.path,
            content: file.content || '',
            language: file.language || getLanguageFromFileName(file.name),
          }));
          setFiles(roomFiles);
          // Auto-open first file
          setOpenFiles([roomFiles[0]]);
          setActiveFile(roomFiles[0]);
        } else {
          // Create default file
          const defaultContent = '// Welcome to the collaboration room!\n// Start coding together!\n\nconsole.log("Hello, World!");\n';
          const { data: newFile } = await supabase
            .from('collaboration_files')
            .insert([{
              room_id: roomId,
              name: 'index.js', path: '/index.js',
              content: defaultContent, language: 'javascript',
              created_by: user.id,
            }])
            .select()
            .single();

          if (newFile) {
            const f: RoomFile = {
              id: newFile.id, name: newFile.name, path: newFile.path,
              content: newFile.content || '', language: newFile.language || 'javascript',
            };
            setFiles([f]);
            setOpenFiles([f]);
            setActiveFile(f);
          }
        }
      } catch (error) {
        console.error('Error fetching room:', error);
        toast({ title: "Error", description: "Failed to load collaboration room", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, user, toast]);

  // ─── Real-time Subscriptions ────────────────────────
  useEffect(() => {
    if (!roomId || !user) return;

    // Presence channel
    const presenceChannel = supabase.channel(`room-presence-${roomId}`);
    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = new Map<string, { status: string; lastActivity: number }>();
        const typing = new Set<string>();

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id) {
              users.set(p.user_id, {
                status: p.status || 'online',
                lastActivity: p.lastActivity || Date.now(),
              });
              if (p.isTyping && p.user_id !== user.id) {
                typing.add(p.user_name || 'Someone');
              }
            }
          });
        });
        setOnlineUsers(users);
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            user_name: userName,
            online_at: new Date().toISOString(),
            status: 'online',
            lastActivity: Date.now(),
            isTyping: false,
            currentFile: null,
          });
          resetIdleTimers();
        }
      });

    // File changes channel
    const filesChannel = supabase
      .channel(`room-files-${roomId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'collaboration_files',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const f = payload.new as any;
          setFiles(prev => prev.some(x => x.id === f.id) ? prev : [...prev, {
            id: f.id, name: f.name, path: f.path,
            content: f.content || '', language: f.language || 'plaintext',
          }]);
        } else if (payload.eventType === 'UPDATE') {
          const f = payload.new as any;
          if (localSyncedFiles.current.has(f.id)) return;
          const update = (file: RoomFile) =>
            file.id === f.id ? { ...file, content: f.content || '', language: f.language || file.language } : file;
          setFiles(prev => prev.map(update));
          setOpenFiles(prev => prev.map(update));
          setActiveFile(prev => prev?.id === f.id ? { ...prev, content: f.content || '' } : prev);
        } else if (payload.eventType === 'DELETE') {
          const id = (payload.old as any).id;
          setFiles(prev => prev.filter(f => f.id !== id));
          setOpenFiles(prev => prev.filter(f => f.id !== id));
          setActiveFile(prev => prev?.id === id ? null : prev);
        }
      })
      .subscribe();

    // Participant changes
    const participantsChannel = supabase
      .channel(`room-participants-${roomId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'room_participants',
        filter: `room_id=eq.${roomId}`,
      }, async () => {
        const { data } = await supabase
          .from('room_participants').select('*').eq('room_id', roomId);
        if (data) {
          const userIds = data.map(p => p.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', userIds);
          setParticipants(data.map(p => ({
            ...p, profile: profiles?.find(prof => prof.user_id === p.user_id),
          })) as Participant[]);
        }
      })
      .subscribe();

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [roomId, user, userName, resetIdleTimers]);

  // ─── Typing broadcast ──────────────────────────────
  const broadcastTyping = useCallback(async (isTyping: boolean) => {
    if (!presenceChannelRef.current || !user) return;
    await presenceChannelRef.current.track({
      user_id: user.id,
      user_name: userName,
      online_at: new Date().toISOString(),
      status: 'online',
      lastActivity: Date.now(),
      isTyping,
      currentFile: activeFile?.name || null,
    });
  }, [user, userName, activeFile?.name]);

  // ─── Actions ────────────────────────────────────────
  const handleFileSelect = useCallback((file: RoomFile) => {
    if (file.isFolder) {
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, isOpen: !f.isOpen } : f));
      return;
    }
    if (!openFiles.some(f => f.id === file.id)) {
      setOpenFiles(prev => [...prev, file]);
    }
    setActiveFile(file);
  }, [openFiles]);

  const handleFileClose = useCallback((fileId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenFiles(prev => prev.filter(f => f.id !== fileId));
    if (activeFile?.id === fileId) {
      const remaining = openFiles.filter(f => f.id !== fileId);
      setActiveFile(remaining.length > 0 ? remaining[remaining.length - 1] : null);
    }
  }, [activeFile, openFiles]);

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (!activeFile || value === undefined) return;

    const updateFn = (f: RoomFile) =>
      f.id === activeFile.id ? { ...f, content: value, isDirty: true } : f;
    setFiles(prev => prev.map(updateFn));
    setOpenFiles(prev => prev.map(updateFn));
    setActiveFile(prev => prev ? { ...prev, content: value, isDirty: true } : null);

    broadcastTyping(true);
    resetIdleTimers();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!roomId || !user) return;
      const fileId = activeFile.id;
      localSyncedFiles.current.add(fileId);
      try {
        await supabase.from('collaboration_files')
          .update({ content: value, updated_at: new Date().toISOString() })
          .eq('id', fileId);
      } catch (err) {
        console.error('Sync error:', err);
      }
      setTimeout(() => localSyncedFiles.current.delete(fileId), 1500);
      broadcastTyping(false);
    }, 400);
  }, [activeFile, roomId, user, broadcastTyping, resetIdleTimers]);

  const handleSaveFile = useCallback(async () => {
    if (!activeFile || !roomId) return;
    setIsSaving(true);
    try {
      await supabase.from('collaboration_files')
        .update({ content: activeFile.content, updated_at: new Date().toISOString() })
        .eq('id', activeFile.id);
      const clear = (f: RoomFile) => f.id === activeFile.id ? { ...f, isDirty: false } : f;
      setFiles(prev => prev.map(clear));
      setOpenFiles(prev => prev.map(clear));
      setActiveFile(prev => prev ? { ...prev, isDirty: false } : null);
      toast({ title: "Saved", description: `${activeFile.name} saved` });
    } catch { toast({ title: "Error", description: "Save failed", variant: "destructive" }); }
    finally { setIsSaving(false); }
  }, [activeFile, roomId, toast]);

  const handleCreateFile = useCallback(async () => {
    if (!newFileName.trim() || !roomId || !user) return;
    const language = getLanguageFromFileName(newFileName);
    try {
      const { data, error } = await supabase.from('collaboration_files')
        .insert([{ room_id: roomId, name: newFileName, path: `/${newFileName}`, content: '', language, created_by: user.id }])
        .select().single();
      if (error) throw error;
      const file: RoomFile = { id: data.id, name: data.name, path: data.path, content: '', language };
      setFiles(prev => [...prev, file]);
      setOpenFiles(prev => [...prev, file]);
      setActiveFile(file);
      setShowNewFileDialog(false);
      setNewFileName('');
      toast({ title: "Created", description: `${newFileName} created` });
    } catch { toast({ title: "Error", description: "Failed to create file", variant: "destructive" }); }
  }, [newFileName, roomId, user, toast]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    try {
      await supabase.from('collaboration_files').delete().eq('id', fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setOpenFiles(prev => prev.filter(f => f.id !== fileId));
      if (activeFile?.id === fileId) setActiveFile(null);
    } catch { toast({ title: "Error", description: "Delete failed", variant: "destructive" }); }
  }, [activeFile, toast]);

  const handleRunCode = useCallback(async () => {
    if (!activeFile) return;
    setShowTerminal(true);
    setIsRunning(true);
    setTerminalOutput(prev => [...prev, `\n$ run ${activeFile.name}`, '']);
    try {
      const result = await executeCode(activeFile.content, activeFile.language, stdinInput);
      setTerminalOutput(prev => [
        ...prev,
        result.success
          ? `✓ Done (${result.executionTime}ms)\n${result.output}`
          : `✗ Error (${result.executionTime}ms)\n${result.error}`,
        '',
      ]);
    } catch (err) {
      setTerminalOutput(prev => [...prev, `Error: ${err instanceof Error ? err.message : 'Unknown'}`, '']);
    } finally { setIsRunning(false); }
  }, [activeFile, stdinInput]);

  const handleDownloadFile = useCallback(() => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = activeFile.name; a.click();
    URL.revokeObjectURL(url);
  }, [activeFile]);

  const generateInviteCode = useCallback(async () => {
    if (!roomId || !user) return;
    setGeneratingCode(true);
    try {
      const { data: existing } = await supabase.from('room_invitations')
        .select('invite_code').eq('room_id', roomId).maybeSingle();
      if (existing) { setInviteCode(existing.invite_code); }
      else {
        const code = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10).toString()).join('');
        const { data } = await supabase.from('room_invitations')
          .insert([{ room_id: roomId, invite_code: code, created_by: user.id }])
          .select().single();
        if (data) setInviteCode(data.invite_code);
      }
      setShowShareDialog(true);
    } catch { toast({ title: "Error", description: "Failed to generate code", variant: "destructive" }); }
    finally { setGeneratingCode(false); }
  }, [roomId, user, toast]);

  const copyInviteCode = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/collaborate/join?code=${inviteCode}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [inviteCode]);

  const handleCopyRoomId = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(`${window.location.origin}/collaborate/${roomId}`);
    setCopiedRoomId(true);
    setTimeout(() => setCopiedRoomId(false), 2000);
  }, [roomId]);

  const handleDeleteRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      await supabase.from('room_participants').delete().eq('room_id', roomId);
      await supabase.from('collaboration_files').delete().eq('room_id', roomId);
      await supabase.from('collaboration_code').delete().eq('room_id', roomId);
      await supabase.from('room_messages').delete().eq('room_id', roomId);
      await supabase.from('room_invitations').delete().eq('room_id', roomId);
      await supabase.from('collaboration_rooms').delete().eq('id', roomId);
      navigate('/collaborate');
    } catch { toast({ title: "Error", description: "Delete failed", variant: "destructive" }); }
  }, [roomId, navigate, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 's') { e.preventDefault(); handleSaveFile(); }
      if (mod && e.key === 'p') { e.preventDefault(); setShowSearch(true); }
      if (mod && e.key === 'n') { e.preventDefault(); setShowNewFileDialog(true); }
      if (mod && e.key === '`') { e.preventDefault(); setShowTerminal(p => !p); }
      if (mod && e.key === 'b') { e.preventDefault(); setShowSidebar(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSaveFile]);

  // ─── Derived state ─────────────────────────────────
  const isOwner = room?.created_by === user?.id;

  const presenceSummary = useMemo(() => {
    let online = 0, away = 0, offline = 0;
    onlineUsers.forEach(u => {
      if (u.status === 'online') online++;
      else if (u.status === 'away') away++;
      else offline++;
    });
    return { online, away, offline, total: participants.length };
  }, [onlineUsers, participants]);

  const getParticipantStatus = useCallback((userId: string): string => {
    return onlineUsers.get(userId)?.status || 'offline';
  }, [onlineUsers]);

  // ─── Loading / Not Found ────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">Loading collaboration room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Room not found</h1>
          <Button onClick={() => navigate('/collaborate')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      {/* ─── Title Bar ───────────────────────────────── */}
      <div className="h-12 bg-[#323233] border-b border-[#3c3c3c] flex items-center justify-between px-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/collaborate')}
            className="text-gray-300 hover:text-white hover:bg-[#464647] h-8">
            <ArrowLeft className="h-4 w-4 mr-1" /> Exit
          </Button>
          <div className="h-4 w-px bg-[#555]" />
          <Button variant="ghost" size="sm" onClick={() => setShowSidebar(p => !p)}
            className="text-gray-400 hover:text-white hover:bg-[#464647] h-8 w-8 p-0">
            {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <span className="font-semibold text-sm truncate max-w-[200px]">{room.name}</span>
          {room.is_private && (
            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-400 h-5">Private</Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <span className="text-[11px] text-gray-400 animate-pulse mr-2">
              {Array.from(typingUsers).slice(0, 2).join(', ')} typing...
            </span>
          )}

          {/* Presence avatars */}
          <TooltipProvider>
            <div className="flex items-center gap-1 mr-1">
              <Button variant="ghost" size="sm" onClick={() => setShowParticipantsPanel(p => !p)}
                className={cn("h-8 px-2 text-gray-300 hover:text-white hover:bg-[#464647]", showParticipantsPanel && "bg-[#464647]")}>
                <Users className="h-4 w-4 mr-1" />
                <span className="text-xs">
                  <span className="text-emerald-400">{presenceSummary.online}</span>
                  {presenceSummary.away > 0 && <span className="text-amber-400">/{presenceSummary.away}</span>}
                  <span className="text-gray-500">/{presenceSummary.total}</span>
                </span>
              </Button>

              <div className="flex -space-x-1.5 ml-1">
                {participants.slice(0, 5).map(p => {
                  const status = getParticipantStatus(p.user_id);
                  const name = (p.profile as any)?.display_name || (p.profile as any)?.username || 'U';
                  return (
                    <Tooltip key={p.id}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Avatar className="h-7 w-7 border-2 border-[#323233]">
                            <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                              {name[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#323233]",
                            statusColors[status] || statusColors.offline
                          )} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-[#252526] border-[#555] text-white">
                        <p className="font-medium text-sm">{name}</p>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Circle className={cn("h-2 w-2 fill-current", status === 'online' ? 'text-emerald-500' : status === 'away' ? 'text-amber-500' : 'text-gray-500')} />
                          {statusLabels[status]} • {p.role}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {participants.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-[#464647] flex items-center justify-center text-[10px] border-2 border-[#323233]">
                    +{participants.length - 5}
                  </div>
                )}
              </div>
            </div>
          </TooltipProvider>

          <div className="h-4 w-px bg-[#555]" />

          {/* Action buttons */}
          <TooltipProvider>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={generateInviteCode} disabled={generatingCode}
                className="text-gray-300 hover:text-white hover:bg-[#464647] h-8 w-8 p-0">
                {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              </Button>
            </TooltipTrigger><TooltipContent className="bg-[#252526] border-[#555]">Share Room</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => setShowChat(p => !p)}
                className={cn("text-gray-300 hover:text-white hover:bg-[#464647] h-8 w-8 p-0", showChat && "bg-[#464647]")}>
                <MessageSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent className="bg-[#252526] border-[#555]">Chat</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => setShowSearch(true)}
                className="text-gray-300 hover:text-white hover:bg-[#464647] h-8 w-8 p-0">
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent className="bg-[#252526] border-[#555]">Quick Open (⌘P)</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleSaveFile} disabled={!activeFile?.isDirty || isSaving}
                className="text-gray-300 hover:text-white hover:bg-[#464647] h-8 w-8 p-0">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </TooltipTrigger><TooltipContent className="bg-[#252526] border-[#555]">Save (⌘S)</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleRunCode} disabled={!activeFile || isRunning}
                className="text-gray-300 hover:text-white hover:bg-[#464647] h-8 w-8 p-0">
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              </Button>
            </TooltipTrigger><TooltipContent className="bg-[#252526] border-[#555]">Run Code</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => setShowTerminal(p => !p)}
                className={cn("text-gray-300 hover:text-white hover:bg-[#464647] h-8 w-8 p-0", showTerminal && "bg-[#464647]")}>
                <Terminal className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent className="bg-[#252526] border-[#555]">Terminal (⌘`)</TooltipContent></Tooltip>

            {activeFile && (
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleDownloadFile}
                  className="text-gray-300 hover:text-white hover:bg-[#464647] h-8 w-8 p-0">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger><TooltipContent className="bg-[#252526] border-[#555]">Download File</TooltipContent></Tooltip>
            )}
          </TooltipProvider>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-[#464647] h-8 w-8 p-0">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#252526] border-[#555]">
              <DropdownMenuItem className="text-gray-300 hover:bg-[#094771] hover:text-white focus:bg-[#094771] focus:text-white" onClick={handleCopyRoomId}>
                {copiedRoomId ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy Room Link
              </DropdownMenuItem>
              <DropdownMenuItem className="text-gray-300 hover:bg-[#094771] hover:text-white focus:bg-[#094771] focus:text-white" onClick={() => setShowSettingsDialog(true)}>
                <UserCog className="h-4 w-4 mr-2" /> Room Info
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuSeparator className="bg-[#555]" />
                  <DropdownMenuItem className="text-red-400 hover:bg-red-900/30 hover:text-red-300 focus:bg-red-900/30 focus:text-red-300" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Room
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ─── Main Content ────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          {showSidebar && (
            <>
              <ResizablePanel defaultSize={18} minSize={14} maxSize={28}>
                <div className="h-full bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
                  <div className="h-9 flex items-center justify-between px-3 border-b border-[#3c3c3c]">
                    <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Explorer</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white hover:bg-[#37373d]"
                      onClick={() => setShowNewFileDialog(true)}>
                      <FilePlus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="py-1">
                      {files.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <FileCode className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                          <p className="text-xs text-gray-500 mb-2">No files yet</p>
                          <Button variant="ghost" size="sm" onClick={() => setShowNewFileDialog(true)} className="text-gray-400 text-xs">
                            <FilePlus className="h-3.5 w-3.5 mr-1" /> New File
                          </Button>
                        </div>
                      ) : (
                        files.map(file => (
                          <div key={file.id}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-[5px] cursor-pointer hover:bg-[#2a2d2e] group text-[13px]",
                              activeFile?.id === file.id && 'bg-[#37373d]'
                            )}
                            onClick={() => handleFileSelect(file)}>
                            {getFileIcon(file.name, !!file.isFolder)}
                            <span className="text-gray-300 flex-1 truncate">{file.name}</span>
                            {file.isDirty && <Circle className="h-2 w-2 fill-white text-white flex-shrink-0" />}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white hover:bg-[#37373d]"
                                  onClick={e => e.stopPropagation()}>
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-[#3c3c3c] border-[#555]">
                                <DropdownMenuItem className="text-gray-300 hover:bg-[#094771] hover:text-white focus:bg-[#094771] focus:text-white"
                                  onClick={() => handleDeleteFile(file.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Participants panel in sidebar */}
                  {showParticipantsPanel && (
                    <div className="border-t border-[#3c3c3c]">
                      <div className="h-8 flex items-center px-3 border-b border-[#3c3c3c]">
                        <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Participants</span>
                      </div>
                      <ScrollArea className="max-h-[200px]">
                        <div className="py-1">
                          {participants.map(p => {
                            const status = getParticipantStatus(p.user_id);
                            const name = (p.profile as any)?.display_name || (p.profile as any)?.username || 'User';
                            const isMe = p.user_id === user?.id;
                            return (
                              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#2a2d2e]">
                                <div className="relative">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                                      {name[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className={cn(
                                    "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#252526]",
                                    statusColors[status]
                                  )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-300 truncate">{name}</span>
                                    {isMe && <span className="text-[10px] text-gray-500">(you)</span>}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className={cn("text-[10px]",
                                      status === 'online' ? 'text-emerald-400' :
                                      status === 'away' ? 'text-amber-400' : 'text-gray-500'
                                    )}>{statusLabels[status]}</span>
                                    <span className="text-[10px] text-gray-600">• {p.role}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </ResizablePanel>
              <ResizableHandle className="w-[3px] bg-[#3c3c3c] hover:bg-[#094771] transition-colors" />
            </>
          )}

          {/* Editor Area */}
          <ResizablePanel defaultSize={showSidebar ? 82 : 100}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={showTerminal ? 70 : 100}>
                <div className="h-full flex flex-col">
                  {/* Tabs */}
                  {openFiles.length > 0 && (
                    <div className="h-[35px] bg-[#252526] flex items-center overflow-x-auto border-b border-[#3c3c3c] scrollbar-none">
                      {openFiles.map(file => (
                        <div key={file.id}
                          className={cn(
                            "flex items-center gap-1.5 px-3 h-full cursor-pointer border-r border-[#3c3c3c] group min-w-max text-[13px]",
                            activeFile?.id === file.id
                              ? 'bg-[#1e1e1e] border-t-2 border-t-[#094771]'
                              : 'bg-[#2d2d2d] hover:bg-[#2a2d2e]'
                          )}
                          onClick={() => setActiveFile(file)}>
                          {getFileIcon(file.name, false)}
                          <span className="text-gray-300">{file.name}</span>
                          {file.isDirty && <Circle className="h-1.5 w-1.5 fill-white text-white" />}
                          <button
                            className="ml-0.5 p-0.5 rounded hover:bg-[#3c3c3c] opacity-0 group-hover:opacity-100"
                            onClick={e => handleFileClose(file.id, e)}>
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Monaco Editor */}
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
                          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                          fontLigatures: true,
                          minimap: { enabled: true, scale: 2 },
                          lineNumbers: 'on',
                          wordWrap: 'on',
                          automaticLayout: true,
                          scrollBeyondLastLine: false,
                          padding: { top: 12 },
                          cursorBlinking: 'smooth',
                          cursorSmoothCaretAnimation: 'on',
                          smoothScrolling: true,
                          formatOnPaste: true,
                          tabSize: 2,
                          bracketPairColorization: { enabled: true },
                          guides: { bracketPairs: true, indentation: true },
                          renderLineHighlight: 'all',
                          stickyScroll: { enabled: true },
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-gray-600">
                          <FileCode className="h-16 w-16 mx-auto mb-4 opacity-30" />
                          <p className="text-lg mb-1 text-gray-500">No file open</p>
                          <p className="text-sm text-gray-600">Select a file from the explorer or create a new one</p>
                          <div className="mt-4 flex gap-2 justify-center">
                            <Button variant="outline" size="sm" onClick={() => setShowNewFileDialog(true)}
                              className="border-[#555] text-gray-400 hover:bg-[#37373d]">
                              <FilePlus className="h-4 w-4 mr-1" /> New File
                            </Button>
                          </div>
                          <p className="text-[11px] mt-4 text-gray-700">
                            ⌘N New File • ⌘P Quick Open • ⌘S Save • ⌘` Terminal
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
                  <ResizableHandle className="h-[3px] bg-[#3c3c3c] hover:bg-[#094771] transition-colors" />
                  <ResizablePanel defaultSize={30} minSize={15}>
                    <div className="h-full bg-[#1e1e1e] border-t border-[#3c3c3c] flex flex-col">
                      <div className="h-9 bg-[#252526] flex items-center justify-between px-3 border-b border-[#3c3c3c]">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Terminal className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-xs text-gray-300">Terminal</span>
                          </div>
                          <Button variant="ghost" size="sm"
                            className={cn("h-6 px-2 text-[11px]",
                              showStdinPanel ? "text-blue-400 bg-blue-500/10" : "text-gray-400 hover:text-white hover:bg-[#37373d]"
                            )}
                            onClick={() => setShowStdinPanel(!showStdinPanel)}>
                            stdin
                          </Button>
                          <Button variant="ghost" size="sm"
                            className="h-6 px-2 text-[11px] text-gray-400 hover:text-white hover:bg-[#37373d]"
                            onClick={() => setTerminalOutput([])}>
                            <RefreshCw className="h-3 w-3 mr-1" /> Clear
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white hover:bg-[#37373d]"
                          onClick={() => setShowTerminal(false)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {showStdinPanel && (
                        <div className="p-2 border-b border-[#3c3c3c] bg-[#252526]">
                          <Textarea placeholder="stdin input..." value={stdinInput}
                            onChange={e => setStdinInput(e.target.value)}
                            className="font-mono text-xs min-h-[40px] bg-[#1e1e1e] border-[#555] text-gray-300 resize-none" />
                        </div>
                      )}
                      <ScrollArea className="flex-1">
                        <div className="p-3 font-mono text-xs text-gray-300 whitespace-pre-wrap">
                          {terminalOutput.length === 0
                            ? <span className="text-gray-600">Terminal ready. Press Run (▶) to execute code.</span>
                            : terminalOutput.map((line, i) => (
                              <div key={i} className={
                                line.startsWith('✗') || line.startsWith('Error') ? 'text-red-400' :
                                line.startsWith('✓') ? 'text-emerald-400' :
                                line.startsWith('$') ? 'text-blue-400' : ''
                              }>{line || <br />}</div>
                            ))}
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
              <ResizableHandle className="w-[3px] bg-[#3c3c3c] hover:bg-[#094771] transition-colors" />
              <ResizablePanel defaultSize={22} minSize={18} maxSize={35}>
                <RoomChat roomId={roomId || ''} isOpen={showChat} onClose={() => setShowChat(false)} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* ─── Status Bar ──────────────────────────────── */}
      <div className="h-[22px] bg-[#007acc] flex items-center justify-between px-3 text-[11px] text-white/90 flex-shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            <span>Connected</span>
          </div>
          <span>{activeFile?.language || 'No file'}</span>
          {activeFile && <span>Ln {editorCursorInfo.line}, Col {editorCursorInfo.col}</span>}
        </div>
        <div className="flex items-center gap-3">
          {collaborators.length > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{collaborators.length} editing</span>
              <div className="flex -space-x-1 ml-1">
                {collaborators.slice(0, 3).map(c => (
                  <div key={c.id} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold border border-white/40"
                    style={{ backgroundColor: c.color }} title={c.name}>
                    {c.name[0]}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
            <span>{presenceSummary.online} online</span>
          </div>
          <span>UTF-8</span>
          <span>Spaces: 2</span>
        </div>
      </div>

      {/* ─── Dialogs ─────────────────────────────────── */}
      {/* New File */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="bg-[#252526] border-[#555]">
          <DialogHeader>
            <DialogTitle className="text-white">Create New File</DialogTitle>
            <DialogDescription className="text-gray-400">Enter file name with extension</DialogDescription>
          </DialogHeader>
          <Input value={newFileName} onChange={e => setNewFileName(e.target.value)}
            placeholder="index.js" className="bg-[#3c3c3c] border-[#555] text-white"
            autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateFile()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)} className="border-[#555] text-gray-300">Cancel</Button>
            <Button onClick={handleCreateFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Open */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="bg-[#252526] border-[#555] max-w-md">
          <DialogHeader><DialogTitle className="text-white">Quick Open</DialogTitle></DialogHeader>
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search files..." className="bg-[#3c3c3c] border-[#555] text-white" autoFocus />
          <div className="max-h-60 overflow-auto">
            {files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map(file => (
              <div key={file.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#094771] rounded text-[13px]"
                onClick={() => { handleFileSelect(file); setShowSearch(false); setSearchQuery(''); }}>
                {getFileIcon(file.name, false)}
                <span className="text-gray-300">{file.name}</span>
                <span className="text-gray-600 text-xs ml-auto">{file.path}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="bg-[#252526] border-[#555]">
          <DialogHeader>
            <DialogTitle className="text-white">Share Room</DialogTitle>
            <DialogDescription className="text-gray-400">Share this code to invite others</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={inviteCode} readOnly className="font-mono text-lg tracking-widest text-center bg-[#3c3c3c] border-[#555] text-white" />
              <Button onClick={copyInviteCode} variant="outline" className="border-[#555]">
                {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Link: {window.location.origin}/collaborate/join?code={inviteCode}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Room */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#252526] border-[#555]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Room</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete the room, all files, messages and participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#555] text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoom} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Room Info */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="bg-[#252526] border-[#555]">
          <DialogHeader>
            <DialogTitle className="text-white">Room Information</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-gray-500 text-[11px]">Room Name</Label><p className="text-white text-sm">{room?.name}</p></div>
            <div><Label className="text-gray-500 text-[11px]">Visibility</Label><p className="text-white text-sm">{room?.is_private ? 'Private' : 'Public'}</p></div>
            <div><Label className="text-gray-500 text-[11px]">Participants</Label>
              <p className="text-white text-sm">{presenceSummary.total} ({presenceSummary.online} online, {presenceSummary.away} away)</p></div>
            <div><Label className="text-gray-500 text-[11px]">Files</Label><p className="text-white text-sm">{files.length}</p></div>
          </div>
          {room?.description && (
            <div><Label className="text-gray-500 text-[11px]">Description</Label><p className="text-white text-sm">{room.description}</p></div>
          )}
          <DialogFooter><Button onClick={() => setShowSettingsDialog(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollaborationRoom;

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Copy, Play, Download, Settings } from 'lucide-react';
interface User {
  id: string;
  name: string;
  color: string;
}

interface RoomParticipant {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
  } | null;
}

interface CodeEditorProps {
  projectId: string;
  currentUser: User;
  participants: RoomParticipant[];
}
const CodeEditor: React.FC<CodeEditorProps> = ({
  projectId,
  currentUser,
  participants
}) => {
  const { toast } = useToast();
  const [code, setCode] = useState(`// Welcome to SyncRift - Real-time Collaborative Code Editor
// Project ID: ${projectId}

function helloWorld() {
  console.log("Hello from SyncRift!");
  return "Start coding together!";
}

// Try editing this code - changes will sync in real-time
const message = helloWorld();
console.log(message);`);
  const [language, setLanguage] = useState('javascript');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdateBy, setLastUpdateBy] = useState<string>('');
  const channelRef = useRef<any>(null);
  const isUpdatingRef = useRef(false);

  // Convert participants to display users
  const onlineUsers: User[] = participants.map((participant, index) => ({
    id: participant.user_id,
    name: participant.profiles?.display_name || participant.profiles?.username || 'Unknown',
    color: getRandomColor(index)
  }));

  useEffect(() => {
    initializeCodeEditor();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [projectId]);

  function getRandomColor(index: number): string {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    return colors[index % colors.length];
  }
  const initializeCodeEditor = async () => {
    try {
      console.log('Initializing code editor for room:', projectId);
      // Fetch existing code for this room
      const { data: codeData, error } = await supabase
        .from('collaboration_code')
        .select('*')
        .eq('room_id', projectId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        console.error('Error fetching code:', error);
        return;
      } 
      
      if (codeData) {
        console.log('Found existing code:', codeData);
        setCode(codeData.content);
        setLanguage(codeData.language);
      } else {
        console.log('No existing code found, creating initial code');
        // Initialize code for this room if it doesn't exist
        await createInitialCode();
      }

      // Set up real-time subscriptions
      setupRealtimeSubscriptions();
    } catch (error) {
      console.error('Error initializing code editor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createInitialCode = async () => {
    try {
      const { error } = await supabase
        .from('collaboration_code')
        .insert([{
          room_id: projectId,
          content: code,
          language: language,
          updated_by: currentUser.id
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating initial code:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('Setting up real-time subscriptions for code sync');
    const channel = supabase.channel(`code:${projectId}`);

    // Listen for code updates and inserts
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'collaboration_code',
        filter: `room_id=eq.${projectId}`
      },
      (payload) => {
        console.log('Code change received:', payload);
        if (payload.new && !isUpdatingRef.current) {
          const newData = payload.new as any;
          if (newData.content !== undefined) {
            setCode(newData.content);
          }
          if (newData.language !== undefined) {
            setLanguage(newData.language);
          }
          if (newData.updated_by !== undefined) {
            setLastUpdateBy(newData.updated_by);
          }
        }
      }
    );

    channel.subscribe((status) => {
      console.log('Code channel status:', status);
    });
    channelRef.current = channel;
  };

  const handleEditorChange = async (value: string | undefined) => {
    if (value !== undefined && value !== code && !isUpdatingRef.current) {
      setCode(value);
      isUpdatingRef.current = true;

      try {
        // Update code in database
        const { error } = await supabase
          .from('collaboration_code')
          .update({
            content: value,
            updated_by: currentUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('room_id', projectId);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating code:', error);
        toast({
          title: "Error",
          description: "Failed to sync code changes",
          variant: "destructive"
        });
      } finally {
        // Reset flag after a short delay to prevent rapid updates
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    isUpdatingRef.current = true;

    try {
      const { error } = await supabase
        .from('collaboration_code')
        .update({
          language: newLanguage,
          updated_by: currentUser.id,
          updated_at: new Date().toISOString()
        })
        .eq('room_id', projectId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating language:', error);
    } finally {
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  };
  const copyProjectId = () => {
    navigator.clipboard.writeText(projectId);
    // You could show a toast here
  };
  const runCode = () => {
    console.log('Running code:', code);
    // Future: Execute code in sandbox
  };
  const downloadCode = () => {
    const blob = new Blob([code], {
      type: 'text/plain'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${projectId}.${language === 'javascript' ? 'js' : 'py'}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="h-14 bg-secondary border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          
          
          
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground px-0 mx-[25px]" />
            <span className="text-sm text-muted-foreground mx-px px-0 my-0">{onlineUsers.length} online</span>
          </div>
          
          <div className="flex items-center gap-2">
            {onlineUsers.slice(0, 3).map(user => <div key={user.id} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white" style={{
            backgroundColor: user.color
          }} title={user.name}>
                {user.name.charAt(0)}
              </div>)}
            {onlineUsers.length > 3 && <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                +{onlineUsers.length - 3}
              </div>}
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={runCode}>
              <Play className="h-4 w-4 mr-1" />
              Run
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadCode}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 bg-secondary border-r border-border flex flex-col">
          <div className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Online Users</h3>
            <div className="space-y-2">
              {onlineUsers.map(user => <div key={user.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white" style={{
                backgroundColor: user.color
              }}>
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name}
                      {user.id === currentUser.id && ' (You)'}
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>)}
            </div>
          </div>
          
          <Separator />
          
          <div className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Language</h3>
            <select value={language} onChange={e => handleLanguageChange(e.target.value)} className="w-full p-2 bg-background border border-border rounded-md text-sm">
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 bg-background">
          <Editor height="100%" language={language} value={code} onChange={handleEditorChange} theme="vs-dark" options={{
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Monaco, Menlo, "Ubuntu Mono", monospace',
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          minimap: {
            enabled: true
          },
          folding: true,
          lineNumbersMinChars: 3,
          automaticLayout: true,
          wordWrap: 'on',
          tabSize: 2,
          insertSpaces: true
        }} />
        </div>
      </div>
    </div>;
};
export default CodeEditor;
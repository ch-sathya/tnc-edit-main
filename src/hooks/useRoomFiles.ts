import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface RoomFile {
  id: string;
  room_id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export const useRoomFiles = (roomId: string | undefined) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch files from database
  const fetchFiles = useCallback(async () => {
    if (!roomId) return;

    try {
      const { data, error } = await supabase
        .from('collaboration_files')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Create a new file
  const createFile = useCallback(async (name: string, language: string, content: string = '') => {
    if (!roomId || !user) return null;

    try {
      const path = `/${name}`;
      const { data, error } = await supabase
        .from('collaboration_files')
        .insert({
          room_id: roomId,
          name,
          path,
          content,
          language,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setFiles((prev) => [...prev, data]);
      toast({ title: 'File created', description: `${name} has been created` });
      return data;
    } catch (error) {
      console.error('Error creating file:', error);
      toast({ title: 'Failed to create file', variant: 'destructive' });
      return null;
    }
  }, [roomId, user, toast]);

  // Update file content
  const updateFile = useCallback(async (fileId: string, content: string) => {
    if (!roomId) return false;

    try {
      const { error } = await supabase
        .from('collaboration_files')
        .update({ 
          content, 
          updated_at: new Date().toISOString(),
          version: files.find(f => f.id === fileId)?.version! + 1 || 1
        })
        .eq('id', fileId);

      if (error) throw error;

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, content } : f))
      );
      return true;
    } catch (error) {
      console.error('Error updating file:', error);
      return false;
    }
  }, [roomId, files]);

  // Delete a file
  const deleteFile = useCallback(async (fileId: string) => {
    if (!roomId) return false;

    try {
      const { error } = await supabase
        .from('collaboration_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast({ title: 'File deleted' });
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({ title: 'Failed to delete file', variant: 'destructive' });
      return false;
    }
  }, [roomId, toast]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!roomId) return;

    fetchFiles();

    const channel = supabase
      .channel(`room-files-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_files',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newFile = payload.new as RoomFile;
            setFiles((prev) => {
              if (prev.some((f) => f.id === newFile.id)) return prev;
              return [...prev, newFile];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedFile = payload.new as RoomFile;
            setFiles((prev) =>
              prev.map((f) => (f.id === updatedFile.id ? updatedFile : f))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setFiles((prev) => prev.filter((f) => f.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchFiles]);

  return {
    files,
    loading,
    createFile,
    updateFile,
    deleteFile,
    refetch: fetchFiles,
  };
};

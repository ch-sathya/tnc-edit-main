import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CodeUpdate {
  content: string;
  language: string;
  updated_by: string;
  updated_at: string;
}

export const useRealtimeCode = (roomId: string | undefined, fileId: string | undefined) => {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isSyncing, setIsSyncing] = useState(false);
  const lastUpdateRef = useRef<string>('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial code
  useEffect(() => {
    if (!roomId) return;

    const fetchCode = async () => {
      const { data } = await supabase
        .from('collaboration_code')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();

      if (data) {
        setCode(data.content);
        setLanguage(data.language);
        lastUpdateRef.current = data.content;
      }
    };

    fetchCode();
  }, [roomId]);

  // Subscribe to realtime code changes
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`room-code-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collaboration_code',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const update = payload.new as any;
          // Only update if this change wasn't made by us
          if (update.updated_by !== user?.id) {
            setCode(update.content);
            setLanguage(update.language);
            lastUpdateRef.current = update.content;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user?.id]);

  // Broadcast code changes with debounce
  const updateCode = useCallback(async (newContent: string, newLanguage?: string) => {
    if (!roomId || !user) return;

    setCode(newContent);
    if (newLanguage) setLanguage(newLanguage);

    // Debounce the database update
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (newContent === lastUpdateRef.current) return;
      
      setIsSyncing(true);
      try {
        // Check if code record exists
        const { data: existingCode } = await supabase
          .from('collaboration_code')
          .select('id')
          .eq('room_id', roomId)
          .maybeSingle();

        if (existingCode) {
          await supabase
            .from('collaboration_code')
            .update({
              content: newContent,
              language: newLanguage || language,
              updated_by: user.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingCode.id);
        } else {
          await supabase
            .from('collaboration_code')
            .insert({
              room_id: roomId,
              content: newContent,
              language: newLanguage || language,
              updated_by: user.id,
            });
        }

        lastUpdateRef.current = newContent;
      } catch (error) {
        console.error('Error syncing code:', error);
      } finally {
        setIsSyncing(false);
      }
    }, 300); // 300ms debounce
  }, [roomId, user, language]);

  return {
    code,
    language,
    isSyncing,
    updateCode,
    setCode,
  };
};

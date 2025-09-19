-- Add only the missing tables to realtime publication
-- room_participants and chat_messages might not be in realtime yet
DO $$
BEGIN
    -- Try to add room_participants to realtime, ignore if already exists
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, continue
        NULL;
    END;
    
    -- Try to add chat_messages to realtime, ignore if already exists  
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, continue
        NULL;
    END;
END $$;

-- Ensure REPLICA IDENTITY is set for realtime tables
ALTER TABLE public.room_participants REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications for any user"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create room_messages table for in-room chat
CREATE TABLE public.room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.collaboration_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for room messages
CREATE POLICY "Room participants can view messages"
  ON public.room_messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_participants.room_id = room_messages.room_id
    AND room_participants.user_id = auth.uid()
  ));

CREATE POLICY "Room participants can send messages"
  ON public.room_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.room_participants
      WHERE room_participants.room_id = room_messages.room_id
      AND room_participants.user_id = auth.uid()
    )
  );

-- Create collaboration_files table for file persistence
CREATE TABLE public.collaboration_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.collaboration_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT DEFAULT '',
  language TEXT DEFAULT 'javascript',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version INTEGER DEFAULT 1
);

-- Enable RLS
ALTER TABLE public.collaboration_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for collaboration files
CREATE POLICY "Room participants can view files"
  ON public.collaboration_files
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_participants.room_id = collaboration_files.room_id
    AND room_participants.user_id = auth.uid()
  ));

CREATE POLICY "Room participants can create files"
  ON public.collaboration_files
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_participants.room_id = collaboration_files.room_id
    AND room_participants.user_id = auth.uid()
  ));

CREATE POLICY "Room participants can update files"
  ON public.collaboration_files
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_participants.room_id = collaboration_files.room_id
    AND room_participants.user_id = auth.uid()
  ));

CREATE POLICY "Room participants can delete files"
  ON public.collaboration_files
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_participants.room_id = collaboration_files.room_id
    AND room_participants.user_id = auth.uid()
  ));

-- Enable realtime for new tables only
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_files;

-- Create trigger for updated_at on collaboration_files
CREATE TRIGGER update_collaboration_files_updated_at
  BEFORE UPDATE ON public.collaboration_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Security fix: Remove overly permissive INSERT policy on notifications
-- and add proper access validation to SECURITY DEFINER functions

-- 1. Fix notifications INSERT policy - only allow server-side creation via a secure function
DROP POLICY IF EXISTS "System can create notifications for any user" ON public.notifications;

-- Create a secure function for notification creation (to be called from backend/edge functions)
CREATE OR REPLACE FUNCTION public.create_system_notification(
  target_user_id UUID,
  notif_type TEXT,
  notif_title TEXT,
  notif_message TEXT DEFAULT NULL,
  notif_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Validate inputs
  IF target_user_id IS NULL OR notif_type IS NULL OR notif_title IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;
  
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (target_user_id, notif_type, notif_title, notif_message, notif_data)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Grant execute permission only to service role (backend)
REVOKE EXECUTE ON FUNCTION public.create_system_notification FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_system_notification FROM authenticated;

-- 2. Fix SECURITY DEFINER functions with proper access validation

-- Fix get_file_latest_version - add access check
CREATE OR REPLACE FUNCTION public.get_file_latest_version(file_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate caller has access to the file's group
  IF NOT EXISTS (
    SELECT 1 FROM public.collaboration_files cf
    JOIN public.group_memberships gm ON cf.group_id = gm.group_id
    WHERE cf.id = file_uuid 
    AND gm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a group member';
  END IF;

  RETURN (
    SELECT version 
    FROM public.collaboration_files 
    WHERE id = file_uuid
  );
END;
$$;

-- Fix apply_file_changes - add access check
CREATE OR REPLACE FUNCTION public.apply_file_changes(
  file_uuid UUID,
  new_content TEXT,
  change_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_version INTEGER;
BEGIN
  -- Validate caller has access to the file's group
  IF NOT EXISTS (
    SELECT 1 FROM public.collaboration_files cf
    JOIN public.group_memberships gm ON cf.group_id = gm.group_id
    WHERE cf.id = file_uuid 
    AND gm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a group member';
  END IF;

  -- Update file content and increment version
  UPDATE public.collaboration_files 
  SET 
    content = new_content,
    version = version + 1,
    updated_at = now()
  WHERE id = file_uuid
  RETURNING version INTO new_version;
  
  -- Mark all pending changes for this file as applied
  UPDATE public.file_changes 
  SET applied = true 
  WHERE file_id = file_uuid AND applied = false;
  
  RETURN new_version;
END;
$$;

-- Fix get_pending_changes - add access check
CREATE OR REPLACE FUNCTION public.get_pending_changes(file_uuid UUID)
RETURNS TABLE (
  change_id UUID,
  change_user_id UUID,
  change_operation_type TEXT,
  change_position_start INTEGER,
  change_position_end INTEGER,
  change_content TEXT,
  change_version INTEGER,
  change_timestamp TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate caller has access to the file's group
  IF NOT EXISTS (
    SELECT 1 FROM public.collaboration_files cf
    JOIN public.group_memberships gm ON cf.group_id = gm.group_id
    WHERE cf.id = file_uuid 
    AND gm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a group member';
  END IF;

  RETURN QUERY
  SELECT 
    fc.id,
    fc.user_id,
    fc.operation_type,
    fc.position_start,
    fc.position_end,
    fc.content,
    fc.version,
    fc.timestamp
  FROM public.file_changes fc
  WHERE fc.file_id = file_uuid
  AND fc.applied = false
  ORDER BY fc.timestamp ASC;
END;
$$;

-- Fix update_session_activity - add access check
CREATE OR REPLACE FUNCTION public.update_session_activity(
  group_uuid UUID,
  session_user_id UUID,
  file_uuid UUID DEFAULT NULL,
  cursor_pos JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate caller is member of the group and updating their own session
  IF session_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: cannot update another user session';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = group_uuid 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a group member';
  END IF;

  INSERT INTO public.collaboration_sessions (
    group_id, 
    user_id, 
    current_file_id, 
    cursor_position, 
    last_activity
  )
  VALUES (
    group_uuid, 
    session_user_id, 
    file_uuid, 
    cursor_pos, 
    now()
  )
  ON CONFLICT (group_id, user_id) 
  DO UPDATE SET
    current_file_id = COALESCE(file_uuid, collaboration_sessions.current_file_id),
    cursor_position = COALESCE(cursor_pos, collaboration_sessions.cursor_position),
    last_activity = now(),
    status = 'online';
END;
$$;
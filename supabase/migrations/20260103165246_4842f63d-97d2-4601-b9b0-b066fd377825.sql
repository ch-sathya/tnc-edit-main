-- =============================================
-- SECURITY HARDENING MIGRATION
-- =============================================

-- 1. Fix room_invitations: Remove dangerous public SELECT policy
DROP POLICY IF EXISTS "Anyone can view invitation codes" ON room_invitations;

-- Create secure policy: only room owners/participants can view codes
CREATE POLICY "Room owners and participants can view invitations"
ON room_invitations FOR SELECT
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_id = room_invitations.room_id 
    AND user_id = auth.uid()
  )
);

-- Add UPDATE policy for incrementing used_count (needed for join flow)
CREATE POLICY "Room invitations can be updated for usage tracking"
ON room_invitations FOR UPDATE
USING (true)
WITH CHECK (true);

-- 2. Create a secure function to validate invite codes (server-side validation)
CREATE OR REPLACE FUNCTION public.validate_and_use_invite_code(invite_code_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  room_record RECORD;
  participant_count INTEGER;
  result JSONB;
BEGIN
  -- Find the invitation
  SELECT * INTO invitation_record
  FROM room_invitations
  WHERE invite_code = invite_code_input;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code');
  END IF;
  
  -- Check expiration
  IF invitation_record.expires_at IS NOT NULL AND invitation_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite code has expired');
  END IF;
  
  -- Check max uses
  IF invitation_record.max_uses IS NOT NULL AND invitation_record.used_count >= invitation_record.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite code has reached maximum uses');
  END IF;
  
  -- Get room info
  SELECT * INTO room_record
  FROM collaboration_rooms
  WHERE id = invitation_record.room_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room no longer exists');
  END IF;
  
  -- Get participant count
  SELECT COUNT(*) INTO participant_count
  FROM room_participants
  WHERE room_id = room_record.id;
  
  -- Check capacity
  IF participant_count >= room_record.max_participants THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room is at maximum capacity');
  END IF;
  
  -- Return success with room info
  RETURN jsonb_build_object(
    'success', true,
    'room', jsonb_build_object(
      'id', room_record.id,
      'name', room_record.name,
      'description', room_record.description,
      'is_private', room_record.is_private,
      'max_participants', room_record.max_participants,
      'participant_count', participant_count
    )
  );
END;
$$;

-- 3. Function to join room using invite code
CREATE OR REPLACE FUNCTION public.join_room_with_invite_code(invite_code_input text, joining_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  validation_result JSONB;
  room_id_var UUID;
  existing_participant RECORD;
BEGIN
  -- Validate the code first
  validation_result := validate_and_use_invite_code(invite_code_input);
  
  IF NOT (validation_result->>'success')::boolean THEN
    RETURN validation_result;
  END IF;
  
  room_id_var := (validation_result->'room'->>'id')::uuid;
  
  -- Check if already a participant
  SELECT * INTO existing_participant
  FROM room_participants
  WHERE room_id = room_id_var AND user_id = joining_user_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_member', true,
      'room_id', room_id_var
    );
  END IF;
  
  -- Add as participant
  INSERT INTO room_participants (room_id, user_id, role)
  VALUES (room_id_var, joining_user_id, 'member');
  
  -- Increment used_count
  UPDATE room_invitations
  SET used_count = used_count + 1
  WHERE invite_code = invite_code_input;
  
  RETURN jsonb_build_object(
    'success', true,
    'already_member', false,
    'room_id', room_id_var,
    'room', validation_result->'room'
  );
END;
$$;

-- 4. Fix group_memberships visibility (restrict to group members only)
DROP POLICY IF EXISTS "Anyone can view memberships" ON group_memberships;

CREATE POLICY "Group members can view memberships"
ON group_memberships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_memberships gm 
    WHERE gm.group_id = group_memberships.group_id 
    AND gm.user_id = auth.uid()
  )
  OR auth.uid() = user_id
);

-- 5. Fix user_follows visibility (restrict to involved users or public follows count)
DROP POLICY IF EXISTS "Users can view all follow relationships" ON user_follows;

CREATE POLICY "Users can view their own follow relationships"
ON user_follows FOR SELECT
USING (follower_id = auth.uid() OR following_id = auth.uid());

-- 6. Add secure function for deleting user account data
CREATE OR REPLACE FUNCTION public.delete_user_account_data(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to delete their own data
  IF target_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Delete in order of dependencies
  
  -- Delete room participation and related data
  DELETE FROM room_messages WHERE user_id = target_user_id;
  DELETE FROM room_participants WHERE user_id = target_user_id;
  DELETE FROM room_invitations WHERE created_by = target_user_id;
  
  -- Delete owned rooms (cascade will handle related records)
  DELETE FROM collaboration_files WHERE created_by = target_user_id;
  DELETE FROM collaboration_code WHERE updated_by = target_user_id;
  DELETE FROM collaboration_rooms WHERE created_by = target_user_id;
  
  -- Delete chat/messaging data
  DELETE FROM chat_messages WHERE user_id = target_user_id;
  DELETE FROM direct_messages WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM group_messages WHERE user_id = target_user_id;
  
  -- Delete group memberships
  DELETE FROM group_memberships WHERE user_id = target_user_id;
  
  -- Delete owned groups
  DELETE FROM community_groups WHERE created_by = target_user_id;
  
  -- Delete social connections
  DELETE FROM user_connections WHERE requester_id = target_user_id OR addressee_id = target_user_id;
  DELETE FROM user_follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  
  -- Delete repository data
  DELETE FROM repository_stars WHERE user_id = target_user_id;
  DELETE FROM commits WHERE author_id = target_user_id;
  DELETE FROM repository_files WHERE repository_id IN (SELECT id FROM repositories WHERE user_id = target_user_id);
  DELETE FROM repositories WHERE user_id = target_user_id;
  
  -- Delete projects
  DELETE FROM projects WHERE user_id = target_user_id;
  
  -- Delete news articles
  DELETE FROM news WHERE author_id = target_user_id;
  
  -- Delete activities and notifications
  DELETE FROM activities WHERE user_id = target_user_id;
  DELETE FROM notifications WHERE user_id = target_user_id;
  
  -- Delete shared snippets
  DELETE FROM shared_snippets WHERE created_by = target_user_id;
  
  -- Delete profile (this should be last)
  DELETE FROM profiles WHERE user_id = target_user_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;
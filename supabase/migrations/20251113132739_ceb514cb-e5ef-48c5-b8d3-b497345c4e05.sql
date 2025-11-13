-- Create community_groups table
CREATE TABLE IF NOT EXISTS public.community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  member_count INTEGER DEFAULT 1,
  is_private BOOLEAN DEFAULT false
);

-- Create group_memberships table
CREATE TABLE IF NOT EXISTS public.group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_groups
CREATE POLICY "Anyone can view groups"
  ON public.community_groups FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create groups"
  ON public.community_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups"
  ON public.community_groups FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete their groups"
  ON public.community_groups FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for group_memberships
CREATE POLICY "Anyone can view memberships"
  ON public.group_memberships FOR SELECT
  USING (true);

CREATE POLICY "Users can join groups"
  ON public.group_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON public.group_memberships FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.group_memberships gm
    WHERE gm.group_id = group_memberships.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'owner'
  ));

-- RLS Policies for group_messages
CREATE POLICY "Members can view messages in their groups"
  ON public.group_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_memberships.group_id = group_messages.group_id
    AND group_memberships.user_id = auth.uid()
  ));

CREATE POLICY "Members can send messages in their groups"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.group_memberships
      WHERE group_memberships.group_id = group_messages.group_id
      AND group_memberships.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_groups_created_by ON public.community_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON public.group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON public.group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON public.group_messages(created_at DESC);

-- Trigger to update member count when users join/leave
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_groups
    SET member_count = member_count + 1
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_groups
    SET member_count = member_count - 1
    WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_group_member_count_trigger
AFTER INSERT OR DELETE ON public.group_memberships
FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();

-- Trigger to auto-add creator as owner when group is created
CREATE OR REPLACE FUNCTION public.auto_add_group_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_memberships (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_add_group_creator_trigger
AFTER INSERT ON public.community_groups
FOR EACH ROW EXECUTE FUNCTION public.auto_add_group_creator();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_community_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_community_groups_updated_at
BEFORE UPDATE ON public.community_groups
FOR EACH ROW EXECUTE FUNCTION public.update_community_updated_at();

CREATE TRIGGER update_group_messages_updated_at
BEFORE UPDATE ON public.group_messages
FOR EACH ROW EXECUTE FUNCTION public.update_community_updated_at();
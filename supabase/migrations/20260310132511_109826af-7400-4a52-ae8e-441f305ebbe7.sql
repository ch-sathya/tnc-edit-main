
-- Post flairs for categorization
CREATE TABLE public.post_flairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.community_groups(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Community posts (Reddit-style)
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.community_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  flair_id uuid REFERENCES public.post_flairs(id) ON DELETE SET NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Post comments (threaded)
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Votes (for both posts and comments)
CREATE TABLE public.post_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  vote_type smallint NOT NULL CHECK (vote_type IN (1, -1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id),
  CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Group rules
CREATE TABLE public.group_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.community_groups(id) ON DELETE CASCADE NOT NULL,
  rule_number integer NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.post_flairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_rules ENABLE ROW LEVEL SECURITY;

-- RLS: post_flairs - anyone can view, group owners/admins can manage
CREATE POLICY "Anyone can view flairs" ON public.post_flairs FOR SELECT USING (true);
CREATE POLICY "Group owners can manage flairs" ON public.post_flairs FOR ALL 
  USING (has_group_role(group_id, auth.uid(), ARRAY['owner', 'admin']))
  WITH CHECK (has_group_role(group_id, auth.uid(), ARRAY['owner', 'admin']));

-- RLS: community_posts - members can view and create, authors can update/delete
CREATE POLICY "Anyone can view posts in public groups" ON public.community_posts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM community_groups cg 
    WHERE cg.id = community_posts.group_id 
    AND (cg.is_private = false OR is_group_member(community_posts.group_id, auth.uid()))
  ));

CREATE POLICY "Members can create posts" ON public.community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_group_member(group_id, auth.uid()));

CREATE POLICY "Authors can update their posts" ON public.community_posts FOR UPDATE
  USING (auth.uid() = user_id OR has_group_role(group_id, auth.uid(), ARRAY['owner', 'admin', 'moderator']));

CREATE POLICY "Authors and mods can delete posts" ON public.community_posts FOR DELETE
  USING (auth.uid() = user_id OR has_group_role(group_id, auth.uid(), ARRAY['owner', 'admin', 'moderator']));

-- RLS: post_comments
CREATE POLICY "Anyone can view comments on visible posts" ON public.post_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM community_posts cp
    JOIN community_groups cg ON cg.id = cp.group_id
    WHERE cp.id = post_comments.post_id
    AND (cg.is_private = false OR is_group_member(cp.group_id, auth.uid()))
  ));

CREATE POLICY "Members can create comments" ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM community_posts cp WHERE cp.id = post_comments.post_id AND is_group_member(cp.group_id, auth.uid())
  ));

CREATE POLICY "Authors can update their comments" ON public.post_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authors and mods can delete comments" ON public.post_comments FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM community_posts cp WHERE cp.id = post_comments.post_id 
    AND has_group_role(cp.group_id, auth.uid(), ARRAY['owner', 'admin', 'moderator'])
  ));

-- RLS: post_votes
CREATE POLICY "Anyone can view votes" ON public.post_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON public.post_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their votes" ON public.post_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their votes" ON public.post_votes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS: group_rules
CREATE POLICY "Anyone can view group rules" ON public.group_rules FOR SELECT USING (true);

CREATE POLICY "Group owners can manage rules" ON public.group_rules FOR ALL
  USING (has_group_role(group_id, auth.uid(), ARRAY['owner', 'admin']))
  WITH CHECK (has_group_role(group_id, auth.uid(), ARRAY['owner', 'admin']));

-- Function to update post vote counts
CREATE OR REPLACE FUNCTION public.update_post_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE community_posts SET
        upvotes = (SELECT COUNT(*) FROM post_votes WHERE post_id = NEW.post_id AND vote_type = 1),
        downvotes = (SELECT COUNT(*) FROM post_votes WHERE post_id = NEW.post_id AND vote_type = -1)
      WHERE id = NEW.post_id;
    END IF;
    IF NEW.comment_id IS NOT NULL THEN
      UPDATE post_comments SET
        upvotes = (SELECT COUNT(*) FROM post_votes WHERE comment_id = NEW.comment_id AND vote_type = 1),
        downvotes = (SELECT COUNT(*) FROM post_votes WHERE comment_id = NEW.comment_id AND vote_type = -1)
      WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE community_posts SET
        upvotes = (SELECT COUNT(*) FROM post_votes WHERE post_id = OLD.post_id AND vote_type = 1),
        downvotes = (SELECT COUNT(*) FROM post_votes WHERE post_id = OLD.post_id AND vote_type = -1)
      WHERE id = OLD.post_id;
    END IF;
    IF OLD.comment_id IS NOT NULL THEN
      UPDATE post_comments SET
        upvotes = (SELECT COUNT(*) FROM post_votes WHERE comment_id = OLD.comment_id AND vote_type = 1),
        downvotes = (SELECT COUNT(*) FROM post_votes WHERE comment_id = OLD.comment_id AND vote_type = -1)
      WHERE id = OLD.comment_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_vote_counts
AFTER INSERT OR UPDATE OR DELETE ON public.post_votes
FOR EACH ROW EXECUTE FUNCTION public.update_post_vote_counts();

-- Function to update comment count on posts
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_comment_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();

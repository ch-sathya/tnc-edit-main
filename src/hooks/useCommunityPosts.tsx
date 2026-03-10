import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CommunityPost {
  id: string;
  group_id: string;
  user_id: string;
  title: string;
  content: string | null;
  flair_id: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  flair?: {
    id: string;
    name: string;
    color: string;
  } | null;
  user_vote?: number | null; // 1, -1, or null
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  author?: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  user_vote?: number | null;
  replies?: PostComment[];
}

export interface PostFlair {
  id: string;
  group_id: string;
  name: string;
  color: string;
}

export interface GroupRule {
  id: string;
  group_id: string;
  rule_number: number;
  title: string;
  description: string | null;
}

// Fetch posts for a group
export const useCommunityPosts = (groupId: string, sortBy: 'hot' | 'new' | 'top' = 'hot') => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['community-posts', groupId, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('community_posts')
        .select('*')
        .eq('group_id', groupId);

      if (sortBy === 'new') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'top') {
        query = query.order('upvotes', { ascending: false });
      } else {
        // Hot: combination of recency and votes
        query = query.order('is_pinned', { ascending: false })
                     .order('created_at', { ascending: false });
      }

      const { data: posts, error } = await query.limit(50);
      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      // Fetch authors
      const userIds = [...new Set(posts.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      // Fetch flairs
      const flairIds = posts.map(p => p.flair_id).filter(Boolean) as string[];
      let flairs: any[] = [];
      if (flairIds.length > 0) {
        const { data } = await supabase
          .from('post_flairs')
          .select('*')
          .in('id', flairIds);
        flairs = data || [];
      }

      // Fetch user votes
      let userVotes: any[] = [];
      if (user) {
        const postIds = posts.map(p => p.id);
        const { data } = await supabase
          .from('post_votes')
          .select('post_id, vote_type')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        userVotes = data || [];
      }

      return posts.map(post => ({
        ...post,
        author: profiles?.find(p => p.user_id === post.user_id),
        flair: flairs.find(f => f.id === post.flair_id) || null,
        user_vote: userVotes.find(v => v.post_id === post.id)?.vote_type || null,
      })) as CommunityPost[];
    },
    enabled: !!groupId,
  });
};

// Fetch comments for a post
export const usePostComments = (postId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!comments || comments.length === 0) return [];

      const userIds = [...new Set(comments.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      let userVotes: any[] = [];
      if (user) {
        const commentIds = comments.map(c => c.id);
        const { data } = await supabase
          .from('post_votes')
          .select('comment_id, vote_type')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);
        userVotes = data || [];
      }

      const enriched = comments.map(c => ({
        ...c,
        author: profiles?.find(p => p.user_id === c.user_id),
        user_vote: userVotes.find(v => v.comment_id === c.id)?.vote_type || null,
      }));

      // Build thread tree
      const topLevel: PostComment[] = [];
      const byId: Record<string, PostComment> = {};
      enriched.forEach(c => { byId[c.id] = { ...c, replies: [] }; });
      enriched.forEach(c => {
        if (c.parent_id && byId[c.parent_id]) {
          byId[c.parent_id].replies!.push(byId[c.id]);
        } else {
          topLevel.push(byId[c.id]);
        }
      });

      return topLevel;
    },
    enabled: !!postId,
  });
};

// Create post
export const useCreatePost = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { group_id: string; title: string; content?: string; flair_id?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('community_posts')
        .insert([{ ...params, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['community-posts', data.group_id] });
    },
  });
};

// Create comment
export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { post_id: string; content: string; parent_id?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('post_comments')
        .insert([{ ...params, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', data.post_id] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
  });
};

// Vote on post or comment
export const useVote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { post_id?: string; comment_id?: string; vote_type: 1 | -1 }) => {
      if (!user) throw new Error('Not authenticated');

      // Check for existing vote
      let existingQuery = supabase.from('post_votes').select('*').eq('user_id', user.id);
      if (params.post_id) existingQuery = existingQuery.eq('post_id', params.post_id);
      if (params.comment_id) existingQuery = existingQuery.eq('comment_id', params.comment_id);
      
      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        if (existing.vote_type === params.vote_type) {
          // Remove vote (toggle off)
          const { error } = await supabase.from('post_votes').delete().eq('id', existing.id);
          if (error) throw error;
          return { action: 'removed' };
        } else {
          // Change vote
          const { error } = await supabase.from('post_votes')
            .update({ vote_type: params.vote_type })
            .eq('id', existing.id);
          if (error) throw error;
          return { action: 'changed' };
        }
      } else {
        // New vote
        const { error } = await supabase.from('post_votes').insert([{
          user_id: user.id,
          post_id: params.post_id || null,
          comment_id: params.comment_id || null,
          vote_type: params.vote_type,
        }]);
        if (error) throw error;
        return { action: 'voted' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      queryClient.invalidateQueries({ queryKey: ['post-comments'] });
    },
  });
};

// Toggle pin post
export const useTogglePinPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { postId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('community_posts')
        .update({ is_pinned: !params.isPinned })
        .eq('id', params.postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
  });
};

// Toggle lock post
export const useToggleLockPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { postId: string; isLocked: boolean }) => {
      const { error } = await supabase
        .from('community_posts')
        .update({ is_locked: !params.isLocked })
        .eq('id', params.postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
  });
};

// Delete post
export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('community_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
  });
};

// Fetch flairs for a group
export const useGroupFlairs = (groupId: string) => {
  return useQuery({
    queryKey: ['group-flairs', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_flairs')
        .select('*')
        .eq('group_id', groupId);
      if (error) throw error;
      return (data || []) as PostFlair[];
    },
    enabled: !!groupId,
  });
};

// Fetch group rules
export const useGroupRules = (groupId: string) => {
  return useQuery({
    queryKey: ['group-rules', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_rules')
        .select('*')
        .eq('group_id', groupId)
        .order('rule_number', { ascending: true });
      if (error) throw error;
      return (data || []) as GroupRule[];
    },
    enabled: !!groupId,
  });
};

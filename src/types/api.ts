// API and React Query related types

import type { 
  CommunityGroup, 
  GroupMessage, 
  NewsArticle, 
  CommunityGroupWithDetails,
  GroupMessageWithUser,
  NewsArticleWithAuthor 
} from './community';

// ============================================================================
// React Query Keys
// ============================================================================

export const queryKeys = {
  // Community Groups
  groups: ['groups'] as const,
  group: (id: string) => ['groups', id] as const,
  groupMembers: (groupId: string) => ['groups', groupId, 'members'] as const,
  userGroups: (userId: string) => ['users', userId, 'groups'] as const,
  
  // Group Messages
  groupMessages: (groupId: string) => ['groups', groupId, 'messages'] as const,
  
  // News
  news: ['news'] as const,
  newsArticle: (id: string) => ['news', id] as const,
  newsByCategory: (category: string) => ['news', 'category', category] as const,
  newsInfinite: (options?: NewsQueryOptions) => ['news', 'infinite', options] as const,
  newsFeatured: ['news', 'featured'] as const,
} as const;

// ============================================================================
// Mutation Types
// ============================================================================

export interface CreateGroupMutation {
  name: string;
  description: string;
}

export interface JoinGroupMutation {
  groupId: string;
}

export interface LeaveGroupMutation {
  groupId: string;
}

export interface DeleteGroupMutation {
  groupId: string;
}

export interface SendMessageMutation {
  groupId: string;
  content: string;
}

// ============================================================================
// Query Options Types
// ============================================================================

export interface GroupsQueryOptions {
  userId?: string;
  includeUserMembership?: boolean;
  limit?: number;
  offset?: number;
}

export interface MessagesQueryOptions {
  groupId: string;
  limit?: number;
  offset?: number;
  before?: string; // timestamp for pagination
}

export interface NewsQueryOptions {
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  tags?: string[];
}

// ============================================================================
// Supabase Query Response Types
// ============================================================================

export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
}

export interface SupabaseListResponse<T> {
  data: T[] | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
  count?: number;
}

// ============================================================================
// Real-time Payload Types
// ============================================================================

export interface RealtimePayload<T = any> {
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  new: T | null;
  old: T | null;
}

export type GroupMessagePayload = RealtimePayload<GroupMessage>;
export type GroupMembershipPayload = RealtimePayload<{ group_id: string; user_id: string; joined_at: string }>;

// ============================================================================
// Form Validation Types
// ============================================================================

export interface FormErrors {
  [key: string]: string | undefined;
}

export interface CreateGroupFormErrors {
  name?: string;
  description?: string;
  general?: string;
}

export interface SendMessageFormErrors {
  content?: string;
  general?: string;
}

// ============================================================================
// Component Prop Types
// ============================================================================

export interface GroupListProps {
  groups: CommunityGroupWithDetails[];
  loading?: boolean;
  onJoinGroup: (groupId: string) => void;
  onLeaveGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onSelectGroup: (groupId: string) => void;
  currentUserId?: string;
}

export interface GroupChatProps {
  groupId: string;
  messages: GroupMessageWithUser[];
  loading?: boolean;
  onSendMessage: (content: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  currentUserId?: string;
}

export interface NewsFeedProps {
  articles: NewsArticleWithAuthor[];
  loading?: boolean;
  onSelectArticle: (articleId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

// ============================================================================
// Navigation Types
// ============================================================================

export interface CommunityRouteParams {
  groupId?: string;
}

export interface NewsRouteParams {
  articleId?: string;
}

// ============================================================================
// Storage Types (for caching)
// ============================================================================

export interface CachedGroup extends CommunityGroup {
  cachedAt: string;
  memberCount: number;
}

export interface CachedMessage extends GroupMessage {
  cachedAt: string;
  status: 'sent' | 'sending' | 'failed';
}

export interface CachedArticle extends NewsArticle {
  cachedAt: string;
  readAt?: string;
}
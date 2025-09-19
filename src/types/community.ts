import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Base types from Supabase
export type CommunityGroupRow = Tables<'community_groups'>;
export type GroupMembershipRow = Tables<'group_memberships'>;
export type GroupMessageRow = Tables<'group_messages'>;
export type CommunityGroupInsert = TablesInsert<'community_groups'>;
export type CommunityGroupUpdate = TablesUpdate<'community_groups'>;
export type GroupMembershipInsert = TablesInsert<'group_memberships'>;
export type GroupMessageInsert = TablesInsert<'group_messages'>;
export type GroupMessageUpdate = TablesUpdate<'group_messages'>;

// Enhanced types with computed fields
export interface CommunityGroup extends CommunityGroupRow {
  member_count?: number;
  is_member?: boolean;
  is_owner?: boolean;
}

export interface GroupMembership extends GroupMembershipRow {
  group?: CommunityGroupRow;
  user_profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface GroupMessage extends GroupMessageRow {
  user_profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// API response types
export interface CommunityGroupsResponse {
  groups: CommunityGroup[];
  total: number;
}

export interface GroupMessagesResponse {
  messages: GroupMessage[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface CreateGroupRequest {
  name: string;
  description: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface SendMessageRequest {
  content: string;
  group_id: string;
}

export interface MessagePaginationOptions {
  limit?: number;
  cursor?: string;
  before?: string; // For loading older messages
}

// News types
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  published_at: string;
  source_url: string;
  category: 'tech' | 'software' | 'development' | 'industry';
  tags?: string[];
  image_url?: string;
  read_time?: number; // estimated read time in minutes
}

export interface NewsArticleWithAuthor extends NewsArticle {
  author_profile?: {
    name: string;
    avatar_url?: string;
    bio?: string;
  };
}

export interface NewsResponse {
  articles: NewsArticle[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface NewsQueryOptions {
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  tags?: string[];
  cursor?: string;
}

// Error types
export interface CommunityGroupError {
  message: string;
  code?: string;
  details?: any;
}

export interface NewsError {
  message: string;
  code?: string;
  details?: any;
}
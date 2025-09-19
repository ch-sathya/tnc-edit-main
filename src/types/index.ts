// Re-export all types for easy importing
export * from './community';
export * from './api';
export * from './collaboration';

// Re-export Supabase types that might be needed
export type { Database, Tables, TablesInsert, TablesUpdate } from '../integrations/supabase/types';

// Export specific news types for convenience
export type {
  NewsArticle,
  NewsArticleWithAuthor,
  NewsResponse,
  NewsQueryOptions,
  NewsError
} from './community';
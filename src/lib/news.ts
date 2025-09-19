import type { 
  NewsArticle, 
  NewsResponse,
  NewsQueryOptions,
  NewsError
} from '@/types/community';

class NewsErrorClass extends Error implements NewsError {
  code?: string;
  details?: any;

  constructor(error: NewsError) {
    super(error.message);
    this.name = 'NewsError';
    this.code = error.code;
    this.details = error.details;
  }
}

// Cache for news articles to reduce API calls
const newsCache = new Map<string, { data: NewsResponse; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if cached data is still valid
 */
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION;
};

/**
 * Generate cache key from query options
 */
const getCacheKey = (options: NewsQueryOptions = {}): string => {
  return JSON.stringify({
    category: options.category,
    featured: options.featured,
    limit: options.limit,
    offset: options.offset,
    search: options.search,
    tags: options.tags?.sort(),
    cursor: options.cursor
  });
};

/**
 * Mock news data for development - replace with real API integration
 */
const generateMockNews = (options: NewsQueryOptions = {}): NewsResponse => {
  const mockArticles: NewsArticle[] = [
    {
      id: '1',
      title: 'React 19 Released: New Features and Breaking Changes',
      summary: 'React 19 introduces server components, improved concurrent features, and new hooks that will change how we build React applications.',
      content: 'React 19 has been officially released with significant improvements to server-side rendering, concurrent features, and developer experience. The new version includes server components that run on the server, reducing bundle size and improving performance. Key features include: automatic batching improvements, new useId hook for generating unique IDs, and enhanced Suspense boundaries. Breaking changes include removal of deprecated APIs and changes to the React.StrictMode behavior. Developers should review the migration guide before upgrading existing applications.',
      author: 'React Team',
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      source_url: 'https://react.dev/blog/2024/react-19-release',
      category: 'tech',
      tags: ['react', 'javascript', 'frontend', 'web-development'],
      image_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop',
      read_time: 8
    },
    {
      id: '2',
      title: 'TypeScript 5.4 Brings Performance Improvements',
      summary: 'The latest TypeScript release focuses on compilation speed and memory usage optimizations for large codebases.',
      content: 'TypeScript 5.4 delivers substantial performance improvements, particularly for large monorepos and complex type systems. The release includes faster type checking, reduced memory consumption, and improved IntelliSense responsiveness. New features include better inference for mapped types, enhanced template literal type checking, and improved error messages. The TypeScript team has also introduced experimental support for ECMAScript decorators and better integration with modern bundlers.',
      author: 'TypeScript Team',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      source_url: 'https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/',
      category: 'software',
      tags: ['typescript', 'javascript', 'programming', 'microsoft'],
      image_url: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=400&fit=crop',
      read_time: 6
    },
    {
      id: '3',
      title: 'Vite 5.0: The Future of Frontend Tooling',
      summary: 'Vite 5.0 introduces new plugin architecture, improved HMR, and better support for modern JavaScript frameworks.',
      content: 'Vite 5.0 represents a major milestone in frontend build tooling, offering unprecedented development speed and production optimization. The new version features a redesigned plugin system that allows for better extensibility and performance. Hot Module Replacement (HMR) has been significantly improved, providing near-instantaneous updates during development. The release also includes better support for CSS modules, improved tree-shaking, and enhanced compatibility with various JavaScript frameworks including React, Vue, and Svelte.',
      author: 'Evan You',
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      source_url: 'https://vitejs.dev/blog/announcing-vite5',
      category: 'development',
      tags: ['vite', 'build-tools', 'frontend', 'javascript'],
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop',
      read_time: 7
    },
    {
      id: '4',
      title: 'AI-Powered Code Review: GitHub Copilot Enterprise',
      summary: 'GitHub announces enterprise features for Copilot, including automated code reviews and security vulnerability detection.',
      content: 'GitHub has unveiled Copilot Enterprise, bringing AI-powered development tools to large organizations. The enterprise version includes automated code review capabilities that can identify potential bugs, security vulnerabilities, and code quality issues before they reach production. New features include context-aware suggestions based on company codebases, automated documentation generation, and integration with existing CI/CD pipelines. The service also provides detailed analytics on code quality improvements and developer productivity metrics.',
      author: 'GitHub Team',
      published_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      source_url: 'https://github.blog/2024-copilot-enterprise-announcement',
      category: 'industry',
      tags: ['github', 'ai', 'copilot', 'enterprise', 'code-review'],
      image_url: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=400&fit=crop',
      read_time: 5
    },
    {
      id: '5',
      title: 'Supabase Introduces Real-time Vector Search',
      summary: 'The open-source Firebase alternative adds vector database capabilities for AI-powered applications.',
      content: 'Supabase has launched vector search capabilities, enabling developers to build AI-powered applications with semantic search, recommendation systems, and similarity matching. The new feature integrates PostgreSQL\'s pgvector extension with Supabase\'s real-time infrastructure, allowing for instant updates to vector embeddings. This makes it easier to build applications that require natural language processing, image similarity search, or content recommendation engines. The feature includes built-in support for popular embedding models and automatic indexing for optimal performance.',
      author: 'Supabase Team',
      published_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago
      source_url: 'https://supabase.com/blog/vector-search-announcement',
      category: 'tech',
      tags: ['supabase', 'vector-search', 'ai', 'database', 'postgresql'],
      image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
      read_time: 9
    },
    {
      id: '6',
      title: 'Web Components: The Native Alternative to Frameworks',
      summary: 'Modern browsers now fully support Web Components, offering a framework-agnostic approach to building reusable UI elements.',
      content: 'Web Components have reached maturity with universal browser support, providing developers with a native way to create reusable, encapsulated UI elements without framework dependencies. The technology stack includes Custom Elements, Shadow DOM, and HTML Templates, enabling true component isolation and reusability across different projects and frameworks. Major companies like Google, Microsoft, and Adobe are adopting Web Components for their design systems, demonstrating the technology\'s enterprise readiness. This approach offers long-term stability and reduces vendor lock-in compared to framework-specific solutions.',
      author: 'Web Standards Community',
      published_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      source_url: 'https://web.dev/web-components-update-2024',
      category: 'development',
      tags: ['web-components', 'web-standards', 'javascript', 'html', 'css'],
      image_url: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800&h=400&fit=crop',
      read_time: 11
    }
  ];

  // Apply filters
  let filteredArticles = [...mockArticles];

  if (options.category) {
    filteredArticles = filteredArticles.filter(article => article.category === options.category);
  }

  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filteredArticles = filteredArticles.filter(article => 
      article.title.toLowerCase().includes(searchLower) ||
      article.summary.toLowerCase().includes(searchLower) ||
      article.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  if (options.tags && options.tags.length > 0) {
    filteredArticles = filteredArticles.filter(article =>
      options.tags!.some(tag => article.tags?.includes(tag))
    );
  }

  // Sort by publication date (newest first)
  filteredArticles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  // Apply pagination
  const limit = options.limit || 10;
  const offset = options.offset || 0;
  const startIndex = offset;
  const endIndex = startIndex + limit;
  const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

  return {
    articles: paginatedArticles,
    total: filteredArticles.length,
    hasMore: endIndex < filteredArticles.length,
    nextCursor: endIndex < filteredArticles.length ? endIndex.toString() : undefined
  };
};

/**
 * Fetch news articles with caching
 */
export const fetchNews = async (options: NewsQueryOptions = {}): Promise<NewsResponse> => {
  try {
    const cacheKey = getCacheKey(options);
    const cached = newsCache.get(cacheKey);

    // Return cached data if valid
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data;
    }

    // For now, use mock data. In production, this would call a real news API
    // Example: const response = await fetch(`${NEWS_API_URL}/articles?${queryParams}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

    const newsData = generateMockNews(options);

    // Cache the result
    newsCache.set(cacheKey, {
      data: newsData,
      timestamp: Date.now()
    });

    return newsData;
  } catch (error) {
    throw new NewsErrorClass({
      message: 'Failed to fetch news articles',
      code: 'FETCH_NEWS_ERROR',
      details: error
    });
  }
};

/**
 * Fetch a single news article by ID
 */
export const fetchNewsArticle = async (articleId: string): Promise<NewsArticle | null> => {
  try {
    // In a real implementation, this would fetch from an API
    // For now, we'll get it from our mock data
    const allNews = await fetchNews({ limit: 100 }); // Get all articles
    const article = allNews.articles.find(a => a.id === articleId);
    
    if (!article) {
      return null;
    }

    return article;
  } catch (error) {
    throw new NewsErrorClass({
      message: 'Failed to fetch news article',
      code: 'FETCH_ARTICLE_ERROR',
      details: error
    });
  }
};

/**
 * Fetch featured news articles
 */
export const fetchFeaturedNews = async (limit: number = 5): Promise<NewsArticle[]> => {
  try {
    const newsData = await fetchNews({ limit, featured: true });
    return newsData.articles;
  } catch (error) {
    throw new NewsErrorClass({
      message: 'Failed to fetch featured news',
      code: 'FETCH_FEATURED_ERROR',
      details: error
    });
  }
};

/**
 * Search news articles
 */
export const searchNews = async (
  query: string, 
  options: Omit<NewsQueryOptions, 'search'> = {}
): Promise<NewsResponse> => {
  try {
    return await fetchNews({ ...options, search: query });
  } catch (error) {
    throw new NewsErrorClass({
      message: 'Failed to search news articles',
      code: 'SEARCH_NEWS_ERROR',
      details: error
    });
  }
};

/**
 * Clear news cache (useful for manual refresh)
 */
export const clearNewsCache = (): void => {
  newsCache.clear();
};

/**
 * Get cache statistics (for debugging)
 */
export const getNewsCacheStats = () => {
  return {
    size: newsCache.size,
    keys: Array.from(newsCache.keys()),
    totalMemory: JSON.stringify(Array.from(newsCache.values())).length
  };
};
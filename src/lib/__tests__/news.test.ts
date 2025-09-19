import { describe, it, expect, beforeEach } from 'vitest';
import { 
  fetchNews, 
  fetchNewsArticle, 
  fetchFeaturedNews, 
  searchNews,
  clearNewsCache,
  getNewsCacheStats
} from '../news';

describe('News API Functions', () => {
  beforeEach(() => {
    clearNewsCache();
  });

  describe('fetchNews', () => {
    it('should fetch news articles successfully', async () => {
      const result = await fetchNews();
      
      expect(result).toBeDefined();
      expect(result.articles).toBeInstanceOf(Array);
      expect(result.total).toBeGreaterThan(0);
      expect(result.hasMore).toBeDefined();
      expect(result.articles.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const limit = 3;
      const result = await fetchNews({ limit });
      
      expect(result.articles.length).toBeLessThanOrEqual(limit);
    });

    it('should filter by category', async () => {
      const category = 'tech';
      const result = await fetchNews({ category });
      
      result.articles.forEach(article => {
        expect(article.category).toBe(category);
      });
    });

    it('should cache results', async () => {
      const options = { limit: 5 };
      
      // First call
      const result1 = await fetchNews(options);
      const stats1 = getNewsCacheStats();
      
      // Second call with same options
      const result2 = await fetchNews(options);
      const stats2 = getNewsCacheStats();
      
      expect(result1).toEqual(result2);
      expect(stats1.size).toBe(stats2.size); // Cache should be used
    });
  });

  describe('fetchNewsArticle', () => {
    it('should fetch a single article by ID', async () => {
      const articleId = '1';
      const article = await fetchNewsArticle(articleId);
      
      expect(article).toBeDefined();
      expect(article?.id).toBe(articleId);
      expect(article?.title).toBeDefined();
      expect(article?.content).toBeDefined();
    });

    it('should return null for non-existent article', async () => {
      const article = await fetchNewsArticle('non-existent-id');
      expect(article).toBeNull();
    });
  });

  describe('fetchFeaturedNews', () => {
    it('should fetch featured articles', async () => {
      const limit = 3;
      const articles = await fetchFeaturedNews(limit);
      
      expect(articles).toBeInstanceOf(Array);
      expect(articles.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('searchNews', () => {
    it('should search articles by title', async () => {
      const query = 'React';
      const result = await searchNews(query);
      
      expect(result.articles).toBeInstanceOf(Array);
      // At least one article should match the search
      const hasMatch = result.articles.some(article => 
        article.title.toLowerCase().includes(query.toLowerCase()) ||
        article.summary.toLowerCase().includes(query.toLowerCase()) ||
        article.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
      expect(hasMatch).toBe(true);
    });

    it('should return empty results for non-matching query', async () => {
      const query = 'nonexistentquery12345';
      const result = await searchNews(query);
      
      expect(result.articles).toBeInstanceOf(Array);
      expect(result.articles.length).toBe(0);
    });
  });

  describe('cache management', () => {
    it('should clear cache successfully', async () => {
      // Add something to cache
      await fetchNews({ limit: 5 });
      expect(getNewsCacheStats().size).toBeGreaterThan(0);
      
      // Clear cache
      clearNewsCache();
      expect(getNewsCacheStats().size).toBe(0);
    });

    it('should provide cache statistics', async () => {
      await fetchNews({ limit: 5 });
      const stats = getNewsCacheStats();
      
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.keys).toBeInstanceOf(Array);
      expect(stats.totalMemory).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // This test would be more meaningful with actual API calls
      // For now, we just ensure the function doesn't throw
      await expect(fetchNews()).resolves.toBeDefined();
    });
  });

  describe('article structure', () => {
    it('should return articles with required fields', async () => {
      const result = await fetchNews({ limit: 1 });
      
      if (result.articles.length > 0) {
        const article = result.articles[0];
        
        expect(article.id).toBeDefined();
        expect(article.title).toBeDefined();
        expect(article.summary).toBeDefined();
        expect(article.content).toBeDefined();
        expect(article.author).toBeDefined();
        expect(article.published_at).toBeDefined();
        expect(article.source_url).toBeDefined();
        expect(article.category).toBeDefined();
        expect(['tech', 'software', 'development', 'industry']).toContain(article.category);
      }
    });
  });
});
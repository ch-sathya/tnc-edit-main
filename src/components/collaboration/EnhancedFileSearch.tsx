import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Filter,
  X,
  Calendar as CalendarIcon,
  Tag,
  Code,
  FileText,
  Settings,
  TestTube,
  Image,
  Terminal,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Star,
  Clock,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { CollaborationFile, FileCategory } from '@/types/collaboration';
import { projectFileManagementService } from '@/services/project-file-management-service';
import { useToast } from '@/hooks/use-toast';

interface EnhancedFileSearchProps {
  groupId: string;
  currentUserId: string;
  files: CollaborationFile[];
  selectedFile: CollaborationFile | null;
  onFileSelect: (file: CollaborationFile) => void;
  onFilesFiltered?: (files: CollaborationFile[]) => void;
}

interface SearchFilters {
  query: string;
  category: string;
  language: string;
  tags: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  sortBy: 'name' | 'date' | 'size' | 'language';
  sortOrder: 'asc' | 'desc';
  viewMode: 'list' | 'grid';
}

export const EnhancedFileSearch: React.FC<EnhancedFileSearchProps> = ({
  groupId,
  currentUserId,
  files,
  selectedFile,
  onFileSelect,
  onFilesFiltered
}) => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: 'all',
    language: 'all',
    tags: [],
    dateRange: { start: null, end: null },
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: 'list'
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get categories and available options
  const categories = projectFileManagementService.getCategories();
  const availableLanguages = useMemo(() => {
    const languages = new Set(files.map(file => file.language));
    return Array.from(languages).sort();
  }, [files]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    files.forEach(file => {
      file.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [files]);

  // Load search history from localStorage
  useEffect(() => {
    const historyKey = `search_history_${groupId}_${currentUserId}`;
    const stored = localStorage.getItem(historyKey);
    if (stored) {
      try {
        setSearchHistory(JSON.parse(stored));
      } catch {
        setSearchHistory([]);
      }
    }
  }, [groupId, currentUserId]);

  // Save search to history
  const saveSearchToHistory = useCallback((query: string) => {
    if (!query.trim() || searchHistory.includes(query)) return;
    
    const historyKey = `search_history_${groupId}_${currentUserId}`;
    const newHistory = [query, ...searchHistory.slice(0, 9)]; // Keep last 10 searches
    setSearchHistory(newHistory);
    localStorage.setItem(historyKey, JSON.stringify(newHistory));
  }, [groupId, currentUserId, searchHistory]);

  // Filter and sort files based on current filters
  const filteredFiles = useMemo(() => {
    let result = [...files];

    // Text search
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      result = result.filter(file => 
        file.name.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query) ||
        file.content.toLowerCase().includes(query) ||
        file.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      result = result.filter(file => {
        const category = projectFileManagementService.categorizeFile(file);
        return category.id === filters.category;
      });
    }

    // Language filter
    if (filters.language !== 'all') {
      result = result.filter(file => file.language === filters.language);
    }

    // Tags filter
    if (filters.tags.length > 0) {
      result = result.filter(file => 
        filters.tags.every(tag => file.tags?.includes(tag))
      );
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      result = result.filter(file => {
        const fileDate = new Date(file.updatedAt);
        if (filters.dateRange.start && fileDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && fileDate > filters.dateRange.end) return false;
        return true;
      });
    }

    // Sort files
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'size':
          comparison = a.content.length - b.content.length;
          break;
        case 'language':
          comparison = a.language.localeCompare(b.language);
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [files, filters]);

  // Notify parent component of filtered results
  useEffect(() => {
    onFilesFiltered?.(filteredFiles);
  }, [filteredFiles, onFilesFiltered]);

  const handleSearch = async (query: string) => {
    setFilters(prev => ({ ...prev, query }));
    
    if (query.trim()) {
      setIsSearching(true);
      try {
        // Perform advanced search using the service
        const searchResults = await projectFileManagementService.searchFiles(
          groupId,
          query,
          {
            category: filters.category !== 'all' ? filters.category : undefined,
            language: filters.language !== 'all' ? filters.language : undefined,
            tags: filters.tags.length > 0 ? filters.tags : undefined,
            dateRange: filters.dateRange.start && filters.dateRange.end ? {
              start: filters.dateRange.start,
              end: filters.dateRange.end
            } : undefined
          }
        );
        
        saveSearchToHistory(query);
      } catch (error) {
        console.error('Search error:', error);
        toast({
          title: "Search Error",
          description: "Failed to perform search",
          variant: "destructive"
        });
      } finally {
        setIsSearching(false);
      }
    }
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: 'all',
      language: 'all',
      tags: [],
      dateRange: { start: null, end: null },
      sortBy: 'name',
      sortOrder: 'asc',
      viewMode: 'list'
    });
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const getFileIcon = (language: string) => {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return <Code className="h-4 w-4 text-yellow-500" />;
      case 'python':
        return <Code className="h-4 w-4 text-blue-500" />;
      case 'html':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'css':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'json':
        return <Settings className="h-4 w-4 text-green-500" />;
      case 'markdown':
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return <FileText className="h-4 w-4" />;
    
    switch (category.icon) {
      case 'Code': return <Code className="h-4 w-4" />;
      case 'Settings': return <Settings className="h-4 w-4" />;
      case 'FileText': return <FileText className="h-4 w-4" />;
      case 'TestTube': return <TestTube className="h-4 w-4" />;
      case 'Image': return <Image className="h-4 w-4" />;
      case 'Terminal': return <Terminal className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const renderFileList = () => {
    if (filteredFiles.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No files found</p>
          <p className="text-xs">Try adjusting your search criteria</p>
        </div>
      );
    }

    if (filters.viewMode === 'grid') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredFiles.map((file) => (
            <Card
              key={file.id}
              className={`cursor-pointer transition-colors ${
                selectedFile?.id === file.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => onFileSelect(file)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  {getFileIcon(file.language)}
                  <span className="font-medium text-sm truncate">{file.name}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate mb-2">
                  {file.path}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {file.language}
                  </Badge>
                  {file.category && (
                    <Badge variant="secondary" className="text-xs">
                      {categories.find(c => c.id === file.category)?.name}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredFiles.map((file) => (
          <div
            key={file.id}
            className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
              selectedFile?.id === file.id
                ? 'bg-primary/10 border border-primary/20'
                : 'hover:bg-muted/50'
            }`}
            onClick={() => onFileSelect(file)}
          >
            {getFileIcon(file.language)}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{file.name}</div>
              <div className="text-xs text-muted-foreground truncate">{file.path}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(file.updatedAt), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {file.createdBy}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {file.language}
              </Badge>
              {file.category && (
                <Badge variant="secondary" className="text-xs">
                  {categories.find(c => c.id === file.category)?.name}
                </Badge>
              )}
              {file.tags?.slice(0, 2).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters(prev => ({ 
                ...prev, 
                viewMode: prev.viewMode === 'list' ? 'grid' : 'list' 
              }))}
            >
              {filters.viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </Button>
          </div>
        </CardTitle>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files by name, content, or tags..."
            value={filters.query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
          {filters.query && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => handleSearch('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && filters.query === '' && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">Recent:</span>
            {searchHistory.slice(0, 3).map((query, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => handleSearch(query)}
              >
                {query}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <Separator />

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <>
          <CardContent className="py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={filters.category} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category.id)}
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <Select value={filters.language} onValueChange={(value) => 
                  setFilters(prev => ({ ...prev, language: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {availableLanguages.map(language => (
                      <SelectItem key={language} value={language}>
                        {language.charAt(0).toUpperCase() + language.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <div className="flex gap-2">
                  <Select value={filters.sortBy} onValueChange={(value: any) => 
                    setFilters(prev => ({ ...prev, sortBy: value }))
                  }>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="date">Date Modified</SelectItem>
                      <SelectItem value="size">Size</SelectItem>
                      <SelectItem value="language">Language</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                    }))}
                  >
                    {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {filters.dateRange.start ? format(filters.dateRange.start, 'MMM d') : 'Start'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.start || undefined}
                        onSelect={(date) => setFilters(prev => ({ 
                          ...prev, 
                          dateRange: { ...prev.dateRange, start: date || null } 
                        }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {filters.dateRange.end ? format(filters.dateRange.end, 'MMM d') : 'End'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.end || undefined}
                        onSelect={(date) => setFilters(prev => ({ 
                          ...prev, 
                          dateRange: { ...prev.dateRange, end: date || null } 
                        }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {availableTags.map(tag => (
                    <Button
                      key={tag}
                      variant={filters.tags.includes(tag) ? "default" : "outline"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => toggleTag(tag)}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          </CardContent>
          <Separator />
        </>
      )}

      {/* Results */}
      <CardContent className="flex-1 p-0">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found
            </span>
            {isSearching && (
              <div className="text-sm text-muted-foreground">Searching...</div>
            )}
          </div>
          
          <ScrollArea className="h-96">
            {renderFileList()}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
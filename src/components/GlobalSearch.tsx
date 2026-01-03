import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, FolderOpen, Users, GitBranch, Loader2, Command } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SearchResult {
  type: 'user' | 'project' | 'room' | 'repository';
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  url: string;
}

export const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(5);

      if (users) {
        users.forEach((user) => {
          searchResults.push({
            type: 'user',
            id: user.user_id,
            title: user.display_name || user.username || 'User',
            subtitle: user.username ? `@${user.username}` : undefined,
            image: user.avatar_url,
            url: `/user/${user.user_id}`,
          });
        });
      }

      // Search projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, description, status')
        .ilike('title', `%${searchQuery}%`)
        .eq('status', 'published')
        .limit(5);

      if (projects) {
        projects.forEach((project) => {
          searchResults.push({
            type: 'project',
            id: project.id,
            title: project.title,
            subtitle: project.description?.slice(0, 50) || 'No description',
            url: `/projects/${project.id}`,
          });
        });
      }

      // Search collaboration rooms
      const { data: rooms } = await supabase
        .from('collaboration_rooms')
        .select('id, name, description, is_private')
        .ilike('name', `%${searchQuery}%`)
        .eq('is_private', false)
        .limit(5);

      if (rooms) {
        rooms.forEach((room) => {
          searchResults.push({
            type: 'room',
            id: room.id,
            title: room.name,
            subtitle: room.description?.slice(0, 50) || 'Collaboration room',
            url: `/collaborate/${room.id}`,
          });
        });
      }

      // Search repositories
      const { data: repos } = await supabase
        .from('repositories')
        .select('id, name, description, visibility')
        .ilike('name', `%${searchQuery}%`)
        .eq('visibility', 'public')
        .limit(5);

      if (repos) {
        repos.forEach((repo) => {
          searchResults.push({
            type: 'repository',
            id: repo.id,
            title: repo.name,
            subtitle: repo.description?.slice(0, 50) || 'Repository',
            url: `/projects/${repo.id}`,
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (result: SearchResult) => {
    // Save to recent searches
    const newRecent = [result.title, ...recentSearches.filter(r => r !== result.title)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    
    setOpen(false);
    setQuery('');
    navigate(result.url);
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return <User className="h-4 w-4" />;
      case 'project': return <FolderOpen className="h-4 w-4" />;
      case 'room': return <Users className="h-4 w-4" />;
      case 'repository': return <GitBranch className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'user': return 'User';
      case 'project': return 'Project';
      case 'room': return 'Room';
      case 'repository': return 'Repo';
    }
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary/50 border border-border rounded-lg hover:bg-secondary transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search users, projects, rooms..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {!loading && query.length < 2 && recentSearches.length > 0 && (
            <CommandGroup heading="Recent Searches">
              {recentSearches.map((search, i) => (
                <CommandItem key={i} onSelect={() => setQuery(search)}>
                  <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                  {search}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {!loading && Object.entries(groupedResults).map(([type, items], groupIndex) => (
            <React.Fragment key={type}>
              {groupIndex > 0 && <CommandSeparator />}
              <CommandGroup heading={type.charAt(0).toUpperCase() + type.slice(1) + 's'}>
                {items.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    {result.type === 'user' && result.image ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={result.image} />
                        <AvatarFallback>{result.title[0]}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                        {getIcon(result.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(result.type)}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}

          {!loading && !query && (
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => { setOpen(false); navigate('/projects'); }}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Browse Projects
              </CommandItem>
              <CommandItem onSelect={() => { setOpen(false); navigate('/collaborate'); }}>
                <Users className="mr-2 h-4 w-4" />
                Join Collaboration Room
              </CommandItem>
              <CommandItem onSelect={() => { setOpen(false); navigate('/community'); }}>
                <User className="mr-2 h-4 w-4" />
                Explore Community
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};

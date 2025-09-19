import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Code2, 
  Plus, 
  Search, 
  X, 
  Copy, 
  Edit, 
  Trash2, 
  Star,
  Tag,
  Clock,
  Bookmark,
  FileText,
  Settings,
  Zap,
  ChevronRight,
  Save,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodeSnippet {
  id: string;
  name: string;
  description: string;
  code: string;
  language: string;
  tags: string[];
  category: string;
  isBookmarked: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

interface FileSnippetsPanelProps {
  groupId: string;
  currentUserId: string;
  currentLanguage?: string;
  onInsertSnippet: (code: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const FileSnippetsPanel: React.FC<FileSnippetsPanelProps> = ({
  groupId,
  currentUserId,
  currentLanguage = 'javascript',
  onInsertSnippet,
  open = false,
  onOpenChange
}) => {
  const { toast } = useToast();
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<CodeSnippet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const [newSnippet, setNewSnippet] = useState({
    name: '',
    description: '',
    code: '',
    language: currentLanguage,
    tags: '',
    category: 'general'
  });

  // Default snippets for common patterns
  const defaultSnippets: CodeSnippet[] = [
    {
      id: 'react-usestate',
      name: 'React useState Hook',
      description: 'Basic useState hook with TypeScript',
      code: `const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:string}>('${3:initial}');`,
      language: 'typescript',
      tags: ['react', 'hooks', 'state'],
      category: 'react',
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    },
    {
      id: 'react-useeffect',
      name: 'React useEffect Hook',
      description: 'useEffect hook with cleanup',
      code: `useEffect(() => {
  ${1:// Effect logic here}
  
  return () => {
    ${2:// Cleanup logic here}
  };
}, [${3:dependencies}]);`,
      language: 'typescript',
      tags: ['react', 'hooks', 'effect'],
      category: 'react',
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    },
    {
      id: 'async-function',
      name: 'Async Function with Error Handling',
      description: 'Async function with try-catch error handling',
      code: `const ${1:functionName} = async (${2:params}) => {
  try {
    ${3:// Async operation here}
    const result = await ${4:asyncOperation()};
    return result;
  } catch (error) {
    console.error('Error in ${1:functionName}:', error);
    throw error;
  }
};`,
      language: 'typescript',
      tags: ['async', 'error-handling', 'function'],
      category: 'javascript',
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    },
    {
      id: 'python-class',
      name: 'Python Class Template',
      description: 'Basic Python class with constructor and methods',
      code: `class ${1:ClassName}:
    """${2:Class description}"""
    
    def __init__(self, ${3:params}):
        """Initialize the ${1:ClassName} instance."""
        ${4:# Initialize attributes}
    
    def ${5:method_name}(self, ${6:params}):
        """${7:Method description}"""
        ${8:# Method implementation}
        pass
    
    def __str__(self):
        """String representation of the ${1:ClassName}."""
        return f"${1:ClassName}(${9:attributes})"`,
      language: 'python',
      tags: ['class', 'oop', 'template'],
      category: 'python',
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    },
    {
      id: 'css-flexbox',
      name: 'CSS Flexbox Container',
      description: 'Common flexbox container styles',
      code: `.${1:container} {
  display: flex;
  ${2:flex-direction: row;}
  ${3:justify-content: center;}
  ${4:align-items: center;}
  ${5:gap: 1rem;}
  ${6:flex-wrap: wrap;}
}`,
      language: 'css',
      tags: ['flexbox', 'layout', 'css'],
      category: 'css',
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    },
    {
      id: 'html-form',
      name: 'HTML Form Template',
      description: 'Accessible HTML form with validation',
      code: `<form class="${1:form-class}" onsubmit="${2:handleSubmit}">
  <div class="form-group">
    <label for="${3:field-id}">${4:Field Label}</label>
    <input 
      type="${5:text}" 
      id="${3:field-id}" 
      name="${6:field-name}"
      required
      aria-describedby="${3:field-id}-help"
    />
    <small id="${3:field-id}-help">${7:Help text}</small>
  </div>
  
  <button type="submit">${8:Submit}</button>
</form>`,
      language: 'html',
      tags: ['form', 'accessibility', 'validation'],
      category: 'html',
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    }
  ];

  useEffect(() => {
    loadSnippets();
  }, [groupId, currentUserId]);

  useEffect(() => {
    filterSnippets();
  }, [snippets, searchQuery, selectedCategory, selectedLanguage]);

  const loadSnippets = () => {
    // Load snippets from localStorage (in a real app, this would be from a database)
    const storageKey = `snippets_${groupId}_${currentUserId}`;
    const stored = localStorage.getItem(storageKey);
    
    let userSnippets: CodeSnippet[] = [];
    if (stored) {
      try {
        userSnippets = JSON.parse(stored).map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt)
        }));
      } catch (error) {
        console.error('Error loading snippets:', error);
      }
    }

    // Combine default snippets with user snippets
    setSnippets([...defaultSnippets, ...userSnippets]);
  };

  const saveSnippets = (updatedSnippets: CodeSnippet[]) => {
    // Filter out default snippets for storage
    const userSnippets = updatedSnippets.filter(s => !defaultSnippets.some(d => d.id === s.id));
    const storageKey = `snippets_${groupId}_${currentUserId}`;
    localStorage.setItem(storageKey, JSON.stringify(userSnippets));
    setSnippets(updatedSnippets);
  };

  const filterSnippets = () => {
    let filtered = snippets;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(snippet =>
        snippet.name.toLowerCase().includes(query) ||
        snippet.description.toLowerCase().includes(query) ||
        snippet.code.toLowerCase().includes(query) ||
        snippet.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(snippet => snippet.category === selectedCategory);
    }

    // Language filter
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(snippet => snippet.language === selectedLanguage);
    }

    setFilteredSnippets(filtered);
  };

  const handleCreateSnippet = () => {
    if (!newSnippet.name.trim() || !newSnippet.code.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a name and code for the snippet",
        variant: "destructive"
      });
      return;
    }

    const snippet: CodeSnippet = {
      id: `snippet_${Date.now()}`,
      name: newSnippet.name,
      description: newSnippet.description,
      code: newSnippet.code,
      language: newSnippet.language,
      tags: newSnippet.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      category: newSnippet.category,
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };

    const updatedSnippets = [...snippets, snippet];
    saveSnippets(updatedSnippets);

    // Reset form
    setNewSnippet({
      name: '',
      description: '',
      code: '',
      language: currentLanguage,
      tags: '',
      category: 'general'
    });
    setShowCreateDialog(false);

    toast({
      title: "Snippet created",
      description: `"${snippet.name}" has been added to your snippets`
    });
  };

  const handleUpdateSnippet = () => {
    if (!editingSnippet || !newSnippet.name.trim() || !newSnippet.code.trim()) {
      return;
    }

    const updatedSnippet: CodeSnippet = {
      ...editingSnippet,
      name: newSnippet.name,
      description: newSnippet.description,
      code: newSnippet.code,
      language: newSnippet.language,
      tags: newSnippet.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      category: newSnippet.category,
      updatedAt: new Date()
    };

    const updatedSnippets = snippets.map(s => s.id === editingSnippet.id ? updatedSnippet : s);
    saveSnippets(updatedSnippets);

    setEditingSnippet(null);
    setNewSnippet({
      name: '',
      description: '',
      code: '',
      language: currentLanguage,
      tags: '',
      category: 'general'
    });

    toast({
      title: "Snippet updated",
      description: `"${updatedSnippet.name}" has been updated`
    });
  };

  const handleDeleteSnippet = (snippetId: string) => {
    const snippet = snippets.find(s => s.id === snippetId);
    if (!snippet) return;

    // Don't allow deleting default snippets
    if (defaultSnippets.some(d => d.id === snippetId)) {
      toast({
        title: "Cannot delete",
        description: "Default snippets cannot be deleted",
        variant: "destructive"
      });
      return;
    }

    const updatedSnippets = snippets.filter(s => s.id !== snippetId);
    saveSnippets(updatedSnippets);

    toast({
      title: "Snippet deleted",
      description: `"${snippet.name}" has been deleted`
    });
  };

  const handleInsertSnippet = (snippet: CodeSnippet) => {
    // Track usage
    const updatedSnippets = snippets.map(s => 
      s.id === snippet.id ? { ...s, usageCount: s.usageCount + 1 } : s
    );
    saveSnippets(updatedSnippets);

    // Insert the code
    onInsertSnippet(snippet.code);

    toast({
      title: "Snippet inserted",
      description: `"${snippet.name}" has been inserted into the editor`
    });

    // Close dialog if it's open
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleCopySnippet = async (snippet: CodeSnippet) => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      toast({
        title: "Copied to clipboard",
        description: `"${snippet.name}" has been copied to your clipboard`
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy snippet to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleToggleBookmark = (snippetId: string) => {
    const updatedSnippets = snippets.map(s => 
      s.id === snippetId ? { ...s, isBookmarked: !s.isBookmarked } : s
    );
    saveSnippets(updatedSnippets);
  };

  const startEditSnippet = (snippet: CodeSnippet) => {
    setEditingSnippet(snippet);
    setNewSnippet({
      name: snippet.name,
      description: snippet.description,
      code: snippet.code,
      language: snippet.language,
      tags: snippet.tags.join(', '),
      category: snippet.category
    });
    setShowCreateDialog(true);
  };

  const getLanguageIcon = (language: string) => {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return <Code2 className="h-4 w-4 text-yellow-500" />;
      case 'python':
        return <Code2 className="h-4 w-4 text-blue-500" />;
      case 'html':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'css':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'json':
        return <Settings className="h-4 w-4 text-green-500" />;
      default:
        return <Code2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const categories = Array.from(new Set(snippets.map(s => s.category))).sort();
  const languages = Array.from(new Set(snippets.map(s => s.language))).sort();
  const bookmarkedSnippets = filteredSnippets.filter(s => s.isBookmarked);
  const popularSnippets = filteredSnippets.sort((a, b) => b.usageCount - a.usageCount).slice(0, 5);

  const content = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Code Snippets
          </h2>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Snippet
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search snippets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="all">All Languages</option>
              {languages.map(language => (
                <option key={language} value={language}>
                  {language.charAt(0).toUpperCase() + language.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="all" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
            <TabsTrigger value="all">All ({filteredSnippets.length})</TabsTrigger>
            <TabsTrigger value="bookmarked">Bookmarked ({bookmarkedSnippets.length})</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="all" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {filteredSnippets.map((snippet) => (
                    <Card key={snippet.id} className="hover:bg-muted/50 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getLanguageIcon(snippet.language)}
                            <CardTitle className="text-sm">{snippet.name}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {snippet.language}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleToggleBookmark(snippet.id)}
                            >
                              <Star 
                                className={`h-3 w-3 ${
                                  snippet.isBookmarked 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-muted-foreground'
                                }`} 
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCopySnippet(snippet)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {!defaultSnippets.some(d => d.id === snippet.id) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => startEditSnippet(snippet)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleDeleteSnippet(snippet.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        {snippet.description && (
                          <CardDescription className="text-xs">
                            {snippet.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                            <code>{snippet.code}</code>
                          </pre>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {snippet.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {snippet.usageCount > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Used {snippet.usageCount} times
                                </span>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleInsertSnippet(snippet)}
                                className="h-7"
                              >
                                <ChevronRight className="h-3 w-3 mr-1" />
                                Insert
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredSnippets.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Code2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No snippets found</p>
                      <p className="text-xs mt-1">Try adjusting your search or create a new snippet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="bookmarked" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {bookmarkedSnippets.length > 0 ? (
                    bookmarkedSnippets.map((snippet) => (
                      <Card key={snippet.id} className="hover:bg-muted/50 transition-colors">
                        {/* Same card content as above */}
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getLanguageIcon(snippet.language)}
                              <CardTitle className="text-sm">{snippet.name}</CardTitle>
                              <Badge variant="outline" className="text-xs">
                                {snippet.language}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleInsertSnippet(snippet)}
                              className="h-7"
                            >
                              <ChevronRight className="h-3 w-3 mr-1" />
                              Insert
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                            <code>{snippet.code}</code>
                          </pre>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No bookmarked snippets</p>
                      <p className="text-xs mt-1">Click the star icon to bookmark snippets</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="popular" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {popularSnippets.length > 0 ? (
                    popularSnippets.map((snippet) => (
                      <Card key={snippet.id} className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getLanguageIcon(snippet.language)}
                              <CardTitle className="text-sm">{snippet.name}</CardTitle>
                              <Badge variant="outline" className="text-xs">
                                {snippet.language}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {snippet.usageCount} uses
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleInsertSnippet(snippet)}
                              className="h-7"
                            >
                              <ChevronRight className="h-3 w-3 mr-1" />
                              Insert
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                            <code>{snippet.code}</code>
                          </pre>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No popular snippets yet</p>
                      <p className="text-xs mt-1">Start using snippets to see popular ones here</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Create/Edit Snippet Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingSnippet ? 'Edit Snippet' : 'Create New Snippet'}
            </DialogTitle>
            <DialogDescription>
              {editingSnippet ? 'Update your code snippet' : 'Create a reusable code snippet'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="snippet-name">Name</Label>
                <Input
                  id="snippet-name"
                  value={newSnippet.name}
                  onChange={(e) => setNewSnippet(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Snippet name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="snippet-language">Language</Label>
                <select
                  id="snippet-language"
                  value={newSnippet.language}
                  onChange={(e) => setNewSnippet(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="json">JSON</option>
                  <option value="markdown">Markdown</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="snippet-description">Description</Label>
              <Input
                id="snippet-description"
                value={newSnippet.description}
                onChange={(e) => setNewSnippet(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the snippet"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="snippet-category">Category</Label>
                <select
                  id="snippet-category"
                  value={newSnippet.category}
                  onChange={(e) => setNewSnippet(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                >
                  <option value="general">General</option>
                  <option value="react">React</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="css">CSS</option>
                  <option value="html">HTML</option>
                  <option value="utils">Utilities</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="snippet-tags">Tags (comma-separated)</Label>
                <Input
                  id="snippet-tags"
                  value={newSnippet.tags}
                  onChange={(e) => setNewSnippet(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="react, hooks, state"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="snippet-code">Code</Label>
              <Textarea
                id="snippet-code"
                value={newSnippet.code}
                onChange={(e) => setNewSnippet(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Enter your code snippet here..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingSnippet(null);
              setNewSnippet({
                name: '',
                description: '',
                code: '',
                language: currentLanguage,
                tags: '',
                category: 'general'
              });
            }}>
              Cancel
            </Button>
            <Button onClick={editingSnippet ? handleUpdateSnippet : handleCreateSnippet}>
              <Save className="h-4 w-4 mr-2" />
              {editingSnippet ? 'Update' : 'Create'} Snippet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // If used as a dialog
  if (onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] p-0">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  // If used as a standalone component
  return (
    <Card className="h-full">
      {content}
    </Card>
  );
};
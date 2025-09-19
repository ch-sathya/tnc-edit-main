import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter,
  Bookmark,
  BookmarkCheck,
  Clock,
  FolderTree,
  Tag,
  Settings,
  Share2,
  Lock,
  Unlock,
  Star,
  Code,
  FileText,
  TestTube,
  Image,
  Terminal,
  Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CollaborationFile, FileCategory, FileTemplate, FileBookmark } from '@/types/collaboration';
import { projectFileManagementService } from '@/services/project-file-management-service';
import { collaborationFileService } from '@/services/collaboration-file-service';

interface ProjectFileManagerProps {
  groupId: string;
  currentUserId: string;
  selectedFile: CollaborationFile | null;
  onFileSelect: (file: CollaborationFile) => void;
  onFileChange?: (files: CollaborationFile[]) => void;
}

export const ProjectFileManager: React.FC<ProjectFileManagerProps> = ({
  groupId,
  currentUserId,
  selectedFile,
  onFileSelect,
  onFileChange
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<CollaborationFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<CollaborationFile[]>([]);
  const [categories] = useState<FileCategory[]>(projectFileManagementService.getCategories());
  const [templates] = useState<FileTemplate[]>(projectFileManagementService.getTemplates());
  const [bookmarks, setBookmarks] = useState<FileBookmark[]>([]);
  const [recentFiles, setRecentFiles] = useState<CollaborationFile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  
  // Create file state
  const [newFileName, setNewFileName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState('javascript');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateReplacements, setTemplateReplacements] = useState<Record<string, string>>({});

  // Load data on component mount
  useEffect(() => {
    if (groupId) {
      loadAllData();
    }
  }, [groupId]);

  // Filter files when search/filter criteria change
  useEffect(() => {
    filterFiles();
  }, [files, searchQuery, selectedCategory, selectedLanguage, activeTab]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load files
      const filesData = await collaborationFileService.getFiles(groupId);
      
      // Enhance files with category and bookmark info
      const enhancedFiles = await Promise.all(
        filesData.map(async (file) => {
          const category = projectFileManagementService.categorizeFile(file);
          return {
            ...file,
            category: category.id,
            tags: projectFileManagementService['generateTags'](file),
            isBookmarked: false // Will be updated below
          };
        })
      );
      
      setFiles(enhancedFiles);
      onFileChange?.(enhancedFiles);

      // Load bookmarks
      const bookmarksData = await projectFileManagementService.getUserBookmarks(groupId, currentUserId);
      setBookmarks(bookmarksData);
      
      // Update bookmark status in files
      const bookmarkedFileIds = new Set(bookmarksData.map(b => b.fileId));
      const filesWithBookmarks = enhancedFiles.map(file => ({
        ...file,
        isBookmarked: bookmarkedFileIds.has(file.id)
      }));
      setFiles(filesWithBookmarks);

      // Load recent files
      const recentData = await projectFileManagementService.getRecentFiles(groupId, currentUserId);
      setRecentFiles(recentData);

      // Auto-select first file if none selected
      if (!selectedFile && enhancedFiles.length > 0) {
        onFileSelect(enhancedFiles[0]);
        await projectFileManagementService.trackFileAccess(groupId, currentUserId, enhancedFiles[0].id);
      }
    } catch (error) {
      console.error('Error loading project data:', error);
      toast({
        title: "Error",
        description: "Failed to load project files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterFiles = useCallback(() => {
    let filtered = [...files];

    // Filter by tab
    switch (activeTab) {
      case 'bookmarked':
        filtered = filtered.filter(file => file.isBookmarked);
        break;
      case 'recent':
        const recentIds = new Set(recentFiles.map(f => f.id));
        filtered = filtered.filter(file => recentIds.has(file.id));
        break;
      case 'category':
        if (selectedCategory) {
          filtered = filtered.filter(file => file.category === selectedCategory);
        }
        break;
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query) ||
        file.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply language filter
    if (selectedLanguage) {
      filtered = filtered.filter(file => file.language === selectedLanguage);
    }

    setFilteredFiles(filtered);
  }, [files, activeTab, searchQuery, selectedCategory, selectedLanguage, recentFiles]);

  const handleFileSelect = async (file: CollaborationFile) => {
    onFileSelect(file);
    await projectFileManagementService.trackFileAccess(groupId, currentUserId, file.id);
    
    // Refresh recent files
    const recentData = await projectFileManagementService.getRecentFiles(groupId, currentUserId);
    setRecentFiles(recentData);
  };

  const toggleBookmark = async (file: CollaborationFile) => {
    try {
      if (file.isBookmarked) {
        await projectFileManagementService.removeBookmark(groupId, currentUserId, file.id);
        toast({
          title: "Bookmark removed",
          description: `${file.name} removed from bookmarks`
        });
      } else {
        await projectFileManagementService.addBookmark(groupId, currentUserId, file.id);
        toast({
          title: "Bookmark added",
          description: `${file.name} added to bookmarks`
        });
      }
      
      // Refresh data
      await loadAllData();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive"
      });
    }
  };

  const createFileFromTemplate = async () => {
    if (!selectedTemplate || !newFileName.trim()) {
      toast({
        title: "Invalid input",
        description: "Please select a template and enter a filename",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate content from template
      const content = projectFileManagementService.createFileFromTemplate(
        selectedTemplate, 
        templateReplacements
      );

      const template = templates.find(t => t.id === selectedTemplate)!;
      
      // Create the file
      const newFile = await collaborationFileService.createFile({
        name: newFileName.split('/').pop() || newFileName,
        path: newFileName,
        content,
        language: template.language,
        groupId,
        createdBy: currentUserId
      });

      toast({
        title: "File created",
        description: `${newFileName} created from template`
      });

      setShowTemplateDialog(false);
      setSelectedTemplate('');
      setNewFileName('');
      setTemplateReplacements({});
      
      // Refresh files and select new file
      await loadAllData();
      onFileSelect(newFile);
    } catch (error) {
      console.error('Error creating file from template:', error);
      toast({
        title: "Error",
        description: "Failed to create file from template",
        variant: "destructive"
      });
    }
  };

  const createEmptyFile = async () => {
    if (!newFileName.trim()) {
      toast({
        title: "Invalid filename",
        description: "Please enter a filename",
        variant: "destructive"
      });
      return;
    }

    try {
      const newFile = await collaborationFileService.createFile({
        name: newFileName.split('/').pop() || newFileName,
        path: newFileName,
        language: newFileLanguage,
        groupId,
        createdBy: currentUserId
      });

      toast({
        title: "File created",
        description: `${newFileName} has been created`
      });

      setShowCreateDialog(false);
      setNewFileName('');
      setNewFileLanguage('javascript');
      
      // Refresh files and select new file
      await loadAllData();
      onFileSelect(newFile);
    } catch (error) {
      console.error('Error creating file:', error);
      toast({
        title: "Error",
        description: "Failed to create file",
        variant: "destructive"
      });
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'source': return <Code className="h-4 w-4" />;
      case 'config': return <Settings className="h-4 w-4" />;
      case 'docs': return <FileText className="h-4 w-4" />;
      case 'tests': return <TestTube className="h-4 w-4" />;
      case 'assets': return <Image className="h-4 w-4" />;
      case 'scripts': return <Terminal className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  const getUniqueLanguages = () => {
    const languages = new Set(files.map(file => file.language));
    return Array.from(languages).sort();
  };

  const renderFileItem = (file: CollaborationFile) => (
    <div
      key={file.id}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
        selectedFile?.id === file.id ? 'bg-primary/10 border border-primary/20' : ''
      }`}
      onClick={() => handleFileSelect(file)}
    >
      <div style={{ color: getCategoryColor(file.category || 'source') }}>
        {getCategoryIcon(file.category || 'source')}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{file.name}</span>
          {file.isBookmarked && (
            <BookmarkCheck className="h-3 w-3 text-yellow-500" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground truncate">{file.path}</span>
          <Badge variant="outline" className="text-xs">
            {file.language}
          </Badge>
        </div>
        {file.tags && file.tags.length > 0 && (
          <div className="flex gap-1 mt-1">
            {file.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {file.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">+{file.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            toggleBookmark(file);
          }}
        >
          {file.isBookmarked ? (
            <BookmarkCheck className="h-3 w-3 text-yellow-500" />
          ) : (
            <Bookmark className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Project Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading project files...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Project Files ({files.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  From Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create File from Template</DialogTitle>
                  <DialogDescription>
                    Choose a template to quickly create a new file with boilerplate code.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(template.category)}
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-xs text-muted-foreground">{template.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedTemplate && (
                    <>
                      <div className="space-y-2">
                        <Label>File Path</Label>
                        <Input
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          placeholder="src/components/MyComponent.tsx"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Template Variables</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="ComponentName"
                            value={templateReplacements.ComponentName || ''}
                            onChange={(e) => setTemplateReplacements(prev => ({
                              ...prev,
                              ComponentName: e.target.value
                            }))}
                          />
                          <Input
                            placeholder="ServiceName"
                            value={templateReplacements.ServiceName || ''}
                            onChange={(e) => setTemplateReplacements(prev => ({
                              ...prev,
                              ServiceName: e.target.value
                            }))}
                          />
                          <Input
                            placeholder="ClassName"
                            value={templateReplacements.ClassName || ''}
                            onChange={(e) => setTemplateReplacements(prev => ({
                              ...prev,
                              ClassName: e.target.value
                            }))}
                          />
                          <Input
                            placeholder="ProjectName"
                            value={templateReplacements.ProjectName || ''}
                            onChange={(e) => setTemplateReplacements(prev => ({
                              ...prev,
                              ProjectName: e.target.value
                            }))}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={createFileFromTemplate} disabled={!selectedTemplate || !newFileName.trim()}>
                    Create File
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New File
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New File</DialogTitle>
                  <DialogDescription>
                    Create a new empty file in the collaboration space.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>File Path</Label>
                    <Input
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="src/utils/helper.js"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={newFileLanguage} onValueChange={setNewFileLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="css">CSS</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createEmptyFile} disabled={!newFileName.trim()}>
                    Create File
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-3 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Languages</SelectItem>
                {getUniqueLanguages().map(lang => (
                  <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="flex-1 p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
            <TabsTrigger value="all">All Files</TabsTrigger>
            <TabsTrigger value="bookmarked">
              <Bookmark className="h-4 w-4 mr-1" />
              Bookmarked
            </TabsTrigger>
            <TabsTrigger value="recent">
              <Clock className="h-4 w-4 mr-1" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="category">
              <Tag className="h-4 w-4 mr-1" />
              Categories
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="all" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {filteredFiles.length > 0 ? (
                    filteredFiles.map(renderFileItem)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderTree className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No files found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="bookmarked" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {filteredFiles.length > 0 ? (
                    filteredFiles.map(renderFileItem)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No bookmarked files</p>
                      <p className="text-xs">Click the bookmark icon on files to add them here</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="recent" className="h-full mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  {recentFiles.length > 0 ? (
                    recentFiles.map(renderFileItem)
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent files</p>
                      <p className="text-xs">Files you access will appear here</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="category" className="h-full mt-0">
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {categories.map(category => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(
                        selectedCategory === category.id ? '' : category.id
                      )}
                      className="justify-start"
                    >
                      <div style={{ color: category.color }}>
                        {getCategoryIcon(category.id)}
                      </div>
                      <span className="ml-2">{category.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {files.filter(f => f.category === category.id).length}
                      </Badge>
                    </Button>
                  ))}
                </div>
                
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredFiles.length > 0 ? (
                      filteredFiles.map(renderFileItem)
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No files in selected category</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};
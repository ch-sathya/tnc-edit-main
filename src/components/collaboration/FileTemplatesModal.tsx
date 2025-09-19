import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Code, 
  Folder, 
  Plus,
  Search,
  X,
  Settings,
  Layers
} from 'lucide-react';
import { FileTemplate } from '@/types/collaboration';
import { fileAccessibilityService } from '@/services/file-accessibility-service';
import { useToast } from '@/hooks/use-toast';

interface FileTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFile: (name: string, path: string, content: string, language: string) => Promise<void>;
  onCreateProject?: (structure: any) => Promise<void>;
}

interface TemplateVariables {
  [key: string]: string;
}

export const FileTemplatesModal: React.FC<FileTemplatesModalProps> = ({
  open,
  onOpenChange,
  onCreateFile,
  onCreateProject
}) => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<FileTemplate | null>(null);
  const [fileName, setFileName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [templateVariables, setTemplateVariables] = useState<TemplateVariables>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showVariables, setShowVariables] = useState(false);

  const templates = fileAccessibilityService.getFileTemplates();
  const projectStructures = fileAccessibilityService.getProjectStructures();

  // Filter templates based on search and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(templates.map(t => t.category))).sort();

  // Extract template variables from content
  const extractVariables = (content: string): string[] => {
    const regex = /{{(\w+)}}/g;
    const variables = new Set<string>();
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }
    
    return Array.from(variables);
  };

  const handleTemplateSelect = (template: FileTemplate) => {
    setSelectedTemplate(template);
    setFileName(template.name.toLowerCase().replace(/\s+/g, '-'));
    setFilePath(template.name.toLowerCase().replace(/\s+/g, '-'));
    
    // Initialize template variables
    const variables = extractVariables(template.content);
    const initialVariables: TemplateVariables = {};
    variables.forEach(variable => {
      initialVariables[variable] = '';
    });
    setTemplateVariables(initialVariables);
    setShowVariables(variables.length > 0);
  };

  const handleVariableChange = (variable: string, value: string) => {
    setTemplateVariables(prev => ({
      ...prev,
      [variable]: value
    }));
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !fileName.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a template and enter a filename",
        variant: "destructive"
      });
      return;
    }

    try {
      // Apply template variables
      const content = fileAccessibilityService.applyTemplate(selectedTemplate, templateVariables);
      
      // Determine file extension based on language
      const extension = getFileExtension(selectedTemplate.language);
      const finalFileName = fileName.includes('.') ? fileName : `${fileName}.${extension}`;
      const finalPath = filePath.trim() || finalFileName;

      await onCreateFile(finalFileName, finalPath, content, selectedTemplate.language);
      
      toast({
        title: "File created",
        description: `${finalFileName} has been created from template`,
      });

      // Reset form
      setSelectedTemplate(null);
      setFileName('');
      setFilePath('');
      setTemplateVariables({});
      setShowVariables(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating file from template:', error);
      toast({
        title: "Error",
        description: "Failed to create file from template",
        variant: "destructive"
      });
    }
  };

  const handleCreateProject = async (structure: any) => {
    if (!onCreateProject) {
      toast({
        title: "Not supported",
        description: "Project creation is not supported in this context",
        variant: "destructive"
      });
      return;
    }

    try {
      await onCreateProject(structure);
      toast({
        title: "Project created",
        description: `${structure.name} project structure has been created`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project structure",
        variant: "destructive"
      });
    }
  };

  const getFileExtension = (language: string): string => {
    switch (language) {
      case 'javascript': return 'js';
      case 'typescript': return 'ts';
      case 'python': return 'py';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'markdown': return 'md';
      case 'cpp': return 'cpp';
      case 'java': return 'java';
      default: return 'txt';
    }
  };

  const getLanguageIcon = (language: string) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create from Template</DialogTitle>
          <DialogDescription>
            Choose a template or project structure to quickly create new files
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="templates" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">File Templates</TabsTrigger>
              <TabsTrigger value="projects">Project Structures</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {/* Template Selection */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search templates..."
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

                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {filteredTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className={`cursor-pointer transition-colors ${
                            selectedTemplate?.id === template.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              {getLanguageIcon(template.language)}
                              <CardTitle className="text-sm">{template.name}</CardTitle>
                              <Badge variant="outline" className="text-xs">
                                {template.category}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs">
                              {template.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-1">
                              {template.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Template Configuration */}
                <div className="space-y-4">
                  {selectedTemplate ? (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">File Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="fileName">File Name</Label>
                            <Input
                              id="fileName"
                              value={fileName}
                              onChange={(e) => setFileName(e.target.value)}
                              placeholder="Enter filename"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="filePath">File Path (optional)</Label>
                            <Input
                              id="filePath"
                              value={filePath}
                              onChange={(e) => setFilePath(e.target.value)}
                              placeholder="src/components/MyComponent"
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {showVariables && Object.keys(templateVariables).length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Template Variables</CardTitle>
                            <CardDescription className="text-xs">
                              Fill in the template variables to customize your file
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {Object.keys(templateVariables).map(variable => (
                              <div key={variable} className="space-y-1">
                                <Label htmlFor={variable} className="text-xs">
                                  {variable.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </Label>
                                <Input
                                  id={variable}
                                  value={templateVariables[variable]}
                                  onChange={(e) => handleVariableChange(variable, e.target.value)}
                                  placeholder={`Enter ${variable}`}
                                  className="text-sm"
                                />
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-32">
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {fileAccessibilityService.applyTemplate(selectedTemplate, templateVariables)}
                            </pre>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card>
                      <CardContent className="flex items-center justify-center h-32">
                        <div className="text-center text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Select a template to configure</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="projects" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectStructures.map((structure) => (
                    <Card key={structure.id} className="cursor-pointer hover:bg-muted/50">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-primary" />
                          <CardTitle className="text-base">{structure.name}</CardTitle>
                        </div>
                        <CardDescription>{structure.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Folders:</div>
                          <div className="text-xs text-muted-foreground">
                            {structure.folders.map(folder => (
                              <div key={folder} className="flex items-center gap-1">
                                <Folder className="h-3 w-3" />
                                {folder}
                              </div>
                            ))}
                          </div>
                          <div className="text-sm font-medium mt-3">Files:</div>
                          <div className="text-xs text-muted-foreground">
                            {structure.files.map((file: any) => (
                              <div key={file.path} className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {file.path}
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button
                          className="w-full mt-4"
                          onClick={() => handleCreateProject(structure)}
                          disabled={!onCreateProject}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Project
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {selectedTemplate && (
            <Button onClick={handleCreateFromTemplate} disabled={!fileName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Create File
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
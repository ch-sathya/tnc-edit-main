import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FolderTree, 
  Users, 
  FileText, 
  Settings,
  Zap,
  Shield,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedProjectCollaborationRoom } from './EnhancedProjectCollaborationRoom';

interface ProjectFileManagementDemoProps {
  groupId?: string;
  currentUserId?: string;
  userName?: string;
}

export const ProjectFileManagementDemo: React.FC<ProjectFileManagementDemoProps> = ({
  groupId = 'demo-group-123',
  currentUserId = 'demo-user-456',
  userName = 'Demo User'
}) => {
  const { toast } = useToast();
  const [showDemo, setShowDemo] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  const demoFeatures = [
    {
      icon: <FolderTree className="h-6 w-6 text-blue-500" />,
      title: "Advanced File Organization",
      description: "Organize files with categories, folders, and smart tagging system",
      features: [
        "Automatic file categorization (Source, Config, Docs, Tests, Assets, Scripts)",
        "Hierarchical folder structure with drag-and-drop support",
        "Smart tagging based on file content and path patterns",
        "File templates for quick creation of common file types"
      ]
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-500" />,
      title: "Quick Access & Shortcuts",
      description: "Access frequently used files instantly with smart shortcuts",
      features: [
        "Pin up to 5 files for instant access",
        "Bookmark important files across projects",
        "Recent files tracking with usage frequency",
        "Smart suggestions based on usage patterns"
      ]
    },
    {
      icon: <Shield className="h-6 w-6 text-green-500" />,
      title: "File Permissions & Sharing",
      description: "Granular access control and sharing within collaboration rooms",
      features: [
        "Owner, Editor, and Viewer permission levels",
        "Share files with specific team members",
        "Group-based access control integration",
        "Permission inheritance from group membership"
      ]
    },
    {
      icon: <Settings className="h-6 w-6 text-purple-500" />,
      title: "Project Templates & Structure",
      description: "Pre-built templates and suggested project structures",
      features: [
        "React, Node.js, Python project templates",
        "README, configuration, and documentation templates",
        "Suggested folder structures based on project type",
        "Custom template creation and sharing"
      ]
    }
  ];

  const handleStartDemo = () => {
    setShowDemo(true);
    toast({
      title: "Demo Started",
      description: "Explore the enhanced project file management system",
    });
  };

  const handleStepComplete = (step: number) => {
    setDemoStep(step + 1);
    toast({
      title: `Step ${step + 1} Complete`,
      description: "Great! Continue exploring the features.",
    });
  };

  if (showDemo) {
    return (
      <div className="h-screen">
        <EnhancedProjectCollaborationRoom
          groupId={groupId}
          currentUserId={currentUserId}
          userName={userName}
          onLeave={() => setShowDemo(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Project File Management System</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Enhanced collaboration with advanced file organization, quick access shortcuts, 
          and granular permission management for team projects.
        </p>
        <Button onClick={handleStartDemo} size="lg" className="mt-4">
          <FolderTree className="h-5 w-5 mr-2" />
          Launch Interactive Demo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {demoFeatures.map((feature, index) => (
          <Card key={index} className="relative">
            <CardHeader>
              <div className="flex items-center gap-3">
                {feature.icon}
                <div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feature.features.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Implementation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Completed Features</span>
              </div>
              <ul className="text-sm space-y-1 ml-6">
                <li>• File categorization system</li>
                <li>• Quick access panel with bookmarks</li>
                <li>• Permission management interface</li>
                <li>• Template-based file creation</li>
                <li>• Recent files tracking</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Integration Points</span>
              </div>
              <ul className="text-sm space-y-1 ml-6">
                <li>• Supabase database schema</li>
                <li>• Real-time collaboration sync</li>
                <li>• Group membership integration</li>
                <li>• File change tracking</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Technical Stack</span>
              </div>
              <ul className="text-sm space-y-1 ml-6">
                <li>• React + TypeScript</li>
                <li>• Supabase for persistence</li>
                <li>• Monaco Editor integration</li>
                <li>• Real-time Socket.IO</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center space-y-4 pt-6">
        <h2 className="text-xl font-semibold">Ready to Collaborate?</h2>
        <p className="text-muted-foreground">
          The enhanced project file management system is ready for team collaboration.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={handleStartDemo} variant="default">
            <FolderTree className="h-4 w-4 mr-2" />
            Try Demo
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            View Documentation
          </Button>
        </div>
      </div>
    </div>
  );
};
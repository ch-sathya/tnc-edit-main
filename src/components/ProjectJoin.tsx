import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Code2, Users, Zap, Globe } from 'lucide-react';

interface ProjectJoinProps {
  onJoinProject: (projectId: string, userName: string) => void;
}

const ProjectJoin: React.FC<ProjectJoinProps> = ({ onJoinProject }) => {
  const [projectId, setProjectId] = useState('');
  const [userName, setUserName] = useState('');
  const [mode, setMode] = useState<'join' | 'create'>('join');

  const generateProjectId = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setProjectId(id);
    setMode('create');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectId.trim() && userName.trim()) {
      onJoinProject(projectId.trim(), userName.trim());
    }
  };

  const features = [
    {
      icon: <Code2 className="h-5 w-5" />,
      title: "Real-time Editing",
      description: "See changes instantly as you and your team code together"
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Live Collaboration",
      description: "Multiple users can edit the same file simultaneously"
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Instant Sync",
      description: "Changes are synchronized across all connected clients"
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: "Browser-based",
      description: "No installation required - works in any modern browser"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="text-center lg:text-left space-y-6">
          <div className="space-y-4">
            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              Real-time Collaboration
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
              Code Together
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                In Real-time
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl">
              SyncRift is a collaborative code editor that lets you write, edit, and debug code with your team in real-time.
              Share a project ID and start coding together instantly.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-blue-400">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="text-blue-100 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Join/Create Form */}
        <div className="flex justify-center lg:justify-end">
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-editor border-white/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {mode === 'join' ? 'Join Project' : 'Create Project'}
              </CardTitle>
              <CardDescription>
                {mode === 'join' 
                  ? 'Enter a project ID to join an existing session'
                  : 'Start a new collaborative coding session'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectId">Project ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="projectId"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value.toUpperCase())}
                      placeholder="Enter project ID"
                      className="font-mono"
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateProjectId}
                      className="shrink-0"
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userName">Your Name</Label>
                  <Input
                    id="userName"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  disabled={!projectId.trim() || !userName.trim()}
                >
                  {mode === 'join' ? 'Join Project' : 'Create Project'}
                </Button>
              </form>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => setMode(mode === 'join' ? 'create' : 'join')}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {mode === 'join' ? 'Or create a new project' : 'Or join existing project'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectJoin;
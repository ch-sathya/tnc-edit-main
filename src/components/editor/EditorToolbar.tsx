import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Terminal, 
  Play, 
  Settings,
  Loader2,
  Users
} from 'lucide-react';

interface EditorToolbarProps {
  project: { id: string; title: string } | null;
  saving: boolean;
  isExecuting?: boolean;
  onSave: () => void;
  onRun: () => void;
  onToggleTerminal: () => void;
  showTerminal: boolean;
  onOpenCollab?: () => void;
}

export const EditorToolbar = ({ 
  project, 
  saving,
  isExecuting = false,
  onSave,
  onRun,
  onToggleTerminal,
  showTerminal,
  onOpenCollab
}: EditorToolbarProps) => {
  const navigate = useNavigate();

  return (
    <div className="h-12 border-b bg-card flex items-center px-2 gap-2">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate('/portfolio')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <div className="h-4 w-px bg-border" />

      <div className="flex-1 flex items-center gap-2">
        <span className="font-medium text-sm truncate max-w-[200px]">
          {project?.title || 'Untitled Project'}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Save</span>
          <kbd className="hidden md:inline-block text-xs bg-muted px-1 rounded">⌘S</kbd>
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={onRun}
          disabled={isExecuting}
          className="gap-2"
        >
          {isExecuting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{isExecuting ? 'Running...' : 'Run'}</span>
        </Button>

        <Button
          variant={showTerminal ? "secondary" : "ghost"}
          size="sm"
          onClick={onToggleTerminal}
          className="gap-2"
        >
          <Terminal className="h-4 w-4" />
          <span className="hidden sm:inline">Terminal</span>
          <kbd className="hidden md:inline-block text-xs bg-muted px-1 rounded">⌘`</kbd>
        </Button>

        {onOpenCollab && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCollab}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Collaborate</span>
          </Button>
        )}

        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

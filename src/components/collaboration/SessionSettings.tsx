import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Eye, 
  Users, 
  Clock, 
  Volume2, 
  VolumeX, 
  Palette,
  Monitor,
  Moon,
  Sun,
  Zap,
  Shield,
  Bell,
  Save
} from 'lucide-react';

interface CollaborationSettings {
  // Visual settings
  showCursors: boolean;
  showTypingIndicators: boolean;
  showUserNames: boolean;
  cursorAnimations: boolean;
  theme: 'light' | 'dark' | 'auto';
  
  // Behavior settings
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  soundNotifications: boolean;
  desktopNotifications: boolean;
  
  // Performance settings
  maxCursorUpdatesPerSecond: number;
  enableRealTimeSync: boolean;
  batchUpdates: boolean;
  
  // Privacy settings
  sharePresence: boolean;
  shareCurrentFile: boolean;
  allowFollowing: boolean;
  
  // Advanced settings
  conflictResolution: 'auto' | 'manual';
  debugMode: boolean;
}

interface SessionSettingsProps {
  settings: CollaborationSettings;
  onSettingsChange: (settings: Partial<CollaborationSettings>) => void;
  onSave?: () => void;
  onReset?: () => void;
  className?: string;
}

const defaultSettings: CollaborationSettings = {
  showCursors: true,
  showTypingIndicators: true,
  showUserNames: true,
  cursorAnimations: true,
  theme: 'auto',
  autoSave: true,
  autoSaveInterval: 30,
  soundNotifications: false,
  desktopNotifications: true,
  maxCursorUpdatesPerSecond: 10,
  enableRealTimeSync: true,
  batchUpdates: true,
  sharePresence: true,
  shareCurrentFile: true,
  allowFollowing: true,
  conflictResolution: 'auto',
  debugMode: false
};

export const SessionSettings: React.FC<SessionSettingsProps> = ({
  settings,
  onSettingsChange,
  onSave,
  onReset,
  className = ''
}) => {
  const [hasChanges, setHasChanges] = useState(false);
  
  const handleSettingChange = <K extends keyof CollaborationSettings>(
    key: K,
    value: CollaborationSettings[K]
  ) => {
    onSettingsChange({ [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave?.();
    setHasChanges(false);
  };

  const handleReset = () => {
    onSettingsChange(defaultSettings);
    onReset?.();
    setHasChanges(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Collaboration Settings</h2>
        </div>
        
        {hasChanges && (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">Unsaved changes</Badge>
            <Button size="sm" variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Visual Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Visual Settings</span>
          </CardTitle>
          <CardDescription>
            Customize how collaboration features are displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-cursors">Show user cursors</Label>
              <Switch
                id="show-cursors"
                checked={settings.showCursors}
                onCheckedChange={(checked) => handleSettingChange('showCursors', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-typing">Show typing indicators</Label>
              <Switch
                id="show-typing"
                checked={settings.showTypingIndicators}
                onCheckedChange={(checked) => handleSettingChange('showTypingIndicators', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-names">Show user names</Label>
              <Switch
                id="show-names"
                checked={settings.showUserNames}
                onCheckedChange={(checked) => handleSettingChange('showUserNames', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="cursor-animations">Cursor animations</Label>
              <Switch
                id="cursor-animations"
                checked={settings.cursorAnimations}
                onCheckedChange={(checked) => handleSettingChange('cursorAnimations', checked)}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label>Theme</Label>
            <Select
              value={settings.theme}
              onValueChange={(value: 'light' | 'dark' | 'auto') => handleSettingChange('theme', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center space-x-2">
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center space-x-2">
                    <Moon className="h-4 w-4" />
                    <span>Dark</span>
                  </div>
                </SelectItem>
                <SelectItem value="auto">
                  <div className="flex items-center space-x-2">
                    <Monitor className="h-4 w-4" />
                    <span>Auto</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Behavior Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Behavior Settings</span>
          </CardTitle>
          <CardDescription>
            Configure how the collaboration system behaves
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-save">Auto-save changes</Label>
            <Switch
              id="auto-save"
              checked={settings.autoSave}
              onCheckedChange={(checked) => handleSettingChange('autoSave', checked)}
            />
          </div>
          
          {settings.autoSave && (
            <div className="space-y-2">
              <Label>Auto-save interval: {settings.autoSaveInterval} seconds</Label>
              <Slider
                value={[settings.autoSaveInterval]}
                onValueChange={([value]) => handleSettingChange('autoSaveInterval', value)}
                min={5}
                max={300}
                step={5}
                className="w-full"
              />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-notifications">Sound notifications</Label>
              <Switch
                id="sound-notifications"
                checked={settings.soundNotifications}
                onCheckedChange={(checked) => handleSettingChange('soundNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="desktop-notifications">Desktop notifications</Label>
              <Switch
                id="desktop-notifications"
                checked={settings.desktopNotifications}
                onCheckedChange={(checked) => handleSettingChange('desktopNotifications', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Performance Settings</span>
          </CardTitle>
          <CardDescription>
            Optimize performance for your connection and device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cursor updates per second: {settings.maxCursorUpdatesPerSecond}</Label>
            <Slider
              value={[settings.maxCursorUpdatesPerSecond]}
              onValueChange={([value]) => handleSettingChange('maxCursorUpdatesPerSecond', value)}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="real-time-sync">Real-time sync</Label>
              <Switch
                id="real-time-sync"
                checked={settings.enableRealTimeSync}
                onCheckedChange={(checked) => handleSettingChange('enableRealTimeSync', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="batch-updates">Batch updates</Label>
              <Switch
                id="batch-updates"
                checked={settings.batchUpdates}
                onCheckedChange={(checked) => handleSettingChange('batchUpdates', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Privacy Settings</span>
          </CardTitle>
          <CardDescription>
            Control what information you share with other users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="share-presence">Share presence</Label>
              <Switch
                id="share-presence"
                checked={settings.sharePresence}
                onCheckedChange={(checked) => handleSettingChange('sharePresence', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="share-current-file">Share current file</Label>
              <Switch
                id="share-current-file"
                checked={settings.shareCurrentFile}
                onCheckedChange={(checked) => handleSettingChange('shareCurrentFile', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-following">Allow following</Label>
              <Switch
                id="allow-following"
                checked={settings.allowFollowing}
                onCheckedChange={(checked) => handleSettingChange('allowFollowing', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Advanced Settings</span>
          </CardTitle>
          <CardDescription>
            Advanced configuration options for power users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Conflict resolution</Label>
            <Select
              value={settings.conflictResolution}
              onValueChange={(value: 'auto' | 'manual') => handleSettingChange('conflictResolution', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatic</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="debug-mode">Debug mode</Label>
            <Switch
              id="debug-mode"
              checked={settings.debugMode}
              onCheckedChange={(checked) => handleSettingChange('debugMode', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionSettings;
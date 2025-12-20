import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Bell, Shield, Palette, Loader2 } from 'lucide-react';
import { PhotoUpload } from '@/components/PhotoUpload';

const Settings = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [roomInviteNotifications, setRoomInviteNotifications] = useState(true);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleAvatarChange = async (url: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('user_id', user.id);

      if (error) throw error;
      toast({ title: 'Avatar updated successfully' });
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({ title: 'Failed to update avatar', variant: 'destructive' });
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast({ title: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      toast({ title: error.message || 'Failed to update password', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    if (!confirmed) return;

    toast({
      title: 'Account Deletion',
      description: 'Please contact support to delete your account.',
    });
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>

          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Appearance</span>
              </TabsTrigger>
            </TabsList>

            {/* Account Settings */}
            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>Update your profile photo</CardDescription>
                </CardHeader>
                <CardContent>
                  <PhotoUpload
                    currentAvatar={profile?.avatar_url || ''}
                    onAvatarChange={handleAvatarChange}
                    userName={profile?.display_name || profile?.username}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your basic account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ''} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={profile?.username || ''} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input value={profile?.display_name || ''} disabled className="bg-muted" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    To update your profile information, visit the Portfolio page.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <Input
                      id="confirmNewPassword"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button onClick={handlePasswordChange} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>Manage your email preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email notifications
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Push Notifications</CardTitle>
                  <CardDescription>Manage push notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable push notifications in browser
                      </p>
                    </div>
                    <Switch
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Messages</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when you receive messages
                      </p>
                    </div>
                    <Switch
                      checked={messageNotifications}
                      onCheckedChange={setMessageNotifications}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Room Invites</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified for collaboration room invites
                      </p>
                    </div>
                    <Switch
                      checked={roomInviteNotifications}
                      onCheckedChange={setRoomInviteNotifications}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Visibility</CardTitle>
                  <CardDescription>Control who can see your profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Public Profile</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow others to view your profile
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Display email on your public profile
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                  <CardDescription>Customize the app appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Use dark theme (currently the default)
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default Settings;

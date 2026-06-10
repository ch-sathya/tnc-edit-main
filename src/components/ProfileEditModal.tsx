import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    username?: string | null;
    display_name?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    banner_url?: string | null;
    headline?: string | null;
    availability?: string | null;
    is_public?: boolean | null;
    location?: string | null;
    website?: string | null;
    github_url?: string | null;
    linkedin_url?: string | null;
    twitter_url?: string | null;
    skills?: string[] | null;
  };
  userId: string;
  onSuccess: () => void;
}

export const ProfileEditModal = ({ open, onOpenChange, profile, userId, onSuccess }: ProfileEditModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: profile.display_name || '',
    headline: profile.headline || '',
    bio: profile.bio || '',
    location: profile.location || '',
    availability: profile.availability || 'none',
    is_public: profile.is_public ?? true,
    website: profile.website || '',
    github_url: profile.github_url || '',
    linkedin_url: profile.linkedin_url || '',
    twitter_url: profile.twitter_url || '',
    skills: profile.skills?.join(', ') || '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(profile.banner_url || null);

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const upload = async (file: File | null, prefix: string, fallback: string | null | undefined): Promise<string | null> => {
    if (!file) return fallback ?? null;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      return data.publicUrl;
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const avatarUrl = await upload(avatarFile, 'avatar', profile.avatar_url);
      const bannerUrl = await upload(bannerFile, 'banner', profile.banner_url);
      const skillsArray = formData.skills.split(',').map((s) => s.trim()).filter(Boolean);

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name || null,
          headline: formData.headline || null,
          bio: formData.bio || null,
          location: formData.location || null,
          availability: formData.availability === 'none' ? null : formData.availability,
          is_public: formData.is_public,
          website: formData.website || null,
          github_url: formData.github_url || null,
          linkedin_url: formData.linkedin_url || null,
          twitter_url: formData.twitter_url || null,
          skills: skillsArray.length > 0 ? skillsArray : null,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', userId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Profile updated successfully' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your profile information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Banner image</Label>
            <div className="relative h-32 rounded-lg overflow-hidden bg-secondary">
              {bannerPreview && (
                <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover" />
              )}
            </div>
            <Input type="file" accept="image/*" onChange={(e) => handleFile(e, setBannerFile, setBannerPreview)} disabled={uploading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Profile Picture</Label>
            <div className="flex items-center gap-4">
              {avatarPreview && (
                <img src={avatarPreview} alt="Avatar preview" className="h-20 w-20 rounded-full object-cover" />
              )}
              <Input id="avatar" type="file" accept="image/*" onChange={(e) => handleFile(e, setAvatarFile, setAvatarPreview)} disabled={uploading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input id="display_name" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} placeholder="Your display name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" maxLength={120} value={formData.headline} onChange={(e) => setFormData({ ...formData, headline: e.target.value })} placeholder="Full-stack engineer · React, Node, Postgres" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself" rows={4} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="City, Country" />
            </div>
            <div className="space-y-2">
              <Label>Availability</Label>
              <Select value={formData.availability} onValueChange={(v) => setFormData({ ...formData, availability: v })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="open_to_work">Open to work</SelectItem>
                  <SelectItem value="open_to_collab">Open to collaborate</SelectItem>
                  <SelectItem value="open_to_hire">Hiring</SelectItem>
                  <SelectItem value="not_available">Not available</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input id="skills" value={formData.skills} onChange={(e) => setFormData({ ...formData, skills: e.target.value })} placeholder="React, TypeScript, Node.js" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://yourwebsite.com" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="github_url">GitHub</Label>
              <Input id="github_url" type="url" value={formData.github_url} onChange={(e) => setFormData({ ...formData, github_url: e.target.value })} placeholder="https://github.com/you" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input id="linkedin_url" type="url" value={formData.linkedin_url} onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/you" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter_url">Twitter / X</Label>
              <Input id="twitter_url" type="url" value={formData.twitter_url} onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })} placeholder="https://x.com/you" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="is_public" className="cursor-pointer">Public profile</Label>
              <p className="text-xs text-muted-foreground">When off, only you can view your profile.</p>
            </div>
            <Switch id="is_public" checked={formData.is_public} onCheckedChange={(c) => setFormData({ ...formData, is_public: c })} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading || uploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{uploading ? 'Uploading...' : 'Saving...'}</>
              ) : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

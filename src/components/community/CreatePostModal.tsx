import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send } from 'lucide-react';
import { useCreatePost, useGroupFlairs } from '@/hooks/useCommunityPosts';
import { toast } from 'sonner';

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ open, onOpenChange, groupId }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [flairId, setFlairId] = useState<string>('');
  const createPost = useCreatePost();
  const { data: flairs } = useGroupFlairs(groupId);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      await createPost.mutateAsync({
        group_id: groupId,
        title: title.trim(),
        content: content.trim() || undefined,
        flair_id: flairId || undefined,
      });
      toast.success('Post created!');
      setTitle('');
      setContent('');
      setFlairId('');
      onOpenChange(false);
    } catch {
      toast.error('Failed to create post');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="post-title">Title</Label>
            <Input
              id="post-title"
              placeholder="An interesting title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/300</p>
          </div>

          {flairs && flairs.length > 0 && (
            <div className="space-y-2">
              <Label>Flair (optional)</Label>
              <Select value={flairId} onValueChange={setFlairId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a flair" />
                </SelectTrigger>
                <SelectContent>
                  {flairs.map(flair => (
                    <SelectItem key={flair.id} value={flair.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: flair.color }} />
                        {flair.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="post-content">Content (optional)</Label>
            <Textarea
              id="post-content"
              placeholder="Share your thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createPost.isPending}>
            {createPost.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;

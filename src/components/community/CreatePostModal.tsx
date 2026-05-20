import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';
import { useCreatePost, useGroupFlairs } from '@/hooks/useCommunityPosts';
import { toast } from 'sonner';

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | null;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ open, onOpenChange, groupId }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [flairId, setFlairId] = useState<string>('');
  const createPost = useCreatePost();
  const { data: flairs } = useGroupFlairs(groupId || '');

  useEffect(() => {
    if (!open) {
      setTitle('');
      setContent('');
      setFlairId('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!groupId) {
      toast.error('Select a community group first');
      return;
    }
    const t = title.trim();
    if (t.length < 3) {
      toast.error('Title must be at least 3 characters');
      return;
    }
    try {
      await createPost.mutateAsync({
        group_id: groupId,
        title: t,
        content: content.trim() || undefined,
        flair_id: flairId || undefined,
      });
      toast.success('Post created');
      onOpenChange(false);
    } catch {
      toast.error('Failed to create post');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create post</DialogTitle>
          <DialogDescription>Share an update, question, or link with the community.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="post-title">Title</Label>
            <Input
              id="post-title"
              placeholder="An interesting title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
              autoFocus
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
              placeholder="Share your thoughts…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] resize-none"
              maxLength={10000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createPost.isPending || !groupId}>
            {createPost.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, Pin, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const MAX_PINS = 6;

interface Repo {
  id: string;
  name: string;
  description: string | null;
  star_count: number;
  visibility: string;
  tags: string[] | null;
}

export const PinnedRepositories: React.FC<{ userId: string; isOwner: boolean }> = ({ userId, isOwner }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pinned, setPinned] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allRepos, setAllRepos] = useState<Repo[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: pins } = await supabase
      .from('pinned_repositories' as any)
      .select('repository_id, sort_order')
      .eq('user_id', userId)
      .order('sort_order');
    const ids = (pins as any[] | null)?.map((p) => p.repository_id) || [];
    if (ids.length === 0) {
      setPinned([]);
      setLoading(false);
      return;
    }
    const { data: repos } = await supabase
      .from('repositories')
      .select('id, name, description, star_count, visibility, tags')
      .in('id', ids);
    const ordered = ids
      .map((id) => (repos || []).find((r) => r.id === id))
      .filter(Boolean) as Repo[];
    setPinned(ordered);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const openPicker = async () => {
    const { data } = await supabase
      .from('repositories')
      .select('id, name, description, star_count, visibility, tags')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setAllRepos((data as any) || []);
    setPickerOpen(true);
  };

  const togglePin = async (repoId: string) => {
    const already = pinned.find((p) => p.id === repoId);
    if (already) {
      await supabase.from('pinned_repositories' as any).delete().eq('user_id', userId).eq('repository_id', repoId);
    } else {
      if (pinned.length >= MAX_PINS) {
        toast({ title: `You can pin up to ${MAX_PINS} repositories`, variant: 'destructive' });
        return;
      }
      const { error } = await supabase
        .from('pinned_repositories' as any)
        .insert({ user_id: userId, repository_id: repoId, sort_order: pinned.length });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
    }
    load();
  };

  if (!isOwner && pinned.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Pin className="h-4 w-4" /> Pinned Repositories
        </CardTitle>
        {isOwner && (
          <Button size="sm" variant="outline" onClick={openPicker}>
            <Plus className="h-4 w-4 mr-1" /> Manage pins
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pinned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pinned repositories yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pinned.map((repo) => (
              <div
                key={repo.id}
                className="rounded-lg border border-border bg-card/50 p-4 hover:border-foreground/30 transition cursor-pointer"
                onClick={() => navigate(`/projects/${repo.id}`)}
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-semibold text-foreground truncate">{repo.name}</h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3" /> {repo.star_count || 0}
                  </div>
                </div>
                {repo.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{repo.description}</p>
                )}
                {repo.tags && repo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {repo.tags.slice(0, 4).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pin repositories ({pinned.length}/{MAX_PINS})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {allRepos.length === 0 && (
              <p className="text-sm text-muted-foreground">You don't have any repositories yet.</p>
            )}
            {allRepos.map((repo) => {
              const isPinned = pinned.some((p) => p.id === repo.id);
              return (
                <button
                  key={repo.id}
                  onClick={() => togglePin(repo.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-md border text-left transition ${
                    isPinned ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{repo.name}</p>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground truncate">{repo.description}</p>
                    )}
                  </div>
                  {isPinned ? <X className="h-4 w-4 shrink-0" /> : <Pin className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

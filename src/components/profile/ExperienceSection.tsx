import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, GraduationCap, Award, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

type Kind = 'work' | 'education' | 'certification';

interface ExperienceItem {
  id: string;
  user_id: string;
  kind: Kind;
  title: string;
  organization: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  sort_order: number;
}

const kindIcon = { work: Briefcase, education: GraduationCap, certification: Award };
const kindLabel = { work: 'Experience', education: 'Education', certification: 'Certification' };

const fmt = (d: string | null) => (d ? format(new Date(d), 'MMM yyyy') : '');

export const ExperienceSection: React.FC<{ userId: string; isOwner: boolean; showHeading?: boolean }> = ({ userId, isOwner, showHeading = true }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<ExperienceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ExperienceItem | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_experience' as any)
      .select('*')
      .eq('user_id', userId)
      .order('is_current', { ascending: false })
      .order('start_date', { ascending: false, nullsFirst: false });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const startAdd = () => {
    setEditing({
      id: '',
      user_id: userId,
      kind: 'work',
      title: '',
      organization: '',
      location: '',
      start_date: null,
      end_date: null,
      is_current: false,
      description: '',
      sort_order: 0,
    });
    setOpen(true);
  };

  const startEdit = (item: ExperienceItem) => {
    setEditing(item);
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    const payload = {
      user_id: userId,
      kind: editing.kind,
      title: editing.title.trim(),
      organization: editing.organization || null,
      location: editing.location || null,
      start_date: editing.start_date || null,
      end_date: editing.is_current ? null : editing.end_date || null,
      is_current: editing.is_current,
      description: editing.description || null,
    };
    const { error } = editing.id
      ? await supabase.from('user_experience' as any).update(payload).eq('id', editing.id)
      : await supabase.from('user_experience' as any).insert(payload);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing.id ? 'Updated' : 'Added' });
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const { error } = await supabase.from('user_experience' as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 px-0 ${showHeading ? '' : 'pt-0'}`}>
        {showHeading && <CardTitle>Experience & Education</CardTitle>}
        {isOwner && (
          <Button size="sm" variant="outline" onClick={startAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/70 px-5 py-10 text-center">
            <Briefcase className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Experience and education will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-5">
            {items.map((item) => {
              const Icon = kindIcon[item.kind];
              return (
                <li key={item.id} className="flex gap-4 group">
                  <div className="mt-1 h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{item.title}</h4>
                        {item.organization && (
                          <p className="text-sm text-muted-foreground truncate">
                            {item.organization}
                            {item.location ? ` · ${item.location}` : ''}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fmt(item.start_date)} — {item.is_current ? 'Present' : fmt(item.end_date) || '—'}
                        </p>
                        {item.description && (
                          <p className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{item.description}</p>
                        )}
                      </div>
                      {isOwner && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit entry' : 'Add entry'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select value={editing.kind} onValueChange={(v: Kind) => setEditing({ ...editing, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">{kindLabel.work}</SelectItem>
                    <SelectItem value="education">{kindLabel.education}</SelectItem>
                    <SelectItem value="certification">{kindLabel.certification}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title *</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder={editing.kind === 'work' ? 'Senior Engineer' : editing.kind === 'education' ? 'B.Sc Computer Science' : 'AWS Certified'}
                />
              </div>
              <div>
                <Label>Organization</Label>
                <Input
                  value={editing.organization || ''}
                  onChange={(e) => setEditing({ ...editing, organization: e.target.value })}
                  placeholder={editing.kind === 'work' ? 'Company name' : 'School / Issuer'}
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={editing.location || ''}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start date</Label>
                  <Input
                    type="month"
                    value={editing.start_date ? editing.start_date.substring(0, 7) : ''}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value ? `${e.target.value}-01` : null })}
                  />
                </div>
                <div>
                  <Label>End date</Label>
                  <Input
                    type="month"
                    disabled={editing.is_current}
                    value={editing.end_date ? editing.end_date.substring(0, 7) : ''}
                    onChange={(e) => setEditing({ ...editing, end_date: e.target.value ? `${e.target.value}-01` : null })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_current"
                  checked={editing.is_current}
                  onCheckedChange={(c) => setEditing({ ...editing, is_current: !!c })}
                />
                <Label htmlFor="is_current" className="cursor-pointer">I'm currently in this role</Label>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editing.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="What did you do / learn?"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

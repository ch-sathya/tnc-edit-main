import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp } from 'lucide-react';

interface Props {
  profileUserId: string;
  skills: string[];
}

interface EndorsementRow {
  skill: string;
  endorser_id: string;
}

export const EndorsableSkills: React.FC<Props> = ({ profileUserId, skills }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<EndorsementRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('skill_endorsements' as any)
      .select('skill, endorser_id')
      .eq('profile_user_id', profileUserId);
    setRows((data as any) || []);
  };

  useEffect(() => {
    load();
  }, [profileUserId]);

  if (!skills || skills.length === 0) return null;

  const isOwner = user?.id === profileUserId;

  const toggle = async (skill: string) => {
    if (!user || isOwner) return;
    setBusy(skill);
    const mine = rows.find((r) => r.skill === skill && r.endorser_id === user.id);
    try {
      if (mine) {
        const { error } = await supabase
          .from('skill_endorsements' as any)
          .delete()
          .eq('profile_user_id', profileUserId)
          .eq('endorser_id', user.id)
          .eq('skill', skill);
        if (error) throw error;
        setRows(rows.filter((r) => !(r.skill === skill && r.endorser_id === user.id)));
      } else {
        const { error } = await supabase
          .from('skill_endorsements' as any)
          .insert({ profile_user_id: profileUserId, endorser_id: user.id, skill });
        if (error) throw error;
        setRows([...rows, { skill, endorser_id: user.id }]);
      }
    } catch (e: any) {
      toast({ title: 'Could not update endorsement', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => {
        const count = rows.filter((r) => r.skill === skill).length;
        const mine = !!user && rows.some((r) => r.skill === skill && r.endorser_id === user.id);
        return (
          <Badge
            key={skill}
            variant={mine ? 'default' : 'secondary'}
            className={`gap-1.5 py-1 px-2.5 ${!isOwner && user ? 'cursor-pointer hover:opacity-80' : ''}`}
            onClick={() => !isOwner && user && busy !== skill && toggle(skill)}
            title={isOwner ? 'Your skill' : mine ? 'Remove endorsement' : 'Endorse'}
          >
            <span>{skill}</span>
            {count > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] opacity-80">
                <ThumbsUp className="h-2.5 w-2.5" />
                {count}
              </span>
            )}
          </Badge>
        );
      })}
    </div>
  );
};

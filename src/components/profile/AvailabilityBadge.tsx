import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Users, Search, Coffee } from 'lucide-react';

const map: Record<string, { label: string; icon: any; cls: string }> = {
  open_to_work: { label: 'Open to work', icon: Search, cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  open_to_collab: { label: 'Open to collaborate', icon: Users, cls: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  open_to_hire: { label: 'Hiring', icon: Briefcase, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  not_available: { label: 'Not available', icon: Coffee, cls: 'bg-muted text-muted-foreground border-border' },
};

export const AvailabilityBadge: React.FC<{ value?: string | null }> = ({ value }) => {
  if (!value || !map[value]) return null;
  const { label, icon: Icon, cls } = map[value];
  return (
    <Badge variant="outline" className={`gap-1.5 py-1 ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

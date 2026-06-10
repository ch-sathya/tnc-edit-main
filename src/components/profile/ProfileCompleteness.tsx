import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle } from 'lucide-react';

interface ProfileLike {
  avatar_url?: string | null;
  display_name?: string | null;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  skills?: string[] | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  website?: string | null;
  banner_url?: string | null;
  availability?: string | null;
}

const checks = (p: ProfileLike) => [
  { label: 'Profile photo', done: !!p.avatar_url },
  { label: 'Display name', done: !!p.display_name },
  { label: 'Headline', done: !!p.headline },
  { label: 'Bio', done: !!p.bio },
  { label: 'Location', done: !!p.location },
  { label: 'Skills (3+)', done: (p.skills?.length ?? 0) >= 3 },
  { label: 'One social link', done: !!(p.github_url || p.linkedin_url || p.website) },
  { label: 'Banner image', done: !!p.banner_url },
  { label: 'Availability', done: !!p.availability },
];

export const ProfileCompleteness: React.FC<{ profile: ProfileLike; onEdit?: () => void }> = ({ profile, onEdit }) => {
  const items = checks(profile);
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  if (pct === 100) return null;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Profile strength</h3>
          <p className="text-xs text-muted-foreground">{pct}% complete — finish your profile to stand out.</p>
        </div>
        {onEdit && (
          <button onClick={onEdit} className="text-xs font-medium text-primary hover:underline">
            Complete profile →
          </button>
        )}
      </div>
      <Progress value={pct} className="h-2 mb-4" />
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2 text-xs">
            {i.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
            )}
            <span className={i.done ? 'text-muted-foreground line-through' : 'text-foreground'}>{i.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

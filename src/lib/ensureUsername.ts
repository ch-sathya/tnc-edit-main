import { supabase } from '@/integrations/supabase/client';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

/**
 * Guarantees the signed-in user has a public username so their portfolio can be shared.
 * Generates a unique slug from display name / email when one is missing.
 */
export async function ensureUsername(
  userId: string,
  seeds: (string | null | undefined)[]
): Promise<string | null> {
  const base =
    seeds.map((s) => slugify(s?.split('@')[0] ?? '')).find((s) => s.length >= 3) ||
    `dev-${userId.slice(0, 6)}`;

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: taken } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', candidate)
      .maybeSingle();

    if (taken && taken.user_id !== userId) continue;

    const { error } = await supabase
      .from('profiles')
      .update({ username: candidate, is_username_set: true })
      .eq('user_id', userId);

    if (!error) return candidate;
  }

  return null;
}

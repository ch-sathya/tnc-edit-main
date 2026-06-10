import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Profile {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  headline: string | null;
  banner_url: string | null;
  availability: string | null;
  is_public: boolean | null;
  location: string | null;
  website: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  skills: string[] | null;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, bio, headline, banner_url, availability, is_public, location, website, github_url, linkedin_url, twitter_url, skills')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      setProfile(data as any);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, refresh: fetchProfile };
};

import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures a user profile exists, creating one if necessary
 */
export const ensureUserProfile = async (userId: string): Promise<void> => {
  try {
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "not found"
      throw new Error(`Failed to check user profile: ${fetchError.message}`);
    }

    if (!existingProfile) {
      // Profile doesn't exist, create it
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          username: null,
          display_name: null,
          avatar_url: null,
          bio: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        throw new Error(`Failed to create user profile: ${insertError.message}`);
      }
    }
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    throw error;
  }
};
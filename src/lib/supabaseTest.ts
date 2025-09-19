import { supabase } from '@/integrations/supabase/client';

/**
 * Test basic Supabase connectivity
 */
export const testSupabaseConnection = async () => {
  console.log('Testing Supabase connection...');
  console.log('Supabase URL:', supabase.supabaseUrl);
  console.log('Supabase Key:', supabase.supabaseKey?.substring(0, 20) + '...');
  
  try {
    // Test 1: Basic health check
    const response = await fetch(`${supabase.supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabase.supabaseKey || '',
        'Authorization': `Bearer ${supabase.supabaseKey}`,
      },
    });
    
    console.log('Health check response:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error('Health check failed:', await response.text());
      return false;
    }
    
    // Test 2: Auth status
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('Auth session:', { authData, authError });
    
    // Test 3: Simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Simple query failed:', error);
      return false;
    }
    
    console.log('✓ Supabase connection successful');
    return true;
    
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};
import { supabase } from '@/integrations/supabase/client';

/**
 * Test database connectivity and table access
 */
export const testDatabaseConnection = async () => {
  console.log('Testing database connection...');
  
  try {
    // Test 1: Basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error('Connection test failed:', connectionError);
      return false;
    }
    
    console.log('✓ Database connection successful');
    
    // Test 2: Check if community_groups table exists
    const { data: groupsTest, error: groupsError } = await supabase
      .from('community_groups')
      .select('count', { count: 'exact', head: true });
    
    if (groupsError) {
      console.error('Community groups table test failed:', groupsError);
      return false;
    }
    
    console.log('✓ Community groups table accessible');
    
    // Test 3: Check if group_memberships table exists
    const { data: membershipsTest, error: membershipsError } = await supabase
      .from('group_memberships')
      .select('count', { count: 'exact', head: true });
    
    if (membershipsError) {
      console.error('Group memberships table test failed:', membershipsError);
      return false;
    }
    
    console.log('✓ Group memberships table accessible');
    
    // Test 4: Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('User authentication test failed:', userError);
      return false;
    }
    
    console.log('✓ User authentication:', user ? `Logged in as ${user.email}` : 'Not logged in');
    
    // Test 5: Try to insert a test record (and immediately delete it)
    if (user) {
      try {
        const testGroupName = `Test Group ${Date.now()}`;
        const { data: testGroup, error: insertError } = await supabase
          .from('community_groups')
          .insert({
            name: testGroupName,
            description: 'Test group for database connectivity',
            owner_id: user.id
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Insert test failed:', insertError);
          console.log('✗ Insert permissions denied or profile missing');
        } else {
          console.log('✓ Insert permissions working');
          
          // Clean up test record
          await supabase
            .from('community_groups')
            .delete()
            .eq('id', testGroup.id);
          
          console.log('✓ Test record cleaned up');
        }
      } catch (insertTestError) {
        console.error('Insert test exception:', insertTestError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Database test failed with exception:', error);
    return false;
  }
};
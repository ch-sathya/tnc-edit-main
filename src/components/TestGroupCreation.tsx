import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCommunityGroup } from '@/hooks/useCommunityGroups';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { testDatabaseConnection } from '@/lib/databaseTest';
import { testSupabaseConnection } from '@/lib/supabaseTest';

const TestGroupCreation: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { user } = useAuth();
  const createGroupMutation = useCreateCommunityGroup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const result = await createGroupMutation.mutateAsync({
        name: name.trim(),
        description: description.trim(),
      });
      
      toast.success(`Group "${result.name}" created successfully!`);
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Test group creation error:', error);
      toast.error('Failed to create group');
    }
  };

  const handleDatabaseTest = async () => {
    const success = await testDatabaseConnection();
    if (success) {
      toast.success('Database connection test passed!');
    } else {
      toast.error('Database connection test failed - check console for details');
    }
  };

  const handleSupabaseTest = async () => {
    const success = await testSupabaseConnection();
    if (success) {
      toast.success('Supabase connection test passed!');
    } else {
      toast.error('Supabase connection test failed - check console for details');
    }
  };

  if (!user) {
    return <div>Please log in to test group creation</div>;
  }

  return (
    <div className="p-4 border rounded-lg max-w-md">
      <h3 className="text-lg font-semibold mb-4">Test Group Creation</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="test-name">Group Name:</label>
          <Input
            id="test-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name"
          />
        </div>
        <div>
          <label htmlFor="test-description">Description:</label>
          <Textarea
            id="test-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
          />
        </div>
        <Button 
          type="submit" 
          disabled={createGroupMutation.isPending}
          className="w-full"
        >
          {createGroupMutation.isPending ? 'Creating...' : 'Create Test Group'}
        </Button>
        
        <Button 
          type="button" 
          onClick={handleSupabaseTest}
          variant="outline"
          className="w-full"
        >
          Test Supabase Connection
        </Button>
        
        <Button 
          type="button" 
          onClick={handleDatabaseTest}
          variant="outline"
          className="w-full"
        >
          Test Database Tables
        </Button>
      </form>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>User ID: {user.id}</p>
        <p>User Email: {user.email}</p>
        <p>Auth Status: {user ? 'Authenticated' : 'Not authenticated'}</p>
      </div>
    </div>
  );
};

export default TestGroupCreation;
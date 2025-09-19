import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function UsernameSetup() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkUsername = async (value: string) => {
    if (!value || value.length < 3) {
      setAvailable(null);
      return;
    }

    // Basic username validation
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(value)) {
      setAvailable(false);
      return;
    }

    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', value.toLowerCase())
        .single();

      setAvailable(!data);
    } catch (error) {
      // If no data found, username is available
      setAvailable(true);
    } finally {
      setChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    
    // Debounce the check
    const timeoutId = setTimeout(() => {
      checkUsername(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !username || !available) return;

    setLoading(true);
    try {
      // Check if user already has a profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username, is_username_set')
        .eq('user_id', user.id)
        .single();

      if (existingProfile && existingProfile.is_username_set) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({ 
            username: username.toLowerCase(),
            is_username_set: true 
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new profile or update incomplete one
        const { error } = await supabase
          .from('profiles')
          .upsert([
            {
              user_id: user.id,
              username: username.toLowerCase(),
              is_username_set: true,
              display_name: user.user_metadata?.full_name || username,
            }
          ]);

        if (error) throw error;
      }

      toast({
        title: 'Username set successfully!',
        description: `Your portfolio is now available at /@${username}`,
      });

      navigate(`/@${username}`);
    } catch (error: any) {
      toast({
        title: 'Error setting username',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Choose Your Username</CardTitle>
          <CardDescription>
            Your username will be part of your portfolio URL and cannot be changed later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-muted-foreground text-sm">@</span>
                </div>
                <Input
                  id="username"
                  type="text"
                  placeholder="yourname"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="pl-8"
                  disabled={loading}
                  minLength={3}
                  maxLength={30}
                />
              </div>
              
              {username && (
                <div className="text-sm">
                  {checking && <span className="text-muted-foreground">Checking availability...</span>}
                  {!checking && available === true && (
                    <span className="text-green-600">✓ Username available</span>
                  )}
                  {!checking && available === false && (
                    <span className="text-red-600">✗ Username not available</span>
                  )}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Your portfolio will be available at: yoursite.com/@{username || 'yourname'}
              </p>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Username requirements:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>3-30 characters long</li>
                <li>Only letters, numbers, hyphens, and underscores</li>
                <li>Cannot be changed once set</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !username || !available || checking}
            >
              {loading ? 'Setting up...' : 'Create Portfolio'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
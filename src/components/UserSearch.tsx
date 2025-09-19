import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, UserPlus, Users, MapPin, Github, Linkedin, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FriendSystem } from './FriendSystem';

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  location: string;
  skills: string[];
  github_url: string;
  linkedin_url: string;
  description: string;
}

interface UserSearchProps {
  onNavigate: (page: string) => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq('user_id', user?.id || '')
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Search failed",
        description: "Failed to search users. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const viewProfile = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  return (
    <>
      {/* Search Trigger Button */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="glass-card">
            <Search className="h-4 w-4 mr-2" />
            Find Users
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Find Developers</DialogTitle>
            <DialogDescription>
              Search for other developers to connect and collaborate with
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by username or display name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            <div className="overflow-y-auto max-h-96 space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Searching...</p>
                </div>
              ) : searchResults.length === 0 ? (
                searchTerm.length >= 2 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Type at least 2 characters to search</p>
                  </div>
                )
              ) : (
                searchResults.map((profile) => (
                  <Card key={profile.user_id} className="glass-card hover:border-foreground/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={profile.avatar_url || '/placeholder.svg'} />
                          <AvatarFallback>
                            {profile.display_name?.charAt(0) || profile.username?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {profile.display_name || profile.username}
                              </h3>
                              {profile.username && (
                                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                              )}
                              {profile.bio && (
                                <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
                              )}
                              {profile.location && (
                                <div className="flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{profile.location}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewProfile(profile)}
                              >
                                View Profile
                              </Button>
                              <FriendSystem targetUserId={profile.user_id} />
                            </div>
                          </div>
                          
                          {profile.skills && profile.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {profile.skills.slice(0, 3).map((skill, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {profile.skills.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{profile.skills.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Detail Modal */}
      <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
        <DialogContent className="max-w-2xl">
          {selectedProfile && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Developer Profile</DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProfile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="flex items-start gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={selectedProfile.avatar_url || '/placeholder.svg'} />
                    <AvatarFallback className="text-2xl">
                      {selectedProfile.display_name?.charAt(0) || selectedProfile.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">
                          {selectedProfile.display_name || selectedProfile.username}
                        </h2>
                        {selectedProfile.username && (
                          <p className="text-muted-foreground">@{selectedProfile.username}</p>
                        )}
                        {selectedProfile.bio && (
                          <p className="text-foreground mt-2">{selectedProfile.bio}</p>
                        )}
                      </div>
                      <FriendSystem targetUserId={selectedProfile.user_id} />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {selectedProfile.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {selectedProfile.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedProfile.description && (
                  <div>
                    <h3 className="font-semibold mb-2">About</h3>
                    <p className="text-foreground leading-relaxed">{selectedProfile.description}</p>
                  </div>
                )}

                {selectedProfile.skills && selectedProfile.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedProfile.github_url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(selectedProfile.github_url, '_blank')}
                    >
                      <Github className="h-4 w-4 mr-2" />
                      GitHub
                    </Button>
                  )}
                  {selectedProfile.linkedin_url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(selectedProfile.linkedin_url, '_blank')}
                    >
                      <Linkedin className="h-4 w-4 mr-2" />
                      LinkedIn
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
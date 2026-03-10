import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Home, Users, Plus, Flame, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import CommunityGroupList from '@/components/CommunityGroupList';
import CreateGroupModal from '@/components/CreateGroupModal';
import GroupChat from '@/components/GroupChat';
import GroupMembersModal from '@/components/GroupMembersModal';
import GroupSettingsModal from '@/components/GroupSettingsModal';
import CommunityErrorBoundary from '@/components/CommunityErrorBoundary';
import PostCard from '@/components/community/PostCard';
import PostDetail from '@/components/community/PostDetail';
import CreatePostModal from '@/components/community/CreatePostModal';
import GroupSidebar from '@/components/community/GroupSidebar';
import { useCommunityGroup, useJoinCommunityGroup, useLeaveCommunityGroup } from '@/hooks/useCommunityGroups';
import { useCommunityPosts, CommunityPost } from '@/hooks/useCommunityPosts';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CommunityGroup } from '@/types/community';

const Community = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'posts' | 'chat'>('posts');
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const { data: selectedGroup } = useCommunityGroup(selectedGroupId || '');
  const { data: posts, isLoading: postsLoading } = useCommunityPosts(selectedGroupId || '', sortBy);
  const joinMutation = useJoinCommunityGroup();
  const leaveMutation = useLeaveCommunityGroup();

  const handleGroupSelect = (groupId: string) => {
    if (!user) {
      toast.error('You must be logged in to access groups');
      return;
    }
    setSelectedGroupId(groupId);
    setSelectedPostId(null);
    setActiveView('posts');
  };

  const handleBackToGroups = () => {
    setSelectedGroupId(null);
    setSelectedPostId(null);
  };

  const selectedPost = posts?.find(p => p.id === selectedPostId);

  const isMod = selectedGroup?.is_owner || false;

  // Group view with Reddit-style posts
  if (selectedGroupId && selectedGroup) {
    return (
      <>
        <Navigation />
        <CommunityErrorBoundary feature="groups">
          <div className="min-h-screen bg-background">
            {/* Group header banner */}
            <div className="border-b bg-card">
              <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={() => navigate('/')} className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                        <Home className="h-4 w-4" />Home
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink onClick={handleBackToGroups} className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                        <Users className="h-4 w-4" />Community
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{selectedGroup.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{selectedGroup.name}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedGroup.member_count || 0} members
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleBackToGroups}>
                      <ArrowLeft className="h-4 w-4 mr-2" />Back
                    </Button>
                  </div>
                </div>

                {/* View tabs */}
                <div className="mt-4 flex gap-2">
                  <Button
                    variant={activeView === 'posts' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => { setActiveView('posts'); setSelectedPostId(null); }}
                  >
                    Posts
                  </Button>
                  {selectedGroup.is_member && (
                    <Button
                      variant={activeView === 'chat' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('chat')}
                    >
                      Chat
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4">
              {activeView === 'chat' && selectedGroup.is_member ? (
                <div className="max-w-3xl">
                  <GroupChat groupId={selectedGroupId} onBack={() => setActiveView('posts')} />
                </div>
              ) : (
                <div className="flex gap-6">
                  {/* Main feed */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {selectedPostId && selectedPost ? (
                      <PostDetail post={selectedPost} onBack={() => setSelectedPostId(null)} />
                    ) : (
                      <>
                        {/* Sort bar + create post */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center bg-card border rounded-lg p-1 gap-0.5">
                            <Button
                              variant={sortBy === 'hot' ? 'secondary' : 'ghost'}
                              size="sm"
                              className="h-7 px-3 text-xs gap-1.5"
                              onClick={() => setSortBy('hot')}
                            >
                              <Flame className="h-3.5 w-3.5" />Hot
                            </Button>
                            <Button
                              variant={sortBy === 'new' ? 'secondary' : 'ghost'}
                              size="sm"
                              className="h-7 px-3 text-xs gap-1.5"
                              onClick={() => setSortBy('new')}
                            >
                              <Clock className="h-3.5 w-3.5" />New
                            </Button>
                            <Button
                              variant={sortBy === 'top' ? 'secondary' : 'ghost'}
                              size="sm"
                              className="h-7 px-3 text-xs gap-1.5"
                              onClick={() => setSortBy('top')}
                            >
                              <TrendingUp className="h-3.5 w-3.5" />Top
                            </Button>
                          </div>

                          {selectedGroup.is_member && (
                            <Button size="sm" onClick={() => setShowCreatePostModal(true)}>
                              <Plus className="h-4 w-4 mr-2" />Create Post
                            </Button>
                          )}
                        </div>

                        {/* Posts feed */}
                        {postsLoading ? (
                          <div className="text-center text-muted-foreground py-12">Loading posts...</div>
                        ) : posts && posts.length > 0 ? (
                          <div className="space-y-2">
                            {posts.map(post => (
                              <PostCard
                                key={post.id}
                                post={post}
                                onOpenPost={(id) => setSelectedPostId(id)}
                                isMod={isMod}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-16 text-muted-foreground">
                            <p className="text-lg font-medium mb-2">No posts yet</p>
                            <p className="text-sm mb-4">Be the first to start a discussion!</p>
                            {selectedGroup.is_member && (
                              <Button onClick={() => setShowCreatePostModal(true)}>
                                <Plus className="h-4 w-4 mr-2" />Create Post
                              </Button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Sidebar - hidden on mobile */}
                  <div className="hidden lg:block w-80 flex-shrink-0">
                    <GroupSidebar
                      group={selectedGroup}
                      onJoin={() => joinMutation.mutate(selectedGroupId)}
                      onLeave={() => leaveMutation.mutate(selectedGroupId)}
                      onSettings={() => setShowSettingsModal(true)}
                      onMembers={() => setShowMembersModal(true)}
                      onChat={() => setActiveView('chat')}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modals */}
          <CreatePostModal
            open={showCreatePostModal}
            onOpenChange={setShowCreatePostModal}
            groupId={selectedGroupId}
          />
          <GroupMembersModal
            open={showMembersModal}
            onOpenChange={setShowMembersModal}
            groupId={selectedGroupId}
            groupName={selectedGroup.name}
          />
          {selectedGroup && (
            <GroupSettingsModal
              open={showSettingsModal}
              onOpenChange={setShowSettingsModal}
              group={selectedGroup}
            />
          )}
        </CommunityErrorBoundary>
      </>
    );
  }

  // Group list view
  return (
    <>
      <Navigation />
      <CommunityErrorBoundary feature="groups">
        <main className="min-h-screen bg-background p-3 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <header className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Community</h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                Join communities, share posts, and discuss with other developers
              </p>
            </header>

            <CommunityGroupList onCreateGroup={() => setShowCreateModal(true)} onGroupSelect={handleGroupSelect} />
            <CreateGroupModal open={showCreateModal} onOpenChange={setShowCreateModal} />
          </div>
        </main>
      </CommunityErrorBoundary>
    </>
  );
};

export default Community;

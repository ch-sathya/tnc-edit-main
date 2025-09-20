import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Users, MessageCircle, Code2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CommunityGroupList from '@/components/CommunityGroupList';
import CreateGroupModal from '@/components/CreateGroupModal';
import GroupChat from '@/components/GroupChat';
import CollaborativeEditor from '@/components/collaboration/CollaborativeEditor';
import CollaborationRoomManager from '@/components/collaboration/CollaborationRoomManager';
import CommunityErrorBoundary from '@/components/CommunityErrorBoundary';

import { useCommunityGroup } from '@/hooks/useCommunityGroups';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Community = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'collaborate' | 'rooms'>('chat');

  // Fetch selected group data for breadcrumb
  const { data: selectedGroup } = useCommunityGroup(selectedGroupId || '');

  const handleCreateGroup = () => {
    setShowCreateModal(true);
  };

  const handleGroupSelect = (groupId: string) => {
    // Verify user is authenticated before allowing chat access
    if (!user) {
      toast.error('You must be logged in to access group chats');
      return;
    }
    setSelectedGroupId(groupId);
  };

  const handleBackToGroups = () => {
    setSelectedGroupId(null);
    setActiveTab('chat');
  };

  // Check if user has collaboration permissions
  const hasCollaborationAccess = selectedGroup?.is_member || false;

  // If a group is selected, show the group interface with tabs
  if (selectedGroupId) {
    return (
      <CommunityErrorBoundary feature="chat">
        <div className="min-h-screen bg-background p-3 sm:p-6">
          <div className="max-w-7xl mx-auto h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-3rem)] flex flex-col">
            {/* Breadcrumb Navigation */}
            <nav className="mb-4" role="navigation" aria-label="Breadcrumb navigation">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={() => navigate('/')}
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate('/');
                        }
                      }}
                      aria-label="Go to home page"
                    >
                      <Home className="h-4 w-4" />
                      Home
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={handleBackToGroups}
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleBackToGroups();
                        }
                      }}
                      aria-label="Go back to community groups"
                    >
                      <Users className="h-4 w-4" />
                      Community
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="flex items-center gap-1">
                      {activeTab === 'chat' ? (
                        <MessageCircle className="h-4 w-4" />
                      ) : activeTab === 'rooms' ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        <Code2 className="h-4 w-4" />
                      )}
                      {selectedGroup?.name || 'Group'} - {
                        activeTab === 'chat' ? 'Chat' : 
                        activeTab === 'rooms' ? 'Rooms' : 
                        'Editor'
                      }
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </nav>

            {/* Group Interface with Tabs */}
            <div className="flex-1">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'collaborate' | 'rooms')} className="h-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="grid w-auto grid-cols-3">
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="rooms" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Rooms
                    </TabsTrigger>
                    <TabsTrigger 
                      value="collaborate" 
                      className="flex items-center gap-2"
                      disabled={!hasCollaborationAccess}
                    >
                      <Code2 className="h-4 w-4" />
                      Editor
                      {!hasCollaborationAccess && (
                        <span className="text-xs text-muted-foreground ml-1">(Members Only)</span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleBackToGroups}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Groups
                  </Button>
                </div>

                <TabsContent value="chat" className="h-[calc(100%-4rem)] mt-0">
                  <GroupChat 
                    groupId={selectedGroupId} 
                    onBack={handleBackToGroups}
                  />
                </TabsContent>

                <TabsContent value="rooms" className="h-[calc(100%-4rem)] mt-0">
                  <CollaborationRoomManager 
                    groupId={selectedGroupId}
                    onStartCollaboration={() => setActiveTab('collaborate')}
                    className="h-full"
                  />
                </TabsContent>

                <TabsContent value="collaborate" className="h-[calc(100%-4rem)] mt-0">
                  <CommunityErrorBoundary feature="collaboration">
                    {hasCollaborationAccess ? (
                      <CollaborativeEditor 
                        groupId={selectedGroupId}
                        className="h-full"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-4 max-w-md">
                          <Code2 className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold">Collaboration Access Required</h3>
                            <p className="text-muted-foreground">
                              You need to be a member of this group to access the collaborative editor.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Join the group from the community page to start collaborating on code with other members.
                            </p>
                          </div>
                          <Button onClick={handleBackToGroups} variant="outline">
                            Back to Groups
                          </Button>
                        </div>
                      </div>
                    )}
                  </CommunityErrorBoundary>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </CommunityErrorBoundary>
    );
  }

  return (
    <CommunityErrorBoundary feature="groups">
      <main className="min-h-screen bg-background p-3 sm:p-6" role="main">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="mb-6" role="navigation" aria-label="Breadcrumb navigation">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-1 cursor-pointer hover:text-foreground"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate('/');
                      }
                    }}
                    aria-label="Go to home page"
                  >
                    <Home className="h-4 w-4" />
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Community
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </nav>

          {/* Legacy back button for mobile users who prefer it */}
          <div className="flex items-center gap-4 mb-6 sm:hidden">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              aria-label="Go back to home page"
              className="min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span>Back</span>
            </Button>
          </div>
          
          <header className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Community</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Connect with other developers and join discussions
            </p>
          </header>
          
          <CommunityGroupList 
            onCreateGroup={handleCreateGroup}
            onGroupSelect={handleGroupSelect}
          />
          
          <CreateGroupModal 
            open={showCreateModal} 
            onOpenChange={setShowCreateModal} 
          />
        </div>
      </main>
    </CommunityErrorBoundary>
  );
};

export default Community;
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Users, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import CommunityGroupList from '@/components/CommunityGroupList';
import CreateGroupModal from '@/components/CreateGroupModal';
import GroupChat from '@/components/GroupChat';
import CommunityErrorBoundary from '@/components/CommunityErrorBoundary';
import TestGroupCreation from '@/components/TestGroupCreation';
import { useCommunityGroup } from '@/hooks/useCommunityGroups';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Community = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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
  };

  // If a group is selected, show the chat interface
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
                      <MessageCircle className="h-4 w-4" />
                      {selectedGroup?.name || 'Chat'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </nav>

            {/* Chat Interface */}
            <div className="flex-1">
              <GroupChat 
                groupId={selectedGroupId} 
                onBack={handleBackToGroups}
              />
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
          
          {/* Temporary test component for debugging */}
          <div className="mt-8">
            <TestGroupCreation />
          </div>
          
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
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Users, Crown, Shield, MessageCircle, Settings, BookOpen, UserPlus, UserMinus } from 'lucide-react';
import { CommunityGroup } from '@/types/community';
import { useGroupRules, GroupRule } from '@/hooks/useCommunityPosts';
import { formatDistanceToNow } from 'date-fns';

interface GroupSidebarProps {
  group: CommunityGroup;
  onJoin?: () => void;
  onLeave?: () => void;
  onSettings?: () => void;
  onMembers?: () => void;
  onChat?: () => void;
}

const GroupSidebar: React.FC<GroupSidebarProps> = ({ group, onJoin, onLeave, onSettings, onMembers, onChat }) => {
  const { data: rules } = useGroupRules(group.id);

  return (
    <div className="space-y-4">
      {/* About card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">About Community</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {group.description || 'No description provided.'}
          </p>
          <Separator />
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{group.member_count || 0}</span>
            <span className="text-muted-foreground">members</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Created {formatDistanceToNow(new Date(group.created_at || Date.now()), { addSuffix: true })}
          </div>
          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            {!group.is_member && !group.is_owner && onJoin && (
              <Button onClick={onJoin} className="w-full" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Join Community
              </Button>
            )}
            {group.is_member && onChat && (
              <Button onClick={onChat} variant="outline" className="w-full" size="sm">
                <MessageCircle className="h-4 w-4 mr-2" />
                Group Chat
              </Button>
            )}
            {group.is_member && onMembers && (
              <Button onClick={onMembers} variant="outline" className="w-full" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Members
              </Button>
            )}
            {group.is_owner && onSettings && (
              <Button onClick={onSettings} variant="outline" className="w-full" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Mod Settings
              </Button>
            )}
            {group.is_member && onLeave && (
              <Button onClick={onLeave} variant="ghost" className="w-full text-muted-foreground" size="sm">
                <UserMinus className="h-4 w-4 mr-2" />
                Leave
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      {rules && rules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Community Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id}>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-muted-foreground min-w-[20px]">
                    {rule.rule_number}.
                  </span>
                  <div>
                    <p className="text-sm font-medium">{rule.title}</p>
                    {rule.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Moderators */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Moderators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {group.is_owner && (
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span>You (Owner)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupSidebar;

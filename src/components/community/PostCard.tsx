import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowBigUp, 
  ArrowBigDown, 
  MessageSquare, 
  MoreHorizontal, 
  Pin, 
  Lock, 
  Trash2, 
  Shield,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CommunityPost, useVote, useTogglePinPost, useToggleLockPost, useDeletePost } from '@/hooks/useCommunityPosts';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: CommunityPost;
  onOpenPost: (postId: string) => void;
  isMod?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, onOpenPost, isMod }) => {
  const { user } = useAuth();
  const voteMutation = useVote();
  const pinMutation = useTogglePinPost();
  const lockMutation = useToggleLockPost();
  const deleteMutation = useDeletePost();

  const score = post.upvotes - post.downvotes;
  const isAuthor = user?.id === post.user_id;
  const authorName = post.author?.display_name || post.author?.username || 'Anonymous';

  const handleVote = (e: React.MouseEvent, voteType: 1 | -1) => {
    e.stopPropagation();
    if (!user) return;
    voteMutation.mutate({ post_id: post.id, vote_type: voteType });
  };

  return (
    <Card 
      className={cn(
        "hover:border-primary/30 transition-colors cursor-pointer group",
        post.is_pinned && "border-l-4 border-l-primary"
      )}
      onClick={() => onOpenPost(post.id)}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-3">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-sm",
                post.user_vote === 1 && "text-primary bg-primary/10"
              )}
              onClick={(e) => handleVote(e, 1)}
              disabled={!user}
            >
              <ArrowBigUp className="h-5 w-5" />
            </Button>
            <span className={cn(
              "text-sm font-bold tabular-nums",
              score > 0 && "text-primary",
              score < 0 && "text-destructive",
              score === 0 && "text-muted-foreground"
            )}>
              {score}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-sm",
                post.user_vote === -1 && "text-destructive bg-destructive/10"
              )}
              onClick={(e) => handleVote(e, -1)}
              disabled={!user}
            >
              <ArrowBigDown className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Meta line */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={post.author?.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">
                    {authorName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">
                  {authorName}
                </span>
              </div>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              {post.flair && (
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0"
                  style={{ backgroundColor: post.flair.color + '20', color: post.flair.color, borderColor: post.flair.color + '40' }}
                >
                  {post.flair.name}
                </Badge>
              )}
              {post.is_pinned && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">
                  <Pin className="h-2.5 w-2.5 mr-0.5" />
                  Pinned
                </Badge>
              )}
              {post.is_locked && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/50 text-yellow-600">
                  <Lock className="h-2.5 w-2.5 mr-0.5" />
                  Locked
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm sm:text-base">
              {post.title}
            </h3>

            {/* Content preview */}
            {post.content && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {post.content}
              </p>
            )}

            {/* Actions bar */}
            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={(e) => { e.stopPropagation(); onOpenPost(post.id); }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {post.comment_count} {post.comment_count === 1 ? 'comment' : 'comments'}
              </Button>

              {(isAuthor || isMod) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                    {isMod && (
                      <>
                        <DropdownMenuItem onClick={() => pinMutation.mutate({ postId: post.id, isPinned: post.is_pinned })}>
                          <Pin className="h-4 w-4 mr-2" />
                          {post.is_pinned ? 'Unpin' : 'Pin'} Post
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => lockMutation.mutate({ postId: post.id, isLocked: post.is_locked })}>
                          <Lock className="h-4 w-4 mr-2" />
                          {post.is_locked ? 'Unlock' : 'Lock'} Post
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {(isAuthor || isMod) && (
                      <DropdownMenuItem 
                        onClick={() => deleteMutation.mutate(post.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Post
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;

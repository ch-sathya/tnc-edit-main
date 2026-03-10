import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowBigUp, 
  ArrowBigDown, 
  MessageSquare, 
  ArrowLeft, 
  Pin, 
  Lock, 
  Send,
  Reply,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  CommunityPost, 
  PostComment, 
  usePostComments, 
  useCreateComment, 
  useVote 
} from '@/hooks/useCommunityPosts';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PostDetailProps {
  post: CommunityPost;
  onBack: () => void;
}

const PostDetail: React.FC<PostDetailProps> = ({ post, onBack }) => {
  const { user } = useAuth();
  const { data: comments, isLoading: commentsLoading } = usePostComments(post.id);
  const createComment = useCreateComment();
  const voteMutation = useVote();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const score = post.upvotes - post.downvotes;
  const authorName = post.author?.display_name || post.author?.username || 'Anonymous';

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;
    try {
      await createComment.mutateAsync({ post_id: post.id, content: newComment.trim() });
      setNewComment('');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return;
    try {
      await createComment.mutateAsync({ post_id: post.id, content: replyContent.trim(), parent_id: parentId });
      setReplyContent('');
      setReplyTo(null);
    } catch {
      toast.error('Failed to post reply');
    }
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Posts
      </Button>

      {/* Post */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex gap-4">
            {/* Vote column */}
            <div className="flex flex-col items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-sm", post.user_vote === 1 && "text-primary bg-primary/10")}
                onClick={() => user && voteMutation.mutate({ post_id: post.id, vote_type: 1 })}
                disabled={!user}
              >
                <ArrowBigUp className="h-6 w-6" />
              </Button>
              <span className={cn(
                "text-base font-bold",
                score > 0 && "text-primary",
                score < 0 && "text-destructive",
              )}>
                {score}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-sm", post.user_vote === -1 && "text-destructive bg-destructive/10")}
                onClick={() => user && voteMutation.mutate({ post_id: post.id, vote_type: -1 })}
                disabled={!user}
              >
                <ArrowBigDown className="h-6 w-6" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={post.author?.avatar_url || ''} />
                  <AvatarFallback className="text-xs">{authorName[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">{authorName}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
                {post.flair && (
                  <Badge variant="secondary" className="text-xs" style={{ backgroundColor: post.flair.color + '20', color: post.flair.color }}>
                    {post.flair.name}
                  </Badge>
                )}
                {post.is_pinned && <Badge variant="outline" className="text-xs border-primary/50 text-primary"><Pin className="h-3 w-3 mr-1" />Pinned</Badge>}
                {post.is_locked && <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-600"><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
              </div>

              <h1 className="text-xl font-bold text-foreground mb-3">{post.title}</h1>
              
              {post.content && (
                <div className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                  {post.content}
                </div>
              )}

              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                {post.comment_count} comments
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comment box */}
      {!post.is_locked && user && (
        <Card>
          <CardContent className="p-4">
            <Textarea
              placeholder="What are your thoughts?"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none mb-2"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmitComment} 
                disabled={!newComment.trim() || createComment.isPending}
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                Comment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {post.is_locked && (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground">
            <Lock className="h-5 w-5 mx-auto mb-2" />
            This post is locked. New comments cannot be added.
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <div className="space-y-2">
        {commentsLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading comments...</div>
        ) : comments && comments.length > 0 ? (
          comments.map(comment => (
            <CommentThread
              key={comment.id}
              comment={comment}
              postId={post.id}
              isLocked={post.is_locked}
              replyTo={replyTo}
              replyContent={replyContent}
              onSetReplyTo={setReplyTo}
              onSetReplyContent={setReplyContent}
              onSubmitReply={handleSubmitReply}
              depth={0}
            />
          ))
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  );
};

interface CommentThreadProps {
  comment: PostComment;
  postId: string;
  isLocked: boolean;
  replyTo: string | null;
  replyContent: string;
  onSetReplyTo: (id: string | null) => void;
  onSetReplyContent: (content: string) => void;
  onSubmitReply: (parentId: string) => void;
  depth: number;
}

const CommentThread: React.FC<CommentThreadProps> = ({
  comment, postId, isLocked, replyTo, replyContent,
  onSetReplyTo, onSetReplyContent, onSubmitReply, depth
}) => {
  const { user } = useAuth();
  const voteMutation = useVote();
  const score = comment.upvotes - comment.downvotes;
  const authorName = comment.author?.display_name || comment.author?.username || 'Anonymous';

  return (
    <div className={cn("relative", depth > 0 && "ml-4 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-muted")}>
      <div className="py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Avatar className="h-5 w-5">
            <AvatarImage src={comment.author?.avatar_url || ''} />
            <AvatarFallback className="text-[10px]">{authorName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{authorName}</span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
        </div>

        <p className="text-sm text-foreground whitespace-pre-wrap mb-1.5">{comment.content}</p>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost" size="icon"
              className={cn("h-6 w-6", comment.user_vote === 1 && "text-primary")}
              onClick={() => user && voteMutation.mutate({ comment_id: comment.id, vote_type: 1 })}
              disabled={!user}
            >
              <ArrowBigUp className="h-4 w-4" />
            </Button>
            <span className={cn("text-xs font-bold", score > 0 && "text-primary", score < 0 && "text-destructive")}>
              {score}
            </span>
            <Button
              variant="ghost" size="icon"
              className={cn("h-6 w-6", comment.user_vote === -1 && "text-destructive")}
              onClick={() => user && voteMutation.mutate({ comment_id: comment.id, vote_type: -1 })}
              disabled={!user}
            >
              <ArrowBigDown className="h-4 w-4" />
            </Button>
          </div>

          {!isLocked && user && depth < 4 && (
            <Button
              variant="ghost" size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => onSetReplyTo(replyTo === comment.id ? null : comment.id)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}
        </div>

        {/* Reply box */}
        {replyTo === comment.id && (
          <div className="mt-2 space-y-2">
            <Textarea
              placeholder={`Reply to ${authorName}...`}
              value={replyContent}
              onChange={(e) => onSetReplyContent(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => onSetReplyTo(null)}>Cancel</Button>
              <Button size="sm" onClick={() => onSubmitReply(comment.id)} disabled={!replyContent.trim()}>
                Reply
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map(reply => (
            <CommentThread
              key={reply.id}
              comment={reply}
              postId={postId}
              isLocked={isLocked}
              replyTo={replyTo}
              replyContent={replyContent}
              onSetReplyTo={onSetReplyTo}
              onSetReplyContent={onSetReplyContent}
              onSubmitReply={onSubmitReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PostDetail;

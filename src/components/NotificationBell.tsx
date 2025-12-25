import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Trash2, MessageSquare, Users, FolderOpen, X, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: any;
  read: boolean;
  created_at: string;
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
    };

    const fetchPendingRequests = async () => {
      // Fetch pending connection requests where user is the addressee
      const { data: requests } = await supabase
        .from('user_connections')
        .select('id, requester_id, created_at')
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

      if (requests && requests.length > 0) {
        // Get requester profiles
        const requesterIds = requests.map(r => r.requester_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', requesterIds);

        const requestsWithProfiles = requests.map(req => ({
          ...req,
          profile: profiles?.find(p => p.user_id === req.requester_id) || {
            user_id: req.requester_id,
            username: null,
            display_name: 'Unknown User',
            avatar_url: null
          }
        }));

        setPendingRequests(requestsWithProfiles);
      } else {
        setPendingRequests([]);
      }
    };

    fetchNotifications();
    fetchPendingRequests();

    // Subscribe to realtime notifications
    const notifChannel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev.slice(0, 19)]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    // Subscribe to connection requests
    const connChannel = supabase
      .channel('connection_requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_connections',
          filter: `addressee_id=eq.${user.id}`,
        },
        () => {
          fetchPendingRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_connections',
        },
        () => {
          fetchPendingRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_connections',
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(connChannel);
    };
  }, [user]);

  const handleConnectionAction = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      setProcessingRequest(requestId);
      
      if (action === 'accept') {
        const { error } = await supabase
          .from('user_connections')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', requestId);

        if (error) throw error;

        toast({
          title: "Accepted",
          description: "Connection request accepted"
        });
      } else {
        const { error } = await supabase
          .from('user_connections')
          .delete()
          .eq('id', requestId);

        if (error) throw error;

        toast({
          title: "Declined",
          description: "Connection request declined"
        });
      }

      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error handling connection:', error);
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive"
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user?.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'room_invite':
        return <Users className="h-4 w-4" />;
      case 'project':
        return <FolderOpen className="h-4 w-4" />;
      case 'connection_request':
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const totalUnread = unreadCount + pendingRequests.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {/* Pending Connection Requests */}
          {pendingRequests.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                Connection Requests
              </div>
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-2 p-3 border-b bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="mt-0.5 text-primary">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {request.profile.display_name || request.profile.username || 'Someone'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        wants to connect
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(request.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-7">
                    <Button
                      size="sm"
                      className="flex-1 h-7"
                      onClick={() => handleConnectionAction(request.id, 'accept')}
                      disabled={processingRequest === request.id}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7"
                      onClick={() => handleConnectionAction(request.id, 'decline')}
                      disabled={processingRequest === request.id}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Regular Notifications */}
          {notifications.length === 0 && pendingRequests.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : notifications.length > 0 ? (
            <>
              {pendingRequests.length > 0 && (
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                  Other Notifications
                </div>
              )}
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer ${
                    !notification.read ? 'bg-secondary/50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="mt-0.5 text-muted-foreground">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Lock, ArrowLeft } from 'lucide-react';
import Navigation from '@/components/Navigation';

interface RoomInfo {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  max_participants: number;
  participant_count: number;
}

export default function JoinRoom() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [validating, setValidating] = useState(false);

  // Validate invite code when provided
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      validateInviteCode(code);
    }
  }, [searchParams]);

  const validateInviteCode = async (code: string) => {
    if (!code || code.length !== 8) return;
    
    setValidating(true);
    try {
      // Find invitation by code
      const { data: invitation, error: invError } = await supabase
        .from('room_invitations')
        .select('*, room:room_id(*)')
        .eq('invite_code', code.toUpperCase())
        .maybeSingle();

      if (invError || !invitation) {
        toast({
          title: "Invalid Code",
          description: "This invite code is invalid or has expired.",
          variant: "destructive"
        });
        return;
      }

      // Check if expired
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        toast({
          title: "Expired Code",
          description: "This invite code has expired.",
          variant: "destructive"
        });
        return;
      }

      // Check max uses
      if (invitation.max_uses && invitation.used_count >= invitation.max_uses) {
        toast({
          title: "Code Limit Reached",
          description: "This invite code has reached its maximum uses.",
          variant: "destructive"
        });
        return;
      }

      const room = invitation.room as any;
      
      // Get participant count
      const { count } = await supabase
        .from('room_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);

      setRoomInfo({
        id: room.id,
        name: room.name,
        description: room.description,
        is_private: room.is_private,
        max_participants: room.max_participants,
        participant_count: count || 0
      });

    } catch (error) {
      console.error('Error validating code:', error);
    } finally {
      setValidating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to join a room.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (!roomInfo) {
      await validateInviteCode(inviteCode);
      return;
    }

    setLoading(true);
    try {
      // Check if already a participant
      const { data: existing } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomInfo.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Already a member, just navigate
        navigate(`/collaborate/${roomInfo.id}`);
        return;
      }

      // Check room capacity
      if (roomInfo.participant_count >= roomInfo.max_participants) {
        toast({
          title: "Room Full",
          description: "This room has reached its maximum capacity.",
          variant: "destructive"
        });
        return;
      }

      // Join the room
      const { error: joinError } = await supabase
        .from('room_participants')
        .insert([{
          room_id: roomInfo.id,
          user_id: user.id,
          role: 'member'
        }]);

      if (joinError) throw joinError;

      // Increment used_count on invitation
      await supabase
        .from('room_invitations')
        .update({ used_count: (await supabase.from('room_invitations').select('used_count').eq('invite_code', inviteCode.toUpperCase()).single()).data?.used_count + 1 || 1 })
        .eq('invite_code', inviteCode.toUpperCase());

      toast({
        title: "Joined!",
        description: `You have joined ${roomInfo.name}`
      });

      navigate(`/collaborate/${roomInfo.id}`);
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Users className="h-6 w-6" />
              Join Collaboration Room
            </CardTitle>
            <CardDescription>
              Enter an invite code to join a private room
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Invite Code</Label>
              <Input
                id="code"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  setRoomInfo(null);
                }}
                placeholder="Enter 8-character code"
                maxLength={8}
                className="text-center text-lg tracking-widest font-mono uppercase"
              />
            </div>

            {validating && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Validating code...</span>
              </div>
            )}

            {roomInfo && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    {roomInfo.is_private ? (
                      <Lock className="h-5 w-5 text-yellow-500 mt-0.5" />
                    ) : (
                      <Users className="h-5 w-5 text-green-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{roomInfo.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {roomInfo.description || 'No description'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {roomInfo.participant_count} / {roomInfo.max_participants} participants
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              onClick={handleJoinRoom} 
              className="w-full" 
              disabled={loading || validating || inviteCode.length !== 8}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : roomInfo ? (
                'Join Room'
              ) : (
                'Validate & Join'
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/collaborate')}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Rooms
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

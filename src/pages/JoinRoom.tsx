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
    if (code && code.length === 8 && /^\d{8}$/.test(code)) {
      validateInviteCode(code);
    }
  }, [searchParams]);

  const validateInviteCode = async (code: string) => {
    if (!code || code.length !== 8 || !/^\d{8}$/.test(code)) return;
    
    setValidating(true);
    try {
      // Use secure server-side validation function
      const { data, error } = await supabase
        .rpc('validate_and_use_invite_code', { invite_code_input: code });

      if (error) {
        console.error('Validation error:', error);
        toast({
          title: "Error",
          description: "Failed to validate invite code.",
          variant: "destructive"
        });
        return;
      }

      // Cast result to expected shape
      const result = data as { success: boolean; error?: string; room?: any } | null;

      if (!result?.success) {
        toast({
          title: "Invalid Code",
          description: result?.error || "This invite code is invalid.",
          variant: "destructive"
        });
        return;
      }

      const room = result.room;
      setRoomInfo({
        id: room.id,
        name: room.name,
        description: room.description,
        is_private: room.is_private,
        max_participants: room.max_participants,
        participant_count: room.participant_count
      });

    } catch (error) {
      console.error('Error validating code:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
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

    if (!roomInfo && inviteCode.length === 8) {
      await validateInviteCode(inviteCode);
      return;
    }

    if (!roomInfo) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 8-digit invite code.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Use secure server-side join function
      const { data, error } = await supabase
        .rpc('join_room_with_invite_code', { 
          invite_code_input: inviteCode,
          joining_user_id: user.id
        });

      if (error) {
        console.error('Join error:', error);
        throw new Error('Failed to join room');
      }

      // Cast result to expected shape
      const result = data as { 
        success: boolean; 
        error?: string; 
        already_member?: boolean; 
        room_id?: string 
      } | null;

      if (!result?.success) {
        toast({
          title: "Failed to Join",
          description: result?.error || "Could not join the room.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: result.already_member ? "Welcome back!" : "Joined!",
        description: result.already_member 
          ? `You're already a member of ${roomInfo.name}`
          : `You have joined ${roomInfo.name}`
      });

      navigate(`/collaborate/${result.room_id}`);
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
                  // Only allow numeric input
                  const numericValue = e.target.value.replace(/\D/g, '');
                  setInviteCode(numericValue);
                  setRoomInfo(null);
                }}
                placeholder="Enter 8-digit code"
                maxLength={8}
                className="text-center text-lg tracking-widest font-mono"
                inputMode="numeric"
                pattern="\d*"
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
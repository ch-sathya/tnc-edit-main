import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

type AuthMode = 'login' | 'signup' | 'forgot-password';

// Validation schemas
const emailSchema = z.string().email('Please enter a valid email address');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // If user is already authenticated, check their profile setup
    if (user && !authLoading) {
      checkUserProfileSetup();
    }
  }, [user, authLoading]);

  // Validate email on change
  useEffect(() => {
    if (email) {
      const result = emailSchema.safeParse(email);
      setEmailError(result.success ? null : result.error.errors[0].message);
    } else {
      setEmailError(null);
    }
  }, [email]);

  // Validate password on change (only in signup mode)
  useEffect(() => {
    if (mode === 'signup' && password) {
      const errors: string[] = [];
      if (password.length < 8) errors.push('At least 8 characters');
      if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
      if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
      if (!/[0-9]/.test(password)) errors.push('One number');
      setPasswordErrors(errors);
    } else {
      setPasswordErrors([]);
    }
  }, [password, mode]);

  const checkUserProfileSetup = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, is_username_set')
        .eq('user_id', user.id)
        .single();

      if (!profile || !profile.is_username_set || !profile.username) {
        navigate('/setup-username');
      } else {
        navigate(`/@${profile.username}`);
      }
    } catch (error) {
      // If no profile exists, redirect to username setup
      navigate('/setup-username');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({
        title: "Invalid Email",
        description: emailResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) throw error;

      setResetSent(true);
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({
        title: "Invalid Email",
        description: emailResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    // Validate password for signup
    if (mode === 'signup') {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        toast({
          title: "Weak Password",
          description: passwordResult.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Passwords Don't Match",
          description: "Please make sure your passwords match.",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
      } else if (mode === 'signup') {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        
        if (error) throw error;
        
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-green-500' : 'text-muted-foreground'}`}>
      {met ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {text}
    </div>
  );

  // Forgot Password View
  if (mode === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription>
              {resetSent 
                ? "Check your email for the reset link."
                : "Enter your email to receive a password reset link."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!resetSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    placeholder="Enter your email"
                    required
                    className={emailError ? 'border-destructive' : ''}
                  />
                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={loading || !!emailError}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  If an account exists for {email}, you'll receive an email shortly.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setResetSent(false);
                    setMode('login');
                  }}
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            )}
            
            {!resetSent && (
              <div className="mt-4 text-center">
                <Button
                  variant="link"
                  onClick={() => setMode('login')}
                  className="text-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' 
              ? 'Welcome back! Please sign in to your account.' 
              : 'Join our collaborative coding platform.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                placeholder="Enter your email"
                required
                className={emailError ? 'border-destructive' : ''}
              />
              {emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Password requirements for signup */}
              {mode === 'signup' && password && (
                <div className="space-y-1 pt-1">
                  <PasswordRequirement 
                    met={password.length >= 8} 
                    text="At least 8 characters" 
                  />
                  <PasswordRequirement 
                    met={/[a-z]/.test(password)} 
                    text="One lowercase letter" 
                  />
                  <PasswordRequirement 
                    met={/[A-Z]/.test(password)} 
                    text="One uppercase letter" 
                  />
                  <PasswordRequirement 
                    met={/[0-9]/.test(password)} 
                    text="One number" 
                  />
                </div>
              )}
            </div>
            
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className={confirmPassword && password !== confirmPassword ? 'border-destructive' : ''}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm p-0 h-auto"
                  onClick={() => setMode('forgot-password')}
                >
                  Forgot password?
                </Button>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !!emailError || (mode === 'signup' && passwordErrors.length > 0)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setPasswordErrors([]);
              }}
              className="text-sm"
            >
              {mode === 'login' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
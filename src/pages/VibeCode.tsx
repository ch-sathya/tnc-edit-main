import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  Send,
  Loader2,
  Sparkles,
  Code,
  Zap,
  Crown,
  Copy,
  Check,
  Trash2,
  Plus,
  Bot,
  User,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const VibeCode = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [planName, setPlanName] = useState('Free');
  const [sessionId] = useState(() => crypto.randomUUID());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) fetchCredits();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const fetchCredits = async () => {
    if (!user) return;
    const [creditsRes, subRes] = await Promise.all([
      supabase.from('user_credits').select('credits_remaining').eq('user_id', user.id).single(),
      supabase
        .from('user_subscriptions')
        .select('plan_id, plan_tiers(name, display_name)')
        .eq('user_id', user.id)
        .single(),
    ]);
    if (creditsRes.data) setCredits(creditsRes.data.credits_remaining);
    if (subRes.data) setPlanName((subRes.data as any).plan_tiers?.display_name || 'Free');
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !user) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: newMessages,
          sessionId,
        },
      });

      if (error) throw error;
      if (data.error) {
        if (data.error.includes('No credits')) {
          toast({ title: 'No Credits', description: 'Upgrade your plan for more AI credits.', variant: 'destructive' });
        }
        throw new Error(data.error);
      }

      setMessages([...newMessages, { role: 'assistant', content: data.message }]);
      if (data.credits_remaining !== undefined) setCredits(data.credits_remaining);
    } catch (error: any) {
      console.error('AI chat error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to get AI response', variant: 'destructive' });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    toast({ title: 'Chat cleared' });
  };

  const renderMessage = (msg: ChatMessage, index: number) => {
    const isUser = msg.role === 'user';

    // Parse code blocks
    const parts = msg.content.split(/(```[\s\S]*?```)/g);

    return (
      <div key={index} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
            <Bot className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className={`max-w-[85%] rounded-xl px-4 py-3 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-foreground'}`}>
          {parts.map((part, i) => {
            if (part.startsWith('```') && part.endsWith('```')) {
              const lines = part.slice(3, -3).split('\n');
              const lang = lines[0]?.trim() || '';
              const code = lines.slice(1).join('\n').trim();
              return (
                <div key={i} className="my-2 rounded-lg overflow-hidden border border-border">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80 text-xs text-muted-foreground">
                    <span>{lang || 'code'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyCode(code, index * 100 + i)}
                    >
                      {copiedIndex === index * 100 + i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <pre className="p-3 overflow-x-auto text-sm bg-card">
                    <code>{code}</code>
                  </pre>
                </div>
              );
            }
            return <span key={i} className="whitespace-pre-wrap text-sm leading-relaxed">{part}</span>;
          })}
        </div>
        {isUser && (
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
    );
  };

  if (authLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardHeader className="text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle className="text-2xl">Vibe Coding</CardTitle>
              <p className="text-muted-foreground">Sign in to start coding with AI</p>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate('/auth')}>Sign In to Start</Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="h-[calc(100vh-64px)] bg-background flex flex-col">
        {/* Top bar */}
        <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">Vibe Code</h1>
            </div>
            <Badge variant="outline" className="gap-1">
              <Crown className="h-3 w-3" />
              {planName}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1.5">
              <Zap className="h-3 w-3" />
              {credits !== null ? credits : '...'} credits
            </Badge>
            <Button variant="outline" size="sm" onClick={() => navigate('/pricing')} className="gap-1.5">
              <Crown className="h-3.5 w-3.5" />
              Upgrade
            </Button>
            <Button variant="ghost" size="sm" onClick={clearChat} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Code className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to Vibe Code</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  Your AI-powered coding assistant. Ask me to write code, debug issues, explain concepts, or help with any coding task.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                  {[
                    'Write a React component for a todo list',
                    'Explain async/await in JavaScript',
                    'Debug: "Cannot read property of undefined"',
                    'Create a REST API with Express.js',
                  ].map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      className="h-auto py-3 px-4 text-left text-sm justify-start"
                      onClick={() => {
                        setInput(prompt);
                        inputRef.current?.focus();
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
                      <span className="truncate">{prompt}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-4 max-w-4xl mx-auto">
                {messages.map((msg, i) => renderMessage(msg, i))}
                {sending && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-secondary/50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Input area */}
        <div className="border-t border-border p-4 bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about code..."
              className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={1}
              disabled={sending}
            />
            <Button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              size="icon"
              className="h-[44px] w-[44px] rounded-xl flex-shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Powered by Lovable AI Gateway · {credits !== null ? `${credits} credits remaining` : 'Loading...'}
          </p>
        </div>
      </div>
    </>
  );
};

export default VibeCode;

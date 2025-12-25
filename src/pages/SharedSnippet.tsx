import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Copy, ArrowLeft, Loader2, Eye, Calendar, Terminal, 
  CheckCircle, AlertCircle, ChevronDown, ChevronUp, Code2 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { executeCode } from '@/lib/codeExecution';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Snippet {
  id: string;
  short_code: string;
  code: string;
  language: string;
  title: string | null;
  input: string | null;
  created_at: string;
  view_count: number;
}

const SharedSnippet: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [errors, setErrors] = useState('');
  const [executionTime, setExecutionTime] = useState(0);
  const [stdinInput, setStdinInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  const supportsInput = snippet ? ['javascript', 'typescript', 'python', 'shell', 'bash'].includes(snippet.language.toLowerCase()) : false;

  useEffect(() => {
    const fetchSnippet = async () => {
      if (!shortCode) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('shared_snippets')
          .select('*')
          .eq('short_code', shortCode)
          .single();

        if (error || !data) {
          setNotFound(true);
        } else {
          setSnippet(data);
          if (data.input) {
            setStdinInput(data.input);
          }
          // Increment view count
          await supabase.rpc('increment_snippet_view_count', { snippet_code: shortCode });
        }
      } catch (err) {
        console.error('Error fetching snippet:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSnippet();
  }, [shortCode]);

  const handleRunCode = async () => {
    if (!snippet) return;

    setIsRunning(true);
    setOutput('');
    setErrors('');
    const startTime = Date.now();

    try {
      const result = await executeCode(snippet.code, snippet.language, stdinInput);
      
      if (result.success) {
        setOutput(result.output);
        toast({
          title: "Code executed successfully",
          description: `Completed in ${result.executionTime}ms`
        });
      } else {
        setErrors(result.error || 'Execution failed');
      }
    } catch (error) {
      setErrors((error as Error).message);
      toast({
        title: "Execution failed",
        description: "Check the errors tab for details",
        variant: "destructive"
      });
    } finally {
      setExecutionTime(Date.now() - startTime);
      setIsRunning(false);
    }
  };

  const copyCode = async () => {
    if (snippet) {
      await navigator.clipboard.writeText(snippet.code);
      toast({ title: "Code copied to clipboard!" });
    }
  };

  const copyShareUrl = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied to clipboard!" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <Code2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Snippet Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This code snippet doesn't exist or may have expired.
              </p>
              <Button onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Section */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  {snippet?.title || 'Shared Snippet'}
                  <Badge variant="outline">{snippet?.language}</Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyShareUrl}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {snippet?.view_count} views
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {snippet?.created_at && format(new Date(snippet.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] border rounded-lg bg-muted/50">
                <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-all">
                  <code>{snippet?.code || ''}</code>
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Execution Section */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Run Code</CardTitle>
                <Button
                  onClick={handleRunCode}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stdin Input */}
              {supportsInput && (
                <Collapsible open={showInput} onOpenChange={setShowInput}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        Program Input (stdin)
                        {snippet?.input && <Badge variant="secondary" className="ml-2">Has default input</Badge>}
                      </span>
                      {showInput ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="stdin" className="text-sm text-muted-foreground">
                        Enter input data (one value per line)
                      </Label>
                      <Textarea
                        id="stdin"
                        placeholder="Enter input values here..."
                        value={stdinInput}
                        onChange={(e) => setStdinInput(e.target.value)}
                        className="font-mono text-sm min-h-[80px] bg-muted/50"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <Tabs defaultValue="output" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="output" className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Output
                  </TabsTrigger>
                  <TabsTrigger value="errors" className="flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    Errors {errors && '(1)'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="output" className="mt-4">
                  <div className="bg-muted rounded-md p-4 min-h-[200px] font-mono text-sm overflow-auto">
                    {output ? (
                      <pre className="whitespace-pre-wrap text-foreground">{output}</pre>
                    ) : (
                      <div className="text-muted-foreground italic">
                        {isRunning ? 'Executing code...' : 'Click "Run" to execute the code.'}
                      </div>
                    )}
                  </div>
                  {executionTime > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Execution time: {executionTime}ms
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="errors" className="mt-4">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 min-h-[200px] font-mono text-sm overflow-auto">
                    {errors ? (
                      <pre className="whitespace-pre-wrap text-destructive">{errors}</pre>
                    ) : (
                      <div className="text-muted-foreground italic">
                        No errors.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Sandboxed Execution</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Code runs in an isolated environment for security.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SharedSnippet;
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Play, Square, Trash2, ExternalLink, AlertCircle, CheckCircle, ShieldAlert, 
  Share2, Copy, Terminal, ChevronDown, ChevronUp, CalendarIcon 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { executeCode } from '@/lib/codeExecution';
import { format, addDays, addHours, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';

interface CodeCompilerProps {
  code: string;
  language: string;
}

const generateShortCode = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const expirationPresets = [
  { label: '1 hour', getValue: () => addHours(new Date(), 1) },
  { label: '24 hours', getValue: () => addDays(new Date(), 1) },
  { label: '1 week', getValue: () => addWeeks(new Date(), 1) },
  { label: '1 month', getValue: () => addDays(new Date(), 30) },
  { label: 'Never', getValue: () => null },
];

export const CodeCompiler: React.FC<CodeCompilerProps> = ({ code, language }) => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [errors, setErrors] = useState<string>('');
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [stdinInput, setStdinInput] = useState<string>('');
  const [showInput, setShowInput] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [shareTitle, setShareTitle] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [showExpirationPicker, setShowExpirationPicker] = useState(false);
  const sandboxRef = useRef<HTMLIFrameElement | null>(null);

  // Languages that support stdin input
  const supportsInput = ['javascript', 'typescript', 'python', 'shell', 'bash'].includes(language.toLowerCase());

  // Create sandboxed iframe for code execution
  useEffect(() => {
    return () => {
      if (sandboxRef.current) {
        sandboxRef.current.remove();
      }
    };
  }, []);

  const executeCodeInSandbox = (codeToRun: string): Promise<{ output: string; error: string | null }> => {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      sandboxRef.current = iframe;

      const messageHandler = (event: MessageEvent) => {
        if (event.source === iframe.contentWindow) {
          window.removeEventListener('message', messageHandler);
          iframe.remove();
          resolve(event.data);
        }
      };
      window.addEventListener('message', messageHandler);

      const timeout = setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        iframe.remove();
        resolve({ output: '', error: 'Execution timed out (5 second limit)' });
      }, 5000);

      const sandboxCode = `
        <!DOCTYPE html>
        <html>
        <head>
          <script>
            (function() {
              const logs = [];
              const errors = [];
              const stdinInput = ${JSON.stringify(stdinInput)};
              let stdinIndex = 0;
              const stdinLines = stdinInput.split('\\n');
              
              // Override console
              console = {
                log: function(...args) {
                  logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                },
                error: function(...args) {
                  errors.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                },
                warn: function(...args) {
                  logs.push('WARN: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                },
                info: function(...args) {
                  logs.push('INFO: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                }
              };

              // Simulated input function
              window.prompt = function(message) {
                if (stdinIndex < stdinLines.length) {
                  return stdinLines[stdinIndex++];
                }
                return '';
              };
              window.readline = function() {
                if (stdinIndex < stdinLines.length) {
                  return stdinLines[stdinIndex++];
                }
                return '';
              };
              window.input = stdinInput;

              // Block dangerous APIs
              window.fetch = undefined;
              window.XMLHttpRequest = undefined;
              window.localStorage = undefined;
              window.sessionStorage = undefined;
              window.indexedDB = undefined;
              window.open = undefined;
              window.parent = undefined;
              window.top = undefined;
              window.opener = undefined;
              document.cookie = '';

              try {
                const result = (function() {
                  ${codeToRun}
                })();
                
                let output = logs.join('\\n');
                if (!output && result !== undefined) {
                  output = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
                }
                if (!output) {
                  output = 'Code executed successfully (no output)';
                }
                
                parent.postMessage({ 
                  output: output, 
                  error: errors.length > 0 ? errors.join('\\n') : null 
                }, '*');
              } catch (e) {
                parent.postMessage({ 
                  output: '', 
                  error: e.message || 'Unknown error' 
                }, '*');
              }
            })();
          </script>
        </head>
        <body></body>
        </html>
      `;

      iframe.srcdoc = sandboxCode;
    });
  };

  const handleExecuteCode = async () => {
    if (!code.trim()) {
      toast({
        title: "No code to execute",
        description: "Please write some code first",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setOutput('');
    setErrors('');
    const startTime = Date.now();

    try {
      // Try edge function first for full language support
      const result = await executeCode(code, language, stdinInput);
      
      if (result.success) {
        setOutput(result.output);
        toast({
          title: "Code executed successfully",
          description: `Execution completed in ${result.executionTime}ms`
        });
      } else {
        // Fallback to sandbox for JS/TS
        if (['javascript', 'typescript'].includes(language.toLowerCase())) {
          const sandboxResult = await executeCodeInSandbox(code);
          setOutput(sandboxResult.output);
          if (sandboxResult.error) {
            setErrors(sandboxResult.error);
          }
        } else {
          setErrors(result.error || 'Execution failed');
        }
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

  const clearOutput = () => {
    setOutput('');
    setErrors('');
    setExecutionTime(0);
  };

  const shareCode = async () => {
    if (!code.trim()) {
      toast({
        title: "No code to share",
        description: "Please write some code first",
        variant: "destructive"
      });
      return;
    }

    setIsSharing(true);
    try {
      const shortCode = generateShortCode();
      
      const { error } = await supabase
        .from('shared_snippets')
        .insert({
          short_code: shortCode,
          code: code,
          language: language,
          title: shareTitle || `${language} snippet`,
          input: stdinInput || null,
          expires_at: expirationDate ? expirationDate.toISOString() : null,
        });

      if (error) throw error;

      const url = `${window.location.origin}/snippet/${shortCode}`;
      setShareUrl(url);
      
      await navigator.clipboard.writeText(url);
      
      toast({
        title: "Code shared!",
        description: "Link copied to clipboard"
      });
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: "Failed to share",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  const copyShareUrl = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied!" });
    }
  };

  const openInExternalEditor = () => {
    const encodedCode = encodeURIComponent(code);
    let url = '';

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        url = `https://codepen.io/pen?editors=0010&code=${encodedCode}`;
        break;
      case 'python':
        url = `https://repl.it/languages/python3`;
        break;
      case 'html':
        url = `https://codepen.io/pen?editors=1000&code=${encodedCode}`;
        break;
      default:
        url = `https://codesandbox.io/`;
    }

    window.open(url, '_blank');
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            Code Execution
            <Badge variant="outline">{language}</Badge>
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={shareCode}
              disabled={isSharing || !code.trim()}
              className="glass-card"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {isSharing ? 'Sharing...' : 'Share'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openInExternalEditor}
              className="glass-card"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open External
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearOutput}
              disabled={!output && !errors}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button
              onClick={handleExecuteCode}
              disabled={isRunning || !code.trim()}
              className="glass-card"
            >
              {isRunning ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Code
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Share URL Display */}
        {shareUrl && (
          <Alert className="border-primary/50 bg-primary/10">
            <Share2 className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Code Shared!</AlertTitle>
            <AlertDescription className="flex items-center gap-2 mt-2">
              <Input 
                value={shareUrl} 
                readOnly 
                className="flex-1 bg-background/50 text-sm"
              />
              <Button size="sm" variant="outline" onClick={copyShareUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stdin Input Section */}
        {supportsInput && (
          <Collapsible open={showInput} onOpenChange={setShowInput}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Program Input (stdin)
                </span>
                {showInput ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                <Label htmlFor="stdin" className="text-sm text-muted-foreground">
                  Enter input data (one value per line for multiple inputs)
                </Label>
                <Textarea
                  id="stdin"
                  placeholder="Enter input values here...&#10;Line 1&#10;Line 2"
                  value={stdinInput}
                  onChange={(e) => setStdinInput(e.target.value)}
                  className="font-mono text-sm min-h-[80px] bg-muted/50"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Share Options */}
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Snippet title (optional)"
            value={shareTitle}
            onChange={(e) => setShareTitle(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Popover open={showExpirationPicker} onOpenChange={setShowExpirationPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal min-w-[180px]",
                  !expirationDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expirationDate ? format(expirationDate, "PPP") : "No expiration"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-2 border-b">
                <p className="text-sm font-medium mb-2">Quick presets</p>
                <div className="flex flex-wrap gap-1">
                  {expirationPresets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExpirationDate(preset.getValue());
                        setShowExpirationPicker(false);
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Calendar
                mode="single"
                selected={expirationDate || undefined}
                onSelect={(date) => {
                  setExpirationDate(date || null);
                  setShowExpirationPicker(false);
                }}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <ShieldAlert className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Sandboxed Execution</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Code runs in an isolated sandbox. Use the input section above to provide stdin data for your programs.
          </AlertDescription>
        </Alert>

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
                  {isRunning ? 'Executing code...' : 'No output yet. Run your code to see results here.'}
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
                  No errors. Your code executed successfully!
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> This is a browser-based code runner with limitations. 
            For full-featured development, use the "Open External" button to work in 
            professional online editors like CodePen, Repl.it, or CodeSandbox.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
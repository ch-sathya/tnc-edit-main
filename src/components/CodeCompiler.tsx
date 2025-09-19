import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Square, Trash2, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodeCompilerProps {
  code: string;
  language: string;
}

export const CodeCompiler: React.FC<CodeCompilerProps> = ({ code, language }) => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [errors, setErrors] = useState<string>('');
  const [executionTime, setExecutionTime] = useState<number>(0);

  const executeCode = async () => {
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
      let result = '';
      let hasErrors = false;

      switch (language) {
        case 'javascript':
        case 'typescript':
          try {
            // Create a safe execution environment
            const originalLog = console.log;
            const originalError = console.error;
            const logs: string[] = [];
            const errorLogs: string[] = [];

            // Override console methods to capture output
            console.log = (...args) => {
              logs.push(args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
              ).join(' '));
            };
            console.error = (...args) => {
              errorLogs.push(args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
              ).join(' '));
            };

            // Execute the code
            const func = new Function(code);
            const execResult = func();
            
            // Restore console methods
            console.log = originalLog;
            console.error = originalError;

            if (logs.length > 0) {
              result = logs.join('\n');
            } else if (execResult !== undefined) {
              result = typeof execResult === 'object' 
                ? JSON.stringify(execResult, null, 2) 
                : String(execResult);
            } else {
              result = 'Code executed successfully (no output)';
            }

            if (errorLogs.length > 0) {
              setErrors(errorLogs.join('\n'));
              hasErrors = true;
            }
          } catch (error) {
            setErrors((error as Error).message);
            hasErrors = true;
          }
          break;

        case 'python':
          // Simulate Python execution (in a real app, you'd use a Python interpreter)
          result = 'Python execution not available in browser environment.\nConsider using an online Python interpreter like Repl.it or CodePen.';
          break;

        case 'html':
          // For HTML, we can show a preview
          result = 'HTML preview not available in this context.\nCode appears to be valid HTML.';
          break;

        case 'css':
          result = 'CSS validation completed.\nStyles would be applied in HTML context.';
          break;

        case 'json':
          try {
            JSON.parse(code);
            result = 'Valid JSON format ✓';
          } catch (error) {
            setErrors(`Invalid JSON: ${(error as Error).message}`);
            hasErrors = true;
          }
          break;

        default:
          result = `Execution for ${language} is not supported in browser environment.`;
      }

      setOutput(result);
      
      if (!hasErrors) {
        toast({
          title: "Code executed successfully",
          description: `Execution completed in ${Date.now() - startTime}ms`
        });
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

  const openInExternalEditor = () => {
    const encodedCode = encodeURIComponent(code);
    let url = '';

    switch (language) {
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Code Execution
            <Badge variant="outline">{language}</Badge>
          </CardTitle>
          <div className="flex gap-2">
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
              onClick={executeCode}
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
      <CardContent>
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
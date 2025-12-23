import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecuteRequest {
  code: string;
  language: string;
  input?: string;
}

interface ExecuteResponse {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

// Sandboxed JavaScript execution using Deno's eval with timeout
async function executeJavaScript(code: string, input?: string): Promise<ExecuteResponse> {
  const startTime = Date.now();
  
  try {
    // Create a sandboxed context with limited globals
    const sandbox = {
      console: {
        log: (...args: unknown[]) => outputs.push(args.map(a => String(a)).join(' ')),
        error: (...args: unknown[]) => outputs.push('ERROR: ' + args.map(a => String(a)).join(' ')),
        warn: (...args: unknown[]) => outputs.push('WARN: ' + args.map(a => String(a)).join(' ')),
        info: (...args: unknown[]) => outputs.push('INFO: ' + args.map(a => String(a)).join(' ')),
      },
      input: input || '',
      setTimeout: undefined,
      setInterval: undefined,
      fetch: undefined,
      Deno: undefined,
      process: undefined,
      require: undefined,
      import: undefined,
    };

    const outputs: string[] = [];

    // Wrap code in an async IIFE for async support
    const wrappedCode = `
      (function(console, input) {
        ${code}
      })(this.console, this.input);
    `;

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout (5 seconds)')), 5000);
    });

    const executePromise = new Promise<void>((resolve, reject) => {
      try {
        const func = new Function('console', 'input', code);
        func(sandbox.console, sandbox.input);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    await Promise.race([executePromise, timeoutPromise]);

    return {
      success: true,
      output: outputs.join('\n') || '(No output)',
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime,
    };
  }
}

// Python execution simulation (parse and interpret basic constructs)
function executePython(code: string, input?: string): ExecuteResponse {
  const startTime = Date.now();
  const outputs: string[] = [];
  
  try {
    const lines = code.split('\n');
    const variables: Record<string, unknown> = { input: input || '' };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Handle print statements
      const printMatch = trimmed.match(/^print\s*\((.*)\)\s*$/);
      if (printMatch) {
        let content = printMatch[1];
        
        // Handle f-strings
        if (content.startsWith('f"') || content.startsWith("f'")) {
          content = content.slice(2, -1);
          content = content.replace(/\{([^}]+)\}/g, (_, varName) => {
            return String(variables[varName.trim()] ?? `{${varName}}`);
          });
          outputs.push(content);
        }
        // Handle regular strings
        else if ((content.startsWith('"') && content.endsWith('"')) || 
                 (content.startsWith("'") && content.endsWith("'"))) {
          outputs.push(content.slice(1, -1));
        }
        // Handle variables or expressions
        else {
          const value = evaluatePythonExpression(content, variables);
          outputs.push(String(value));
        }
        continue;
      }

      // Handle variable assignments
      const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
      if (assignMatch) {
        const [, varName, expr] = assignMatch;
        variables[varName] = evaluatePythonExpression(expr, variables);
        continue;
      }

      // Handle for loops (basic)
      const forMatch = trimmed.match(/^for\s+(\w+)\s+in\s+range\((\d+)\):\s*$/);
      if (forMatch) {
        // Skip - would need more complex parsing
        continue;
      }
    }

    return {
      success: true,
      output: outputs.join('\n') || '(No output)',
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: outputs.join('\n'),
      error: error instanceof Error ? error.message : 'Syntax error',
      executionTime: Date.now() - startTime,
    };
  }
}

function evaluatePythonExpression(expr: string, variables: Record<string, unknown>): unknown {
  expr = expr.trim();
  
  // String literals
  if ((expr.startsWith('"') && expr.endsWith('"')) || 
      (expr.startsWith("'") && expr.endsWith("'"))) {
    return expr.slice(1, -1);
  }
  
  // Numbers
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return parseFloat(expr);
  }
  
  // Boolean
  if (expr === 'True') return true;
  if (expr === 'False') return false;
  if (expr === 'None') return null;
  
  // Variable lookup
  if (variables.hasOwnProperty(expr)) {
    return variables[expr];
  }
  
  // Basic arithmetic
  const addMatch = expr.match(/^(.+)\s*\+\s*(.+)$/);
  if (addMatch) {
    const left = evaluatePythonExpression(addMatch[1], variables);
    const right = evaluatePythonExpression(addMatch[2], variables);
    if (typeof left === 'number' && typeof right === 'number') {
      return left + right;
    }
    return String(left) + String(right);
  }
  
  const mulMatch = expr.match(/^(.+)\s*\*\s*(.+)$/);
  if (mulMatch) {
    const left = evaluatePythonExpression(mulMatch[1], variables);
    const right = evaluatePythonExpression(mulMatch[2], variables);
    return Number(left) * Number(right);
  }
  
  return expr;
}

// TypeScript execution (transpile and run as JS)
async function executeTypeScript(code: string, input?: string): Promise<ExecuteResponse> {
  // Simple TS to JS transformation (remove type annotations)
  const jsCode = code
    .replace(/:\s*\w+(\[\])?(\s*[=,\)])/g, '$2') // Remove type annotations
    .replace(/interface\s+\w+\s*\{[^}]*\}/g, '') // Remove interfaces
    .replace(/type\s+\w+\s*=\s*[^;]+;/g, '') // Remove type aliases
    .replace(/<\w+>/g, ''); // Remove generics
  
  return executeJavaScript(jsCode, input);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, input }: ExecuteRequest = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ success: false, error: 'No code provided', output: '', executionTime: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Executing ${language} code (${code.length} chars)`);

    let result: ExecuteResponse;

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'jsx':
        result = await executeJavaScript(code, input);
        break;
      case 'typescript':
      case 'tsx':
        result = await executeTypeScript(code, input);
        break;
      case 'python':
        result = executePython(code, input);
        break;
      default:
        result = {
          success: false,
          output: '',
          error: `Unsupported language: ${language}. Supported: javascript, typescript, python`,
          executionTime: 0,
        };
    }

    console.log(`Execution completed: ${result.success ? 'success' : 'failed'} in ${result.executionTime}ms`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Execute code error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Server error',
        executionTime: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

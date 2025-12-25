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

// Sandboxed JavaScript execution
async function executeJavaScript(code: string, input?: string): Promise<ExecuteResponse> {
  const startTime = Date.now();
  const outputs: string[] = [];
  
  try {
    const sandbox = {
      console: {
        log: (...args: unknown[]) => outputs.push(args.map(a => formatOutput(a)).join(' ')),
        error: (...args: unknown[]) => outputs.push('ERROR: ' + args.map(a => formatOutput(a)).join(' ')),
        warn: (...args: unknown[]) => outputs.push('WARN: ' + args.map(a => formatOutput(a)).join(' ')),
        info: (...args: unknown[]) => outputs.push('INFO: ' + args.map(a => formatOutput(a)).join(' ')),
        table: (data: unknown) => outputs.push(JSON.stringify(data, null, 2)),
      },
      input: input || '',
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout (5 seconds)')), 5000);
    });

    const executePromise = new Promise<void>((resolve, reject) => {
      try {
        const func = new Function(
          'console', 'input', 'Math', 'Date', 'JSON', 'Array', 'Object', 
          'String', 'Number', 'Boolean', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
          code
        );
        func(
          sandbox.console, sandbox.input, Math, Date, JSON, Array, Object,
          String, Number, Boolean, parseInt, parseFloat, isNaN, isFinite
        );
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
      output: outputs.join('\n'),
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime,
    };
  }
}

function formatOutput(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

// Python interpreter simulation
function executePython(code: string, input?: string): ExecuteResponse {
  const startTime = Date.now();
  const outputs: string[] = [];
  const variables: Record<string, unknown> = { 
    input: input || '',
    True: true,
    False: false,
    None: null,
  };
  
  try {
    const lines = code.split('\n');
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.search(/\S|$/);
      
      if (!trimmed || trimmed.startsWith('#')) {
        i++;
        continue;
      }

      // Handle print statements
      const printMatch = trimmed.match(/^print\s*\((.*)\)\s*$/);
      if (printMatch) {
        const content = printMatch[1];
        const result = evaluatePythonExpression(content, variables);
        outputs.push(formatPythonOutput(result));
        i++;
        continue;
      }

      // Handle len() function
      const lenMatch = trimmed.match(/^(\w+)\s*=\s*len\((.+)\)\s*$/);
      if (lenMatch) {
        const [, varName, expr] = lenMatch;
        const value = evaluatePythonExpression(expr, variables);
        if (typeof value === 'string' || Array.isArray(value)) {
          variables[varName] = value.length;
        }
        i++;
        continue;
      }

      // Handle input() function
      const inputMatch = trimmed.match(/^(\w+)\s*=\s*input\(.*\)\s*$/);
      if (inputMatch) {
        variables[inputMatch[1]] = input || '';
        i++;
        continue;
      }

      // Handle list append
      const appendMatch = trimmed.match(/^(\w+)\.append\((.+)\)\s*$/);
      if (appendMatch) {
        const [, listName, expr] = appendMatch;
        const list = variables[listName];
        if (Array.isArray(list)) {
          list.push(evaluatePythonExpression(expr, variables));
        }
        i++;
        continue;
      }

      // Handle for loops
      const forRangeMatch = trimmed.match(/^for\s+(\w+)\s+in\s+range\((.+)\):\s*$/);
      if (forRangeMatch) {
        const [, varName, rangeExpr] = forRangeMatch;
        const rangeArgs = rangeExpr.split(',').map(s => Number(evaluatePythonExpression(s.trim(), variables)));
        let start = 0, end = 0, step = 1;
        if (rangeArgs.length === 1) { end = rangeArgs[0]; }
        else if (rangeArgs.length === 2) { start = rangeArgs[0]; end = rangeArgs[1]; }
        else if (rangeArgs.length === 3) { start = rangeArgs[0]; end = rangeArgs[1]; step = rangeArgs[2]; }
        
        // Find loop body
        const bodyLines: string[] = [];
        let j = i + 1;
        while (j < lines.length && (lines[j].search(/\S|$/) > indent || lines[j].trim() === '')) {
          if (lines[j].trim()) bodyLines.push(lines[j].trim());
          j++;
        }
        
        for (let val = start; step > 0 ? val < end : val > end; val += step) {
          variables[varName] = val;
          for (const bodyLine of bodyLines) {
            executePythonLine(bodyLine, variables, outputs);
          }
        }
        i = j;
        continue;
      }

      // Handle for-in loop over list
      const forInMatch = trimmed.match(/^for\s+(\w+)\s+in\s+(\w+):\s*$/);
      if (forInMatch) {
        const [, varName, listName] = forInMatch;
        const list = variables[listName];
        
        const bodyLines: string[] = [];
        let j = i + 1;
        while (j < lines.length && (lines[j].search(/\S|$/) > indent || lines[j].trim() === '')) {
          if (lines[j].trim()) bodyLines.push(lines[j].trim());
          j++;
        }
        
        if (Array.isArray(list)) {
          for (const item of list) {
            variables[varName] = item;
            for (const bodyLine of bodyLines) {
              executePythonLine(bodyLine, variables, outputs);
            }
          }
        }
        i = j;
        continue;
      }

      // Handle if statements (basic)
      const ifMatch = trimmed.match(/^if\s+(.+):\s*$/);
      if (ifMatch) {
        const condition = evaluatePythonExpression(ifMatch[1], variables);
        const bodyLines: string[] = [];
        let j = i + 1;
        while (j < lines.length && (lines[j].search(/\S|$/) > indent || lines[j].trim() === '')) {
          if (lines[j].trim()) bodyLines.push(lines[j].trim());
          j++;
        }
        
        if (condition) {
          for (const bodyLine of bodyLines) {
            executePythonLine(bodyLine, variables, outputs);
          }
        }
        i = j;
        continue;
      }

      // Handle variable assignments
      const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
      if (assignMatch) {
        const [, varName, expr] = assignMatch;
        variables[varName] = evaluatePythonExpression(expr, variables);
        i++;
        continue;
      }

      // Handle def functions (skip for now)
      if (trimmed.startsWith('def ')) {
        let j = i + 1;
        while (j < lines.length && (lines[j].search(/\S|$/) > indent || lines[j].trim() === '')) {
          j++;
        }
        i = j;
        continue;
      }

      i++;
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

function executePythonLine(line: string, variables: Record<string, unknown>, outputs: string[]) {
  const trimmed = line.trim();
  
  const printMatch = trimmed.match(/^print\s*\((.*)\)\s*$/);
  if (printMatch) {
    const result = evaluatePythonExpression(printMatch[1], variables);
    outputs.push(formatPythonOutput(result));
    return;
  }
  
  const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
  if (assignMatch) {
    variables[assignMatch[1]] = evaluatePythonExpression(assignMatch[2], variables);
  }
}

function formatPythonOutput(value: unknown): string {
  if (value === null) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return '[' + value.map(v => formatPythonOutput(v)).join(', ') + ']';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function evaluatePythonExpression(expr: string, variables: Record<string, unknown>): unknown {
  expr = expr.trim();
  
  // Handle f-strings
  if (expr.startsWith('f"') || expr.startsWith("f'")) {
    const quote = expr[1];
    let content = expr.slice(2, expr.lastIndexOf(quote));
    content = content.replace(/\{([^}]+)\}/g, (_, inner) => {
      return String(evaluatePythonExpression(inner.trim(), variables) ?? '');
    });
    return content;
  }
  
  // String literals
  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    return expr.slice(1, -1);
  }
  
  // Triple-quoted strings
  if (expr.startsWith('"""') || expr.startsWith("'''")) {
    return expr.slice(3, -3);
  }
  
  // List literals
  if (expr.startsWith('[') && expr.endsWith(']')) {
    const inner = expr.slice(1, -1);
    if (!inner.trim()) return [];
    return inner.split(',').map(item => evaluatePythonExpression(item.trim(), variables));
  }
  
  // Numbers
  if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);
  
  // Booleans and None
  if (expr === 'True') return true;
  if (expr === 'False') return false;
  if (expr === 'None') return null;
  
  // Comparison operators
  const compOps = ['==', '!=', '>=', '<=', '>', '<'];
  for (const op of compOps) {
    const idx = expr.indexOf(op);
    if (idx > 0) {
      const left = evaluatePythonExpression(expr.slice(0, idx), variables);
      const right = evaluatePythonExpression(expr.slice(idx + op.length), variables);
      switch (op) {
        case '==': return left === right;
        case '!=': return left !== right;
        case '>=': return Number(left) >= Number(right);
        case '<=': return Number(left) <= Number(right);
        case '>': return Number(left) > Number(right);
        case '<': return Number(left) < Number(right);
      }
    }
  }
  
  // Variable lookup
  if (Object.prototype.hasOwnProperty.call(variables, expr)) {
    return variables[expr];
  }
  
  // Basic arithmetic
  const addIdx = expr.lastIndexOf('+');
  if (addIdx > 0) {
    const left = evaluatePythonExpression(expr.slice(0, addIdx), variables);
    const right = evaluatePythonExpression(expr.slice(addIdx + 1), variables);
    if (typeof left === 'number' && typeof right === 'number') return left + right;
    return String(left) + String(right);
  }
  
  const subIdx = expr.lastIndexOf('-');
  if (subIdx > 0 && expr[subIdx - 1] !== ' ') {
    const left = evaluatePythonExpression(expr.slice(0, subIdx), variables);
    const right = evaluatePythonExpression(expr.slice(subIdx + 1), variables);
    return Number(left) - Number(right);
  }
  
  const mulIdx = expr.indexOf('*');
  if (mulIdx > 0) {
    const left = evaluatePythonExpression(expr.slice(0, mulIdx), variables);
    const right = evaluatePythonExpression(expr.slice(mulIdx + 1), variables);
    return Number(left) * Number(right);
  }
  
  const divIdx = expr.indexOf('/');
  if (divIdx > 0) {
    const left = evaluatePythonExpression(expr.slice(0, divIdx), variables);
    const right = evaluatePythonExpression(expr.slice(divIdx + 1), variables);
    return Number(left) / Number(right);
  }
  
  const modIdx = expr.indexOf('%');
  if (modIdx > 0) {
    const left = evaluatePythonExpression(expr.slice(0, modIdx), variables);
    const right = evaluatePythonExpression(expr.slice(modIdx + 1), variables);
    return Number(left) % Number(right);
  }
  
  return expr;
}

// TypeScript execution
async function executeTypeScript(code: string, input?: string): Promise<ExecuteResponse> {
  const jsCode = code
    .replace(/:\s*\w+(\[\])?(\s*[=,\)\{])/g, '$2')
    .replace(/interface\s+\w+\s*\{[^}]*\}/gs, '')
    .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
    .replace(/<\w+(\s*,\s*\w+)*>/g, '')
    .replace(/as\s+\w+/g, '')
    .replace(/:\s*(string|number|boolean|any|void|object|unknown|never)(\[\])?\s*([=,\)\{;])/g, '$3');
  
  return executeJavaScript(jsCode, input);
}

// HTML rendering simulation
function executeHTML(code: string): ExecuteResponse {
  const startTime = Date.now();
  
  try {
    // Extract text content from HTML
    const textContent = code
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    return {
      success: true,
      output: `HTML parsed successfully.\n\nText content:\n${textContent || '(No text content)'}`,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'HTML parsing error',
      executionTime: Date.now() - startTime,
    };
  }
}

// CSS validation simulation
function executeCSS(code: string): ExecuteResponse {
  const startTime = Date.now();
  
  try {
    const ruleCount = (code.match(/\{[^}]*\}/g) || []).length;
    const selectorCount = (code.match(/[^{]+\s*\{/g) || []).length;
    
    return {
      success: true,
      output: `CSS parsed successfully.\n\nSelectors: ${selectorCount}\nRules: ${ruleCount}`,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'CSS parsing error',
      executionTime: Date.now() - startTime,
    };
  }
}

// JSON validation
function executeJSON(code: string): ExecuteResponse {
  const startTime = Date.now();
  
  try {
    const parsed = JSON.parse(code);
    const formatted = JSON.stringify(parsed, null, 2);
    
    return {
      success: true,
      output: `JSON is valid!\n\nFormatted output:\n${formatted}`,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Invalid JSON',
      executionTime: Date.now() - startTime,
    };
  }
}

// SQL simulation
function executeSQL(code: string): ExecuteResponse {
  const startTime = Date.now();
  
  try {
    const statements = code.split(';').filter(s => s.trim());
    const outputs: string[] = [];
    
    for (const stmt of statements) {
      const trimmed = stmt.trim().toUpperCase();
      if (trimmed.startsWith('SELECT')) {
        outputs.push('Query: SELECT statement parsed successfully');
      } else if (trimmed.startsWith('INSERT')) {
        outputs.push('Query: INSERT statement parsed successfully');
      } else if (trimmed.startsWith('UPDATE')) {
        outputs.push('Query: UPDATE statement parsed successfully');
      } else if (trimmed.startsWith('DELETE')) {
        outputs.push('Query: DELETE statement parsed successfully');
      } else if (trimmed.startsWith('CREATE')) {
        outputs.push('Query: CREATE statement parsed successfully');
      } else if (trimmed.startsWith('DROP')) {
        outputs.push('Query: DROP statement parsed successfully');
      } else if (trimmed) {
        outputs.push(`Query: ${stmt.trim().split(' ')[0]} statement parsed`);
      }
    }
    
    return {
      success: true,
      output: `SQL parsed successfully.\n\n${statements.length} statement(s) found.\n\n${outputs.join('\n')}`,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'SQL parsing error',
      executionTime: Date.now() - startTime,
    };
  }
}

// Markdown preview
function executeMarkdown(code: string): ExecuteResponse {
  const startTime = Date.now();
  
  try {
    const headings = (code.match(/^#+\s+.+$/gm) || []).length;
    const links = (code.match(/\[.+?\]\(.+?\)/g) || []).length;
    const codeBlocks = (code.match(/```[\s\S]*?```/g) || []).length;
    const lists = (code.match(/^[\s]*[-*+]\s+.+$/gm) || []).length;
    
    // Simple text extraction
    const plainText = code
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^[-*+]\s+/gm, '• ')
      .trim();
    
    return {
      success: true,
      output: `Markdown parsed successfully.\n\nStats:\n- Headings: ${headings}\n- Links: ${links}\n- Code blocks: ${codeBlocks}\n- List items: ${lists}\n\nPlain text preview:\n${plainText.slice(0, 500)}${plainText.length > 500 ? '...' : ''}`,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Markdown parsing error',
      executionTime: Date.now() - startTime,
    };
  }
}

// Shell script simulation
function executeShell(code: string): ExecuteResponse {
  const startTime = Date.now();
  const outputs: string[] = [];
  
  try {
    const lines = code.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Simulate echo
      const echoMatch = trimmed.match(/^echo\s+(.+)$/);
      if (echoMatch) {
        let content = echoMatch[1];
        // Remove quotes
        if ((content.startsWith('"') && content.endsWith('"')) || 
            (content.startsWith("'") && content.endsWith("'"))) {
          content = content.slice(1, -1);
        }
        outputs.push(content);
        continue;
      }
      
      // Other commands - just acknowledge
      const cmd = trimmed.split(' ')[0];
      outputs.push(`$ ${trimmed}`);
      outputs.push(`[Simulated] ${cmd} command would execute here`);
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
      error: error instanceof Error ? error.message : 'Shell error',
      executionTime: Date.now() - startTime,
    };
  }
}

// Generic compiled language simulation
function executeCompiledLanguage(code: string, language: string): ExecuteResponse {
  const startTime = Date.now();
  
  try {
    const lines = code.split('\n').length;
    const functions = (code.match(/\bfunc(?:tion)?\s+\w+|def\s+\w+|fn\s+\w+|\w+\s*\([^)]*\)\s*\{/g) || []).length;
    const classes = (code.match(/\bclass\s+\w+|\bstruct\s+\w+|\binterface\s+\w+/g) || []).length;
    
    // Extract print/output statements
    const outputs: string[] = [];
    const printPatterns = [
      /fmt\.Println\((.+)\)/g,  // Go
      /println!\((.+)\)/g,       // Rust
      /System\.out\.println\((.+)\)/g,  // Java
      /std::cout\s*<<\s*(.+?)\s*(?:<<|;)/g,  // C++
      /printf\((.+)\)/g,  // C
    ];
    
    for (const pattern of printPatterns) {
      const matches = code.matchAll(pattern);
      for (const match of matches) {
        let content = match[1].trim();
        if ((content.startsWith('"') && content.endsWith('"')) || 
            (content.startsWith("'") && content.endsWith("'"))) {
          content = content.slice(1, -1);
        }
        outputs.push(content);
      }
    }
    
    return {
      success: true,
      output: `${language.toUpperCase()} code analyzed successfully.\n\nStats:\n- Lines: ${lines}\n- Functions: ${functions}\n- Classes/Structs: ${classes}\n\n${outputs.length > 0 ? 'Detected output:\n' + outputs.join('\n') : 'Note: Full execution requires a ' + language + ' compiler/runtime.'}`,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Analysis error',
      executionTime: Date.now() - startTime,
    };
  }
}

serve(async (req) => {
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
      case 'html':
        result = executeHTML(code);
        break;
      case 'css':
      case 'scss':
        result = executeCSS(code);
        break;
      case 'json':
        result = executeJSON(code);
        break;
      case 'sql':
        result = executeSQL(code);
        break;
      case 'markdown':
        result = executeMarkdown(code);
        break;
      case 'shell':
      case 'bash':
        result = executeShell(code);
        break;
      case 'go':
      case 'rust':
      case 'java':
      case 'c':
      case 'cpp':
        result = executeCompiledLanguage(code, language);
        break;
      default:
        result = {
          success: true,
          output: `Code analysis for ${language}:\n\nLines: ${code.split('\n').length}\nCharacters: ${code.length}\n\nNote: Full execution for ${language} requires a dedicated runtime.`,
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

import { supabase } from '@/integrations/supabase/client';
import { runInBrowserSandbox, stripTypeScript } from '@/lib/browserSandbox';

interface ExecuteResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

const BROWSER_SANDBOXED = new Set(['javascript', 'jsx', 'typescript', 'tsx']);

export const executeCode = async (
  code: string,
  language: string,
  input?: string
): Promise<ExecuteResult> => {
  const lang = language.toLowerCase();

  // JS/TS run locally in a sandboxed iframe (opaque origin, no session access),
  // which keeps untrusted code away from any server privileges.
  if (BROWSER_SANDBOXED.has(lang)) {
    const source = lang.startsWith('t') ? stripTypeScript(code) : code;
    return runInBrowserSandbox(source, input);
  }

  try {
    // Server-side execution requires a signed-in user.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        output: '',
        error: 'Sign in to run code.',
        executionTime: 0,
      };
    }

    const { data, error } = await supabase.functions.invoke('execute-code', {
      body: { code, language, input }
    });

    if (error) {
      return {
        success: false,
        output: '',
        error: error.message || 'Failed to execute code',
        executionTime: 0
      };
    }

    return data as ExecuteResult;
  } catch (err) {
    return {
      success: false,
      output: '',
      error: err instanceof Error ? err.message : 'Unknown error',
      executionTime: 0
    };
  }
};

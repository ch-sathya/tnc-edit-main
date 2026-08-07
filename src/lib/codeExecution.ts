import { supabase } from '@/integrations/supabase/client';

interface ExecuteResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export const executeCode = async (
  code: string,
  language: string,
  input?: string
): Promise<ExecuteResult> => {
  try {
    // Execution runs in a sandboxed server runtime and requires a signed-in user.
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

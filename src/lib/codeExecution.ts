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

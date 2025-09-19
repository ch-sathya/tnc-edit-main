import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  retryable?: boolean;
  maxRetries?: number;
  onError?: (error: Error) => void;
}

interface ErrorState {
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * Hook for comprehensive error handling with retry mechanisms
 * Implements requirements for user-friendly error messages and retry functionality
 */
export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const {
    showToast = true,
    logError = true,
    retryable = true,
    maxRetries = 3,
    onError
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    retryCount: 0,
    isRetrying: false
  });

  const handleError = useCallback((error: Error | unknown, context?: string) => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Log error if enabled
    if (logError) {
      console.error(`Error${context ? ` in ${context}` : ''}:`, errorObj);
    }

    // Update error state
    setErrorState(prev => ({
      ...prev,
      error: errorObj
    }));

    // Show toast notification if enabled
    if (showToast) {
      const message = getErrorMessage(errorObj);
      toast.error(message);
    }

    // Call custom error handler if provided
    if (onError) {
      onError(errorObj);
    }

    return errorObj;
  }, [showToast, logError, onError]);

  const retry = useCallback(async (retryFn: () => Promise<void> | void) => {
    if (!retryable || errorState.retryCount >= maxRetries) {
      toast.error(`Maximum retry attempts (${maxRetries}) reached.`);
      return false;
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1
    }));

    try {
      await retryFn();
      
      // Clear error state on successful retry
      setErrorState({
        error: null,
        retryCount: 0,
        isRetrying: false
      });
      
      toast.success('Operation completed successfully');
      return true;
    } catch (retryError) {
      const errorObj = retryError instanceof Error ? retryError : new Error(String(retryError));
      
      setErrorState(prev => ({
        ...prev,
        error: errorObj,
        isRetrying: false
      }));

      const remainingRetries = maxRetries - errorState.retryCount - 1;
      if (remainingRetries > 0) {
        toast.error(`Retry failed. ${remainingRetries} attempts remaining.`);
      } else {
        toast.error('All retry attempts failed. Please refresh the page.');
      }
      
      return false;
    }
  }, [retryable, maxRetries, errorState.retryCount]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      retryCount: 0,
      isRetrying: false
    });
  }, []);

  const canRetry = retryable && errorState.retryCount < maxRetries && !errorState.isRetrying;

  return {
    error: errorState.error,
    retryCount: errorState.retryCount,
    isRetrying: errorState.isRetrying,
    canRetry,
    handleError,
    retry,
    clearError
  };
};

/**
 * Get user-friendly error message based on error type
 */
const getErrorMessage = (error: Error): string => {
  const message = error.message.toLowerCase();
  
  // Network errors
  if (message.includes('network') || message.includes('fetch failed')) {
    return 'Network connection error. Please check your internet connection.';
  }
  
  // Timeout errors
  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  // Authentication errors
  if (message.includes('unauthorized') || message.includes('403')) {
    return 'Authentication error. Please log in again.';
  }
  
  // Not found errors
  if (message.includes('not found') || message.includes('404')) {
    return 'The requested resource was not found.';
  }
  
  // Server errors
  if (message.includes('500') || message.includes('server error')) {
    return 'Server error. Please try again later.';
  }
  
  // Rate limiting
  if (message.includes('rate limit') || message.includes('429')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  // Validation errors
  if (message.includes('validation') || message.includes('invalid')) {
    return 'Invalid data provided. Please check your input.';
  }
  
  // Generic fallback
  return error.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Hook specifically for async operations with built-in error handling
 */
export const useAsyncOperation = <T,>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions & {
    onSuccess?: (result: T) => void;
    loadingMessage?: string;
    successMessage?: string;
  } = {}
) => {
  const [isLoading, setIsLoading] = useState(false);
  const errorHandler = useErrorHandler(options);
  
  const execute = useCallback(async (): Promise<T | null> => {
    setIsLoading(true);
    
    if (options.loadingMessage) {
      toast.loading(options.loadingMessage);
    }

    try {
      const result = await operation();
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      errorHandler.clearError();
      return result;
    } catch (error) {
      errorHandler.handleError(error);
      return null;
    } finally {
      setIsLoading(false);
      toast.dismiss(); // Dismiss loading toast
    }
  }, [operation, options, errorHandler]);

  const executeWithRetry = useCallback(async (): Promise<T | null> => {
    return errorHandler.retry(async () => {
      const result = await execute();
      if (result === null && errorHandler.error) {
        throw errorHandler.error;
      }
    }) ? await execute() : null;
  }, [execute, errorHandler]);

  return {
    execute,
    executeWithRetry,
    isLoading,
    ...errorHandler
  };
};

export default useErrorHandler;
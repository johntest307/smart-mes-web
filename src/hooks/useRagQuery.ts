import { useState, useCallback } from 'react';

export interface SourceInfo {
  document: string;
  score: number;
  department?: string;
}

export interface RagQueryResult {
  answer: string;
  sources: SourceInfo[];
  warnings: string[];
  timing: number;
  injection_detected: boolean;
}

export interface UseRagQueryOptions {
  apiBaseUrl: string;
  token?: string;
  onError?: (error: Error) => void;
}

export interface UseRagQueryReturn {
  query: (question: string) => Promise<RagQueryResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useRagQuery(options: UseRagQueryOptions): UseRagQueryReturn {
  const { apiBaseUrl, token, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(
    async (question: string): Promise<RagQueryResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${apiBaseUrl}/api/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ question }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
          throw new Error(errData.detail || `Server error: ${res.status}`);
        }

        const data: RagQueryResult = await res.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        onError?.(err instanceof Error ? err : new Error(message));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiBaseUrl, token, onError],
  );

  const clearError = useCallback(() => setError(null), []);

  return { query, isLoading, error, clearError };
}

export default useRagQuery;

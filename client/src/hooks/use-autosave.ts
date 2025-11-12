import { useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UseAutosaveOptions<T> {
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT";
  debounceMs?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  invalidateQueries?: string[][];
}

export function useAutosave<T = any>({
  endpoint,
  method = "PATCH",
  debounceMs = 1000,
  onSuccess,
  onError,
  invalidateQueries = [],
}: UseAutosaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingDataRef = useRef<any>(null);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(method, endpoint, data);
      
      // Handle 204 No Content
      if (res.status === 204) {
        return undefined as T;
      }
      
      // Parse and return JSON
      return (await res.json()) as T;
    },
    onSuccess: (data) => {
      console.log("[Autosave] Success:", endpoint);

      // Invalidate specified queries
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });

      onSuccess?.(data);
    },
    onError: (error) => {
      console.error("[Autosave] Error:", endpoint, error);
      onError?.(error as Error);
    },
  });

  const save = useCallback(
    (data: any) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Store pending data
      pendingDataRef.current = data;

      // Debounce the save
      timeoutRef.current = setTimeout(() => {
        if (pendingDataRef.current) {
          console.log("[Autosave] Saving:", endpoint);
          mutation.mutate(pendingDataRef.current);
          pendingDataRef.current = null;
        }
      }, debounceMs);
    },
    [mutation, endpoint, debounceMs]
  );

  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (pendingDataRef.current) {
      console.log("[Autosave] Saving immediately:", endpoint);
      mutation.mutate(pendingDataRef.current);
      pendingDataRef.current = null;
    }
  }, [mutation, endpoint]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    save,
    saveNow,
    isSaving: mutation.isPending,
    error: mutation.error,
  };
}

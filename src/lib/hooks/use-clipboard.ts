'use client';

import { useState } from 'react';

interface UseClipboardOptions {
  timeout?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useClipboard(options: UseClipboardOptions = {}) {
  const { timeout = 2000, onSuccess, onError } = options;
  const [hasCopied, setHasCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      setError(null);

      // Use modern Clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        await new Promise<void>((resolve, reject) => {
          if (document.execCommand('copy')) {
            resolve();
          } else {
            reject(new Error('Failed to copy text'));
          }
          document.body.removeChild(textArea);
        });
      }

      setHasCopied(true);
      onSuccess?.();

      // Reset the copied state after timeout
      setTimeout(() => {
        setHasCopied(false);
      }, timeout);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to copy to clipboard');
      setError(error.message);
      onError?.(error);
    }
  };

  return {
    copyToClipboard,
    hasCopied,
    error,
  };
}

// Utility function to truncate text for display
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Utility function to format content for clipboard
export function formatContentForClipboard(content: string): string {
  // Remove extra whitespace and normalize line breaks
  return content.trim().replace(/\n\s+/g, '\n');
}
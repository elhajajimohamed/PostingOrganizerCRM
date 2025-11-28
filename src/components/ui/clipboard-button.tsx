'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/lib/hooks/use-clipboard';

interface ClipboardButtonProps {
  text: string;
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onCopy?: () => void;
  onError?: (error: Error) => void;
  showSuccessState?: boolean;
  successText?: string;
  errorText?: string;
}

export function ClipboardButton({
  text,
  children,
  variant = 'outline',
  size = 'sm',
  className,
  onCopy,
  onError,
  showSuccessState = true,
  successText = 'Copied!',
  errorText = 'Failed to copy',
}: ClipboardButtonProps) {
  const { copyToClipboard, hasCopied, error } = useClipboard({
    timeout: 2000,
    onSuccess: onCopy,
    onError,
  });

  const handleClick = () => {
    copyToClipboard(text);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
    >
      {hasCopied && showSuccessState ? (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successText}
        </>
      ) : (
        <>
          {children || (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </>
      )}
    </Button>
  );
}

// Specialized component for copying post content with preview
interface PostClipboardButtonProps {
  content: string;
  maxPreviewLength?: number;
  className?: string;
}

export function PostClipboardButton({ content, maxPreviewLength = 50, className }: PostClipboardButtonProps) {
  const previewText = content.length > maxPreviewLength
    ? content.slice(0, maxPreviewLength) + '...'
    : content;

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded text-center">
        {previewText}
      </div>
      <ClipboardButton
        text={content}
        className={className}
        successText="Post copied!"
      />
    </div>
  );
}

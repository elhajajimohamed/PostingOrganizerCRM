'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { MediaService } from '@/lib/services/media-service';
import { useAuth } from '@/lib/auth-context';

interface MediaUploadProps {
  onUploadSuccess: () => void;
  onCancel: () => void;
}

export function MediaUpload({ onUploadSuccess, onCancel }: MediaUploadProps) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please select an image or video file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    // Check authentication first
    if (!user) {
      setError('❌ You need to log in to upload files. Please sign in first.');
      return;
    }

    if (!selectedFile || !category) {
      setError('Please select a file and category');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess(false);

    try {
      console.log('Starting upload...', {
        file: selectedFile.name,
        category,
        userId: user.uid,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      // Check file size before upload
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      if (selectedFile.size > maxSize) {
        throw new Error(`File size (${MediaService.formatFileSize(selectedFile.size)}) exceeds maximum limit of 5MB`);
      }

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      console.log('Uploading file to Firebase Storage...');
      const mediaId = await MediaService.uploadMedia(selectedFile, category, user.uid);
      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log('Upload successful! Media ID:', mediaId);

      // Show success animation
      setSuccess(true);
      setTimeout(() => {
        onUploadSuccess();
      }, 1500);

    } catch (err: any) {
      console.error('Upload failed:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to upload file';
      
      if (err.message?.includes('storage/unauthorized')) {
        errorMessage = '🔐 Authentication required. Please log in and try again.';
      } else if (err.message?.includes('quota-exceeded')) {
        errorMessage = '📦 Storage quota exceeded. Please contact support.';
      } else if (err.message?.includes('CORS')) {
        errorMessage = '🌐 CORS error. Please check storage configuration.';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = '🌍 Network error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setCategory('');
    setError('');
    setSuccess(false);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Media</CardTitle>
        <CardDescription>
          Upload images or videos to use in your posts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Authentication Status Indicator */}
          <div className={`p-4 rounded-lg border ${
            user
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className="flex items-center">
              {user ? (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">✅ Authenticated as {user.displayName || user.email}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">❌ Not authenticated - Please log in</span>
                </>
              )}
            </div>
            {!user && (
              <div className="mt-3">
                <p className="text-sm mb-2">
                  🔒 Authentication required to upload files to Firebase Storage
                </p>
                <p className="text-sm">
                  Please sign in to your account before attempting to upload images or videos.
                </p>
              </div>
            )}
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              isDragOver
                ? 'border-blue-400 bg-blue-50 scale-105'
                : selectedFile
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-4">
                {previewUrl && (
                  <div className="mb-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-48 mx-auto rounded-lg shadow-md"
                    />
                  </div>
                )}
                <div className="text-green-600">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {MediaService.formatFileSize(selectedFile.size)} • {selectedFile.type}
                  </p>
                </div>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Choose Different File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-medium">Drag and drop your file here</p>
                  <p className="text-sm text-gray-600">or click to browse</p>
                </div>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Browse Files
                </Button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {MediaService.getCommonCategories().map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between text-sm font-medium">
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading your {selectedFile?.type.startsWith('image/') ? 'image' : 'video'}...
                </span>
                <span className="text-blue-600">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Success Animation */}
          {success && (
            <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center text-green-700">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Upload successful!</span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !category || uploading || success}
              className={`flex-1 transition-all duration-200 ${
                success
                  ? 'bg-green-600 hover:bg-green-700'
                  : uploading
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {success ? (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Uploaded!
                </span>
              ) : uploading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload File'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onCancel();
              }}
              className="flex-1 transition-all duration-200 hover:bg-gray-50"
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

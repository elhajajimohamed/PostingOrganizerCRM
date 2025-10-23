'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Media } from '@/lib/types';
import { MediaService } from '@/lib/services/media-service';
import { MediaUpload } from './media-upload';
import { useAuth } from '@/lib/auth-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export function MediaList() {
  const { user } = useAuth();
  const [media, setMedia] = useState<Media[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingMedia, setDeletingMedia] = useState<Media | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'posts-only'>('posts-only');
  const [filterCategory, setFilterCategory] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Load media
  const loadMedia = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('Loading media for user:', user.uid);
      const data = await MediaService.getMediaByUser(user.uid);
      console.log('Loaded media:', data);
      setMedia(data);
      setFilteredMedia(data);
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [user]);

  // Filter media based on search term, type, and category
  useEffect(() => {
    let filtered = media;

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType === 'posts-only') {
      // Show only posts images (exclude profile pictures and profile images)
      filtered = filtered.filter(m =>
        m.type === 'image' &&
        m.category !== 'Profile Pictures' &&
        m.category !== 'Profile Images' &&
        !m.category.toLowerCase().includes('profile')
      );
    } else if (filterType !== 'all') {
      filtered = filtered.filter(m => m.type === filterType);
    }

    // Filter by category
    if (filterCategory) {
      filtered = filtered.filter(m => m.category === filterCategory);
    }

    setFilteredMedia(filtered);
  }, [searchTerm, filterType, filterCategory, media]);

  // Handle upload success
  const handleUploadSuccess = () => {
    setShowUpload(false);
    loadMedia();
  };

  // Handle upload cancel
  const handleUploadCancel = () => {
    setShowUpload(false);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingMedia?.id) return;

    try {
      await MediaService.deleteMedia(deletingMedia.id);
      setDeletingMedia(null);
      loadMedia();
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  };

  // Handle copy URL to clipboard
  const handleCopyUrl = async (media: Media) => {
    try {
      await navigator.clipboard.writeText(media.url);
      setNotification({ type: 'success', message: 'Media URL copied to clipboard!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      setNotification({ type: 'error', message: 'Failed to copy URL to clipboard' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Get authenticated image URL
  const getAuthenticatedImageUrl = async (url: string): Promise<string> => {
    try {
      console.log('🔄 Getting authenticated URL for:', url);
      const result = await MediaService.getAuthenticatedMediaUrl(url);
      console.log('✅ Got authenticated URL:', result);
      return result;
    } catch (error) {
      console.error('💥 Failed to get authenticated URL:', error);
      return url; // Fallback to original URL
    }
  };

  // Test Firebase Storage connection
  const testStorageConnection = async () => {
    try {
      const isConnected = await MediaService.testStorageConnection();
      if (isConnected) {
        setNotification({ type: 'success', message: 'Firebase Storage is working correctly!' });
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({ type: 'error', message: 'Firebase Storage connection failed. Check console for details.' });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      console.error('Storage test failed:', error);
      setNotification({ type: 'error', message: 'Storage test failed. Check console for details.' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Debug function to check media URLs
  const debugMediaUrls = async () => {
    console.log('=== MEDIA DEBUG INFO ===');
    console.log('Total media items:', media.length);
    console.log('Sample media item:', media[0]);
    if (media[0]) {
      console.log('Sample URL:', media[0].url);
      console.log('URL structure check:', {
        isFirebaseUrl: media[0].url.includes('firebase'),
        isStorageUrl: media[0].url.includes('storage'),
        hasToken: media[0].url.includes('token='),
      });

      // Test the URL
      const isAccessible = await MediaService.testMediaUrl(media[0].url);
      console.log('Sample URL accessibility test:', isAccessible);
    }
    console.log('Firebase config check:', {
      apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

    // Test all media URLs
    if (media.length > 0) {
      console.log('Testing all media URLs...');
      for (const item of media.slice(0, 5)) { // Test first 5 items
        const isAccessible = await MediaService.testMediaUrl(item.url);
        console.log(`${item.name}: ${isAccessible ? '✅' : '❌'} (${item.url})`);
      }
    }
  };

  // Get unique categories from media
  const categories = [...new Set(media.map(m => m.category))].sort();

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-36 animate-pulse"></div>
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (showUpload) {
    return (
      <MediaUpload
        onUploadSuccess={handleUploadSuccess}
        onCancel={handleUploadCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Display */}
      {notification && (
        <Alert variant={notification.type === 'success' ? 'success' : notification.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={async () => {
            console.log('🔧 Running comprehensive media diagnostics...');

            // Show loading state
            setNotification({ type: 'info', message: 'Running diagnostics...' });

            try {
              const results = await MediaService.runMediaDiagnostics();

              console.log('📋 Diagnostic Results:', results);

              // Show results in notification
              const successCount = results.sampleUrls.filter(url => url.accessible).length;
              const totalCount = results.sampleUrls.length;

              if (results.storageConnection && successCount === totalCount) {
                setNotification({
                  type: 'success',
                  message: `✅ All systems working! ${successCount}/${totalCount} URLs accessible`
                });
              } else {
                setNotification({
                  type: 'error',
                  message: `❌ Issues found: ${successCount}/${totalCount} URLs accessible. Check console for details.`
                });
              }

              // Log recommendations
              if (results.recommendations.length > 0) {
                console.log('🔧 Recommendations:', results.recommendations);
              }

            } catch (error) {
              console.error('💥 Diagnostics failed:', error);
              setNotification({
                type: 'error',
                message: 'Diagnostics failed. Check console for details.'
              });
            }

            setTimeout(() => setNotification(null), 5000);
          }}
          className="hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-all duration-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Diagnose Issues
        </Button>
        <Button
          variant="outline"
          onClick={debugMediaUrls}
          className="hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Debug Info
        </Button>
        <Button
          variant="outline"
          onClick={loadMedia}
          className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
          disabled={loading}
        >
          <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
        <Button
          onClick={() => setShowUpload(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload Media
        </Button>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                placeholder="Search by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col">
              <label htmlFor="filter-type" className="sr-only">Filter by media type</label>
              <select
                id="filter-type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'image' | 'video')}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:ring-blue-400 transition-colors duration-200"
              >
                <option value="all">📁 All Types</option>
                <option value="posts-only">📝 Posts Only</option>
                <option value="image">📷 Images</option>
                <option value="video">🎥 Videos</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="filter-category" className="sr-only">Filter by category</label>
              <select
                id="filter-category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:ring-blue-400 transition-colors duration-200 min-w-[150px]"
              >
                <option value="">📂 All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active filters display */}
        {(searchTerm || filterType !== 'all' || filterCategory) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Active filters:</span>
              {searchTerm && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  Search: "{searchTerm}"
                </span>
              )}
              {filterType !== 'all' && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                  Type: {filterType === 'posts-only' ? 'Posts Only' : filterType}
                </span>
              )}
              {filterCategory && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  Category: {filterCategory}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('posts-only');
                  setFilterCategory('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear all
              </Button>
            </div>
          </div>
        )}
      </div>

      {filteredMedia.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="text-8xl mb-6 animate-bounce">🖼️</div>
            <h3 className="text-2xl font-bold mb-3 text-gray-800">
              {media.length === 0 ? 'Your Media Library Awaits' : 'No Media Found'}
            </h3>
            <p className="text-gray-600 text-center mb-6 max-w-md text-lg">
              {media.length === 0
                ? 'Start building your media collection by uploading your first image or video'
                : 'Try adjusting your search terms or filters to find what you\'re looking for'
              }
            </p>
            {media.length === 0 && (
              <Button
                onClick={() => setShowUpload(true)}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Your First Media
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredMedia.map((item) => (
            <Card
              key={item.id}
              className="group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-md"
            >
              <div className="aspect-square relative bg-gradient-to-br from-gray-100 to-gray-200">
                {item.type === 'image' ? (
                  <>
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                      crossOrigin="anonymous"
                      onError={async (e) => {
                        console.error('❌ Image failed to load:', {
                          url: item.url,
                          name: item.name,
                          error: e,
                          target: e.currentTarget,
                          naturalWidth: e.currentTarget.naturalWidth,
                          naturalHeight: e.currentTarget.naturalHeight
                        });

                        setImageErrors(prev => new Set([...prev, item.id || item.url]));

                        // Try multiple fallback strategies
                        let attempts = 0;
                        const maxAttempts = 3;

                        const tryLoad = async () => {
                          attempts++;
                          console.log(`🔄 Attempt ${attempts}/${maxAttempts} for ${item.name}`);

                          try {
                            if (attempts === 1) {
                              // First retry: authenticated URL
                              const authenticatedUrl = await getAuthenticatedImageUrl(item.url);
                              if (authenticatedUrl !== item.url) {
                                e.currentTarget.src = authenticatedUrl + '?t=' + Date.now();
                                return;
                              }
                            } else if (attempts === 2) {
                              // Second retry: cache bust with random parameter
                              e.currentTarget.src = item.url + '?t=' + Date.now() + '&retry=' + attempts;
                              return;
                            } else if (attempts === 3) {
                              // Third retry: try with different CORS mode
                              e.currentTarget.crossOrigin = 'use-credentials';
                              e.currentTarget.src = item.url + '?t=' + Date.now() + '&final=' + attempts;
                              return;
                            }
                          } catch (error) {
                            console.error(`💥 Attempt ${attempts} failed:`, error);
                          }

                          // If all attempts failed, hide the image
                          if (attempts >= maxAttempts) {
                            console.log('🚫 All attempts failed, hiding image');
                            e.currentTarget.style.display = 'none';
                          } else {
                            // Try next attempt after a short delay
                            setTimeout(tryLoad, 500);
                          }
                        };

                        tryLoad();
                      }}
                      onLoad={(e) => {
                        console.log('✅ Successfully loaded image:', item.url, {
                          naturalWidth: e.currentTarget.naturalWidth,
                          naturalHeight: e.currentTarget.naturalHeight
                        });
                        setImageErrors(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(item.id || item.url);
                          return newSet;
                        });
                      }}
                    />
                    {imageErrors.has(item.id || item.url) && (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-red-50 border-2 border-red-200 border-dashed">
                        <div className="text-center p-4">
                          <div className="text-red-500 text-2xl mb-2">⚠️</div>
                          <div className="text-red-700 text-sm font-medium">Failed to load</div>
                          <div className="text-red-600 text-xs mt-1 max-w-full truncate" title={item.name}>
                            {item.name}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 text-xs"
                            onClick={async () => {
                              console.log('Retrying image load for:', item.url);
                              setImageErrors(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(item.id || item.url);
                                return newSet;
                              });

                              // Try to get authenticated URL and retry
                              try {
                                const authenticatedUrl = await getAuthenticatedImageUrl(item.url);
                                const img = document.querySelector(`img[alt="${item.name}"]`) as HTMLImageElement;
                                if (img) {
                                  img.src = authenticatedUrl + '?t=' + Date.now();
                                }
                              } catch (error) {
                                console.error('Retry failed:', error);
                                // Fallback to original URL
                                const img = document.querySelector(`img[alt="${item.name}"]`) as HTMLImageElement;
                                if (img) {
                                  img.src = item.url + '?t=' + Date.now();
                                }
                              }
                            }}
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    muted
                    preload="metadata"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      console.error('Failed to load video:', item.url, e);
                    }}
                  />
                )}

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCopyUrl(item)}
                      className="bg-white/90 hover:bg-white text-gray-800 shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeletingMedia(item)}
                      className="bg-red-500/90 hover:bg-red-600 text-white shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Top badge */}
                <div className="absolute top-3 right-3">
                  <Badge
                    variant={item.type === 'image' ? 'default' : 'secondary'}
                    className={`shadow-lg ${
                      item.type === 'image'
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-purple-500 hover:bg-purple-600'
                    } transition-colors duration-200`}
                  >
                    {item.type === 'image' ? '📷' : '🎥'} {item.type}
                  </Badge>
                </div>

                {/* Bottom info overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white text-sm font-medium truncate">{item.name}</p>
                  <p className="text-white/80 text-xs">{item.category}</p>
                </div>
              </div>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-sm truncate text-gray-800 mb-1" title={item.name}>
                      {item.name}
                    </h3>
                    <p className="text-xs text-blue-600 font-medium mb-1">📂 {item.category}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{MediaService.formatFileSize(item.size || 0)}</span>
                    <span>{item.uploadedAt?.toLocaleDateString()}</span>
                  </div>

                  {/* Quick action buttons */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyUrl(item)}
                      className="flex-1 text-xs hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingMedia(item)}
                      className="flex-1 text-xs hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMedia} onOpenChange={() => setDeletingMedia(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingMedia?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
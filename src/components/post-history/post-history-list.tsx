'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PostHistory } from '@/lib/types';
import { PostHistoryService } from '@/lib/services/post-history-service';
import { useAuth } from '@/lib/auth-context';
import { ClipboardButton } from '@/components/ui/clipboard-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function PostHistoryList() {
  const { user } = useAuth();
  const [postHistory, setPostHistory] = useState<PostHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<PostHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'today' | 'recent'>('recent');
  const [selectedPost, setSelectedPost] = useState<PostHistory | null>(null);

  // Load post history
  const loadPostHistory = async () => {
    try {
      setLoading(true);
      let data: PostHistory[] = [];

      if (viewMode === 'today') {
        data = await PostHistoryService.getTodayPostHistory();
      } else if (viewMode === 'recent') {
        data = await PostHistoryService.getRecentPostHistory(100);
      } else {
        data = await PostHistoryService.getAllPostHistory();
      }

      setPostHistory(data);
      setFilteredHistory(data);
    } catch (error) {
      console.error('Failed to load post history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPostHistory();
  }, [viewMode]);

  // Filter post history based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredHistory(postHistory);
    } else {
      const filtered = postHistory.filter(post =>
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredHistory(filtered);
    }
  }, [searchTerm, postHistory]);

  // Handle copy content to clipboard (now handled by ClipboardButton)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Post History</h2>
          <p className="text-gray-600">View all completed posts and their details</p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('all')}
        >
          All Posts
        </Button>
        <Button
          variant={viewMode === 'today' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('today')}
        >
          Today's Posts
        </Button>
        <Button
          variant={viewMode === 'recent' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('recent')}
        >
          Recent Posts
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search post content or notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">📜</div>
            <h3 className="text-lg font-semibold mb-2">
              {postHistory.length === 0 ? 'No post history yet' : 'No posts found'}
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {postHistory.length === 0
                ? 'Posts will appear here once you start completing tasks'
                : 'Try adjusting your search terms or view mode'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((post) => (
            <Card key={post.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      Post #{post.id?.slice(-8)}
                    </CardTitle>
                    <CardDescription>
                      {post.timestamp?.toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <ClipboardButton
                      text={post.content}
                      variant="outline"
                      size="sm"
                    >
                      Copy Content
                    </ClipboardButton>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPost(post)}
                        >
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Post Details</DialogTitle>
                          <DialogDescription>
                            Posted on {post.timestamp?.toLocaleString()}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Content</h4>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <pre className="whitespace-pre-wrap text-sm">{post.content}</pre>
                            </div>
                          </div>
                          {post.notes && (
                            <div>
                              <h4 className="font-medium mb-2">Notes</h4>
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-sm">{post.notes}</p>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Account ID:</span>
                              <p className="text-gray-600">{post.accountId}</p>
                            </div>
                            <div>
                              <span className="font-medium">Group ID:</span>
                              <p className="text-gray-600">{post.groupId}</p>
                            </div>
                            {post.templateUsed && (
                              <div>
                                <span className="font-medium">Template:</span>
                                <p className="text-gray-600">{post.templateUsed}</p>
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Operator:</span>
                              <p className="text-gray-600">{post.operatorId}</p>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm line-clamp-3">{post.content}</p>
                  </div>
                  {post.notes && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Notes:</span> {post.notes}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Account: {post.accountId.slice(-8)}</span>
                    <span>Group: {post.groupId.slice(-8)}</span>
                    {post.templateUsed && (
                      <span>Template: {post.templateUsed}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
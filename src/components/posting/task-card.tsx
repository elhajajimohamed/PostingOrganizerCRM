'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PostingTask, FacebookAccount, FacebookGroup, PostingText, Media } from '@/lib/types';
import { PostingTaskService } from '@/lib/services/posting-task-service';
import { AccountService } from '@/lib/services/account-service';
import { GroupService } from '@/lib/services/group-service';
import { MediaService } from '@/lib/services/media-service';

interface TaskCardProps {
  task: PostingTask;
  account?: FacebookAccount;
  group?: FacebookGroup;
  text?: PostingText;
  media?: Media;
  onTaskUpdate: () => void;
}

export function TaskCard({ task, account, group, text, media, onTaskUpdate }: TaskCardProps) {
  const [loading, setLoading] = useState(false);

  const getStatusBadge = (status: PostingTask['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">🟡 Pending</Badge>;
      case 'posted':
        return <Badge variant="default">🟢 Posted</Badge>;
      case 'skipped':
        return <Badge variant="outline">🔵 Skipped</Badge>;
      case 'failed':
        return <Badge variant="destructive">🔴 Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const handleMarkAsPosted = async () => {
    setLoading(true);
    try {
      await PostingTaskService.recordPosting(task.id!, 'success');
      onTaskUpdate();
    } catch (error) {
      console.error('Failed to mark as posted:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await PostingTaskService.recordPosting(task.id!, 'skipped');
      onTaskUpdate();
    } catch (error) {
      console.error('Failed to skip task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      // Delete current task and generate a new one
      await PostingTaskService.deleteTask(task.id!);
      await PostingTaskService.generateSmartTasks(1);
      onTaskUpdate();
    } catch (error) {
      console.error('Failed to regenerate task:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with Task ID and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Task #{task.id?.slice(-6)}</span>
              {getStatusBadge(task.status)}
            </div>
            <span className="text-xs text-gray-500">
              {task.createdAt.toLocaleDateString()}
            </span>
          </div>

          {/* Account Info */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
              account?.profileImage ? '' : 'bg-gradient-to-br from-blue-400 to-purple-500'
            }`}>
              {account?.profileImage ? (
                <img
                  src={account.profileImage}
                  alt={account.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                account?.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-800">{account?.name}</p>
              <p className="text-sm text-blue-600">{account?.browser} • {account?.status}</p>
            </div>
          </div>

          {/* Group Info */}
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-sm">
              👥
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800">{group?.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-green-600">{group?.memberCount?.toLocaleString()} members</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(group?.url || '')}
                  className="h-6 px-2 text-xs text-green-600 hover:text-green-800"
                >
                  📋 Copy URL
                </Button>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Text to Publish:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(text?.content || '')}
                className="h-6 px-2 text-xs"
              >
                📋 Copy Text
              </Button>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg max-h-24 overflow-y-auto">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{text?.content}</p>
            </div>
            {text?.tags && text.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {text.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Image Preview */}
          {media && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Image:</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(media.url, '_blank')}
                    className="h-6 px-2 text-xs"
                  >
                    👁️ View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(media.url)}
                    className="h-6 px-2 text-xs"
                  >
                    📋 Copy Link
                  </Button>
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <img
                  src={media.url}
                  alt={media.name}
                  className="w-full h-24 object-cover rounded"
                />
                <p className="text-xs text-gray-600 mt-1 truncate">{media.name}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          {task.status === 'pending' && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                onClick={handleMarkAsPosted}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                ✅ Mark as Posted
              </Button>
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={loading}
                className="flex-1"
              >
                🔄 Regenerate
              </Button>
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={loading}
                className="flex-1"
              >
                ❌ Skip
              </Button>
            </div>
          )}

          {/* Posted timestamp */}
          {task.postedAt && (
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              Posted: {task.postedAt.toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

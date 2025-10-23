'use client';

import { PostHistoryList } from '@/components/post-history/post-history-list';
import { NavigationHeader } from '@/components/ui/navigation-header';

export default function PostHistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader
        title="Post History"
        subtitle="View your posting activity and history"
      />
      <div className="max-w-7xl mx-auto p-8">
        <PostHistoryList />
      </div>
    </div>
  );
}
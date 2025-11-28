'use client';

import { MediaList } from '@/components/media/media-list';
import { NavigationHeader } from '@/components/ui/navigation-header';

export default function MediaPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader
        title="Media Library"
        subtitle="Manage your uploaded images and videos"
      />
      <div className="max-w-7xl mx-auto p-8">
        <MediaList />
      </div>
    </div>
  );
}

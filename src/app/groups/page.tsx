'use client';

import { GroupsList } from '@/components/groups/groups-list';
import { NavigationHeader } from '@/components/ui/navigation-header';

export default function GroupsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader
        title="Facebook Groups"
        subtitle="Manage your target Facebook groups"
      />
      <div className="max-w-7xl mx-auto p-8">
        <GroupsList />
      </div>
    </div>
  );
}
'use client';

import { TemplatesList } from '@/components/templates/templates-list';
import { NavigationHeader } from '@/components/ui/navigation-header';

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader
        title="Templates"
        subtitle="Manage your posting templates"
      />
      <div className="max-w-7xl mx-auto p-8">
        <TemplatesList />
      </div>
    </div>
  );
}

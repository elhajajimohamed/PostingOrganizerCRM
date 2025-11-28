'use client';

import { SettingsForm } from '@/components/settings/settings-form';
import { NavigationHeader } from '@/components/ui/navigation-header';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader
        title="Settings"
        subtitle="Configure your application preferences"
      />
      <div className="max-w-4xl mx-auto p-8">
        <SettingsForm />
      </div>
    </div>
  );
}

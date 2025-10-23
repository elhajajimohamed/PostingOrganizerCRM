'use client';

import { AccountsList } from '@/components/accounts/accounts-list';
import { NavigationHeader } from '@/components/ui/navigation-header';

export default function AccountsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader
        title="Facebook Accounts"
        subtitle="Manage your Facebook accounts"
      />
      <div className="max-w-7xl mx-auto p-8">
        <AccountsList />
      </div>
    </div>
  );
}
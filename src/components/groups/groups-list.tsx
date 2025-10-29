'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FacebookGroup, FacebookAccount } from '@/lib/types';
import { GroupService } from '@/lib/services/group-service';
import { AccountService } from '@/lib/services/account-service';
import { GroupForm } from './group-form';
import { CSVImport } from './csv-import';
import { JSONImport } from './json-import';
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

export function GroupsList() {
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<FacebookGroup[]>([]);
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showJSONImport, setShowJSONImport] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FacebookGroup | undefined>();
  const [deletingGroup, setDeletingGroup] = useState<FacebookGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [currentView, setCurrentView] = useState<'accounts' | 'groups'>('accounts');
  const [selectedUnassignedGroups, setSelectedUnassignedGroups] = useState<Set<string>>(new Set());
  const [showUnassignedBulkActions, setShowUnassignedBulkActions] = useState(false);

  // Load groups and accounts
  const loadGroups = async () => {
    try {
      setLoading(true);
      const [groupsData, accountsData] = await Promise.all([
        GroupService.getAllGroups(),
        AccountService.getAllAccounts()
      ]);
      setGroups(groupsData);
      setFilteredGroups(groupsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // Filter groups based on search term and account
  useEffect(() => {
    let filtered = groups;

    // Filter by account (when in groups view)
    if (currentView === 'groups' && selectedAccount) {
      console.log('Filtering groups for account:', selectedAccount);
      console.log('Total groups:', groups.length);
      console.log('Groups with accountId:', groups.filter(g => g.accountId).length);
      console.log('Groups without accountId:', groups.filter(g => !g.accountId).length);

      filtered = filtered.filter(group => {
        const matches = group.accountId === selectedAccount;
        console.log(`Group ${group.name}: accountId=${group.accountId}, matches=${matches}`);
        return matches;
      });

      console.log('Filtered result:', filtered.length);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        group.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredGroups(filtered);
  }, [searchTerm, selectedAccount, groups, currentView]);

  // Handle form success
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingGroup(undefined);
    loadGroups();
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingGroup(undefined);
  };

  // Handle import success
  const handleImportSuccess = () => {
    setShowImport(false);
    loadGroups();
  };

  // Handle import cancel
  const handleImportCancel = () => {
    setShowImport(false);
  };

  // Handle JSON import success
  const handleJSONImportSuccess = () => {
    setShowJSONImport(false);
    loadGroups();
  };

  // Handle JSON import cancel
  const handleJSONImportCancel = () => {
    setShowJSONImport(false);
  };

  // Handle edit
  const handleEdit = (group: FacebookGroup) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingGroup?.id) return;

    try {
      await GroupService.deleteGroup(deletingGroup.id);
      setDeletingGroup(null);
      loadGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  // Get warning badge variant
  const getWarningBadgeVariant = (warningCount: number) => {
    if (warningCount === 0) return 'default';
    if (warningCount <= 2) return 'secondary';
    return 'destructive';
  };

  // Bulk selection handlers
  const handleGroupSelect = (groupId: string, isSelected: boolean) => {
    const newSelection = new Set(selectedGroups);
    if (isSelected) {
      newSelection.add(groupId);
    } else {
      newSelection.delete(groupId);
    }
    setSelectedGroups(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedGroups(new Set(filteredGroups.map(g => g.id!)));
      setShowBulkActions(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedGroups.size === 0) return;

    try {
      const deletePromises = Array.from(selectedGroups).map(groupId =>
        GroupService.deleteGroup(groupId)
      );

      await Promise.all(deletePromises);

      setSelectedGroups(new Set());
      setShowBulkActions(false);
      loadGroups(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete groups:', error);
    }
  };

  // Unassigned groups bulk operations
  const handleUnassignedGroupSelect = (groupId: string, isSelected: boolean) => {
    const newSelection = new Set(selectedUnassignedGroups);
    if (isSelected) {
      newSelection.add(groupId);
    } else {
      newSelection.delete(groupId);
    }
    setSelectedUnassignedGroups(newSelection);
    setShowUnassignedBulkActions(newSelection.size > 0);
  };

  const handleSelectAllUnassigned = () => {
    const unassignedGroups = groups.filter(g => !g.accountId);
    if (selectedUnassignedGroups.size === unassignedGroups.length) {
      setSelectedUnassignedGroups(new Set());
      setShowUnassignedBulkActions(false);
    } else {
      setSelectedUnassignedGroups(new Set(unassignedGroups.map(g => g.id!)));
      setShowUnassignedBulkActions(true);
    }
  };

  const handleBulkDeleteUnassigned = async () => {
    if (selectedUnassignedGroups.size === 0) return;

    try {
      const deletePromises = Array.from(selectedUnassignedGroups).map(groupId =>
        GroupService.deleteGroup(groupId)
      );

      await Promise.all(deletePromises);

      setSelectedUnassignedGroups(new Set());
      setShowUnassignedBulkActions(false);
      loadGroups(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete unassigned groups:', error);
    }
  };

  const handleBulkAssignUnassigned = async (targetAccountId: string) => {
    if (selectedUnassignedGroups.size === 0 || !targetAccountId) return;

    try {
      const updatePromises = Array.from(selectedUnassignedGroups).map(groupId =>
        GroupService.updateGroup(groupId, { accountId: targetAccountId })
      );

      await Promise.all(updatePromises);

      setSelectedUnassignedGroups(new Set());
      setShowUnassignedBulkActions(false);
      loadGroups(); // Refresh the list
    } catch (error) {
      console.error('Failed to assign unassigned groups:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <GroupForm
        group={editingGroup}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  if (showImport) {
    return (
      <CSVImport
        onImportSuccess={handleImportSuccess}
        onCancel={handleImportCancel}
      />
    );
  }

  if (showJSONImport) {
    return (
      <JSONImport
        onImportSuccess={handleJSONImportSuccess}
        onCancel={handleJSONImportCancel}
      />
    );
  }

  // Show accounts overview when no account is selected
  if (currentView === 'accounts') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Facebook Accounts
            </h2>
            <p className="text-gray-600 mt-1">
              Select an account to view its groups • {accounts.length} accounts
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowImport(true)}
              className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowJSONImport(true)}
              className="hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Import JSON
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Group
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900">{accounts.length}</div>
              <div className="text-sm text-blue-700">Total Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-900">{groups.length}</div>
              <div className="text-sm text-green-700">Total Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-900">
                {groups.filter(g => g.accountId).length}
              </div>
              <div className="text-sm text-orange-700">Assigned Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-900">
                {groups.filter(g => !g.accountId).length}
              </div>
              <div className="text-sm text-red-700">Unassigned Groups</div>
            </div>
          </div>
        </div>

        {/* Accounts Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => {
            const groupCount = groups.filter(g => g.accountId === account.id).length;
            const assignedGroups = groups.filter(g => g.accountId === account.id);
            return (
              <Card
                key={account.id}
                className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-md bg-gradient-to-br from-blue-50 to-purple-100"
                onClick={() => {
                  setSelectedAccount(account.id!);
                  setCurrentView('groups');
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                      account.profileImage ? '' : 'bg-gradient-to-br from-blue-400 to-purple-500'
                    }`}>
                      {account.profileImage ? (
                        <img
                          src={account.profileImage}
                          alt={account.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        account.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg text-blue-800">{account.name}</CardTitle>
                      <CardDescription className="text-blue-600">
                        ID: {account.accountId}
                      </CardDescription>
                    </div>
                    <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                      {account.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-900">{groupCount}</div>
                    <p className="text-sm text-blue-700">Groups</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Click to view groups
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Unassigned Groups Section */}
        {(() => {
          const unassignedGroups = groups.filter(g => !g.accountId);
          if (unassignedGroups.length > 0) {
            return (
              <Card className="border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-orange-800">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Unassigned Groups ({unassignedGroups.length})
                  </CardTitle>
                  <CardDescription className="text-orange-600">
                    These groups need to be assigned to Facebook accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {unassignedGroups.slice(0, 6).map((group) => (
                      <div key={group.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200">
                        <input
                          type="checkbox"
                          checked={selectedUnassignedGroups.has(group.id!)}
                          onChange={(e) => handleUnassignedGroupSelect(group.id!, e.target.checked)}
                          className="w-4 h-4 text-orange-600 bg-orange-100 border-orange-300 rounded focus:ring-orange-500"
                        />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-semibold">
                          👥
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{group.name}</p>
                          <p className="text-xs text-gray-500 truncate">{group.url}</p>
                        </div>
                      </div>
                    ))}
                    {unassignedGroups.length > 6 && (
                      <div className="flex items-center justify-center p-3 bg-white rounded-lg border border-orange-200">
                        <span className="text-sm text-orange-600 font-medium">
                          +{unassignedGroups.length - 6} more unassigned
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Unassigned Groups Bulk Actions */}
                  {showUnassignedBulkActions && (
                    <div className="mb-4 p-3 bg-orange-100 rounded-lg border border-orange-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-orange-800">
                            {selectedUnassignedGroups.size} unassigned group{selectedUnassignedGroups.size !== 1 ? 's' : ''} selected
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAllUnassigned}
                            className="text-orange-700 border-orange-300 hover:bg-orange-50"
                          >
                            {selectedUnassignedGroups.size === unassignedGroups.length ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUnassignedGroups(new Set());
                              setShowUnassignedBulkActions(false);
                            }}
                            className="text-gray-600"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDeleteUnassigned}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete ({selectedUnassignedGroups.size})
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Select onValueChange={handleBulkAssignUnassigned}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select account to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id!}>
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs ${
                                account.profileImage ? '' : 'bg-gradient-to-br from-blue-400 to-purple-500'
                              }`}>
                                {account.profileImage ? '🖼️' : account.name.charAt(0).toUpperCase()}
                              </div>
                              {account.name} ({account.accountId})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImport(true)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      Import More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }
          return null;
        })()}

        {accounts.length === 0 && (
          <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="text-8xl mb-6 animate-bounce">📱</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">
                No Facebook Accounts
              </h3>
              <p className="text-gray-600 text-center mb-6 max-w-md text-lg">
                Add Facebook accounts first to start organizing your groups
              </p>
              <Button
                onClick={() => window.location.href = '/accounts'}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Manage Accounts
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

 // Show groups for selected account
 return (
   <div className="space-y-6">
     {/* Back Navigation */}
     <div className="flex items-center gap-4">
       <Button
         variant="outline"
         onClick={() => {
           setCurrentView('accounts');
           setSelectedAccount('');
           setSearchTerm('');
         }}
         className="hover:bg-gray-50"
       >
         <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
         </svg>
         Back to Accounts
       </Button>

       <div className="flex items-center gap-3">
         {(() => {
           const account = accounts.find(a => a.id === selectedAccount);
           return account ? (
             <>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                 account.profileImage ? '' : 'bg-gradient-to-br from-blue-400 to-purple-500'
               }`}>
                 {account.profileImage ? (
                   <img
                     src={account.profileImage}
                     alt={account.name}
                     className="w-8 h-8 rounded-full object-cover"
                   />
                 ) : (
                   account.name.charAt(0).toUpperCase()
                 )}
               </div>
               <div>
                 <h3 className="font-semibold text-gray-800">{account.name}</h3>
                 <p className="text-sm text-gray-600">{filteredGroups.length} groups</p>
               </div>
               <Button
                 variant="outline"
                 onClick={() => setShowJSONImport(true)}
                 className="hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all duration-200 ml-4"
               >
                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                 </svg>
                 Import JSON
               </Button>
             </>
           ) : null;
         })()}
       </div>
     </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search groups by name, tags, or language..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Bulk Actions Toolbar */}
      {showBulkActions && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-red-800">
                {selectedGroups.size} group{selectedGroups.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                {selectedGroups.size === filteredGroups.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedGroups(new Set());
                  setShowBulkActions(false);
                }}
                className="text-gray-600"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedGroups.size === 0}
                className="bg-red-600 hover:bg-red-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Selected ({selectedGroups.size})
              </Button>
            </div>
          </div>
        </div>
      )}

      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-semibold mb-2">
              {groups.length === 0 ? 'No groups yet' : 'No groups found'}
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {groups.length === 0
                ? 'Get started by adding your first Facebook group'
                : 'Try adjusting your search terms'
              }
            </p>
            {groups.length === 0 && (
              <Button onClick={() => setShowForm(true)}>
                Add Your First Group
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => {
            const assignedAccount = accounts.find(acc => acc.id === group.accountId);
            return (
              <Card key={group.id} className="relative hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="space-y-3">
                    {/* Selection Checkbox */}
                    <div className="flex items-center justify-between">
                      <input
                        type="checkbox"
                        checked={selectedGroups.has(group.id!)}
                        onChange={(e) => handleGroupSelect(group.id!, e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      {group.warningCount > 0 && (
                        <Badge variant={getWarningBadgeVariant(group.warningCount)}>
                          {group.warningCount} warning{group.warningCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    {/* Account Assignment */}
                    {assignedAccount && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                          assignedAccount.profileImage ? '' : 'bg-gradient-to-br from-blue-400 to-purple-500'
                        }`}>
                          {assignedAccount.profileImage ? (
                            <img
                              src={assignedAccount.profileImage}
                              alt={assignedAccount.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            assignedAccount.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{assignedAccount.name}</p>
                          <p className="text-xs text-gray-500">ID: {assignedAccount.accountId}</p>
                        </div>
                        <Badge variant={assignedAccount.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {assignedAccount.status}
                        </Badge>
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg truncate">{group.name}</CardTitle>
                        <CardDescription className="truncate">
                          {group.url}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Language:</span>
                    <Badge variant="outline">{group.language}</Badge>
                  </div>

                  {group.tags.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-600 block mb-1">Tags:</span>
                      <div className="flex flex-wrap gap-1">
                        {group.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {group.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{group.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Last post: {group.lastPostAt ? group.lastPostAt.toLocaleDateString() : 'Never'}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(group)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeletingGroup(group)}
                      className="flex-1"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingGroup} onOpenChange={() => setDeletingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGroup?.name}"? This action cannot be undone and will also delete all associated posting history.
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
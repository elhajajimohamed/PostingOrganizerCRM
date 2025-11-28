'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Merge,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Phone,
  Edit,
  PhoneOff
} from 'lucide-react';
import {
  DuplicateDetectionService,
  DuplicateGroup,
  DuplicateMatch
} from '@/lib/services/duplicate-detection-service';

interface DuplicatesManagementProps {
  onRefresh?: () => void;
}

type ViewMode = 'groups' | 'individual' | 'no-phone';
type FilterType = 'all' | 'exact' | 'high' | 'medium' | 'low';

export function DuplicatesManagement({ onRefresh }: DuplicatesManagementProps) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('groups');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [noPhoneCallCenters, setNoPhoneCallCenters] = useState<any[]>([]);
  const [selectedNoPhone, setSelectedNoPhone] = useState<string[]>([]);
  const [loadingNoPhone, setLoadingNoPhone] = useState(false);

  // Analysis results
  const [analysisResults, setAnalysisResults] = useState<{
    totalCallCenters: number;
    duplicateGroups: DuplicateGroup[];
    summary: {
      exactMatches: number;
      highMatches: number;
      mediumMatches: number;
      lowMatches: number;
      totalDuplicates: number;
    };
  } | null>(null);

  useEffect(() => {
    console.log('🔍 [DUPLICATES-MANAGEMENT] Component mounted, starting initial analysis...');
    analyzeDatabase();
    loadNoPhoneCallCenters();
  }, []);

  const analyzeDatabase = async () => {
    setAnalyzing(true);
    try {
      console.log('🔍 [DUPLICATES-MANAGEMENT] Starting comprehensive database analysis via API...');

      const response = await fetch('/api/external-crm/duplicates');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze duplicates');
      }

      setAnalysisResults({
        totalCallCenters: data.totalCallCenters,
        duplicateGroups: data.data,
        summary: data.summary
      });
      setDuplicateGroups(data.data);

      console.log('✅ [DUPLICATES-MANAGEMENT] Analysis complete:', data);

      // Auto-expand groups with exact matches
      const groupsToExpand = data.data
        .filter((group: DuplicateGroup) => group.matches.some((match: DuplicateMatch) => match.matchType === 'exact'))
        .map((group: DuplicateGroup) => group.id);

      setExpandedGroups(new Set(groupsToExpand));

    } catch (error) {
      console.error('❌ [DUPLICATES-MANAGEMENT] Error analyzing database:', error);
      alert('Failed to analyze database for duplicates');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGroupSelect = (groupId: string, selected: boolean) => {
    setSelectedGroups(prev => {
      const newSelection = selected
        ? [...prev, groupId]
        : prev.filter(id => id !== groupId);
      return newSelection;
    });
  };

  const handleDuplicateSelect = (duplicateId: string, selected: boolean) => {
    setSelectedDuplicates(prev => {
      const newSelection = selected
        ? [...prev, duplicateId]
        : prev.filter(id => id !== duplicateId);
      return newSelection;
    });
  };

  const handleSelectAllGroups = (selected: boolean) => {
    const newSelection = selected ? filteredGroups.map(g => g.id) : [];
    setSelectedGroups(newSelection);
  };

  const handleSelectAllDuplicates = (selected: boolean) => {
    const allDuplicateIds = filteredGroups.flatMap(group =>
      group.matches.map(match => match.id)
    );
    const newSelection = selected ? allDuplicateIds : [];
    setSelectedDuplicates(newSelection);
  };

  const handleBulkMerge = async () => {
    if (selectedGroups.length === 0) {
      alert('Please select groups to merge');
      return;
    }

    if (!confirm(`Are you sure you want to merge ${selectedGroups.length} duplicate groups? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 [DUPLICATES-MANAGEMENT] Starting bulk merge operation via API...');

      const response = await fetch('/api/external-crm/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_merge_groups', groupIds: selectedGroups })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to merge groups');
      }

      console.log(`✅ [DUPLICATES-MANAGEMENT] Bulk merge complete:`, data.result);

      const failedCount = data.result.processed - data.result.successful;
      const message = `Successfully processed ${data.result.processed} groups (${data.result.successful} successful${failedCount > 0 ? `, ${failedCount} failed` : ''})`;
      alert(message);
      setSelectedGroups([]);
      await analyzeDatabase(); // Refresh analysis
      onRefresh?.();

    } catch (error) {
      console.error('❌ [DUPLICATES-MANAGEMENT] Error during bulk merge:', error);
      alert('Failed to merge duplicates');
    } finally {
      setLoading(false);
    }
  };

  const loadNoPhoneCallCenters = async () => {
    setLoadingNoPhone(true);
    try {
      console.log('🔍 [DUPLICATES-MANAGEMENT] Loading call centers without phone numbers...');

      const response = await fetch('/api/external-crm/no-phone');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load no-phone call centers');
      }

      setNoPhoneCallCenters(data.data || []);
      console.log(`✅ [DUPLICATES-MANAGEMENT] Loaded ${data.data?.length || 0} call centers without phone numbers`);

    } catch (error) {
      console.error('❌ [DUPLICATES-MANAGEMENT] Error loading no-phone call centers:', error);
      setNoPhoneCallCenters([]);
    } finally {
      setLoadingNoPhone(false);
    }
  };

  const handleNoPhoneSelect = (id: string, selected: boolean) => {
    setSelectedNoPhone(prev => {
      const newSelection = selected
        ? [...prev, id]
        : prev.filter(selectedId => selectedId !== id);
      return newSelection;
    });
  };

  const handleSelectAllNoPhone = (selected: boolean) => {
    const newSelection = selected ? noPhoneCallCenters.map(cc => cc.id) : [];
    setSelectedNoPhone(newSelection);
  };

  const handleBulkDeleteNoPhone = async () => {
    if (selectedNoPhone.length === 0) {
      alert('Please select call centers to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedNoPhone.length} call centers without phone numbers? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      console.log('🗑️ [DUPLICATES-MANAGEMENT] Starting bulk delete of no-phone call centers...');

      const response = await fetch('/api/external-crm/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', callCenterIds: selectedNoPhone })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete call centers');
      }

      console.log(`✅ [DUPLICATES-MANAGEMENT] Successfully deleted ${selectedNoPhone.length} call centers`);
      alert(`Successfully deleted ${selectedNoPhone.length} call centers without phone numbers`);
      setSelectedNoPhone([]);
      await loadNoPhoneCallCenters(); // Refresh no-phone list
      await analyzeDatabase(); // Refresh analysis
      onRefresh?.();

    } catch (error) {
      console.error('❌ [DUPLICATES-MANAGEMENT] Error during bulk delete:', error);
      alert(`Failed to delete call centers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditNoPhone = (callCenter: any) => {
    // This would typically open a modal or navigate to edit page
    console.log('✏️ [DUPLICATES-MANAGEMENT] Edit call center:', callCenter);
    alert(`Edit functionality for ${callCenter.name} would open here`);
  };

  const handleDeleteNoPhone = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/external-crm/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      console.log(`✅ [DUPLICATES-MANAGEMENT] Successfully deleted call center: ${name}`);
      await loadNoPhoneCallCenters(); // Refresh no-phone list
      await analyzeDatabase(); // Refresh analysis
      onRefresh?.();

    } catch (error) {
      console.error('❌ [DUPLICATES-MANAGEMENT] Error deleting call center:', error);
      alert(`Failed to delete call center: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDuplicates.length === 0) {
      alert('Please select duplicates to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedDuplicates.length} duplicate call centers? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      console.log('🗑️ [DUPLICATES-MANAGEMENT] Starting bulk delete operation via API...');

      const response = await fetch('/api/external-crm/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_delete', duplicateIds: selectedDuplicates })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete duplicates');
      }

      console.log(`✅ [DUPLICATES-MANAGEMENT] Successfully deleted ${selectedDuplicates.length} duplicates`);
      alert(`Successfully deleted ${selectedDuplicates.length} duplicates`);
      setSelectedDuplicates([]);
      await analyzeDatabase(); // Refresh analysis
      onRefresh?.();

    } catch (error) {
      console.error('❌ [DUPLICATES-MANAGEMENT] Error during bulk delete:', error);
      alert(`Failed to delete duplicates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMatchTypeIcon = (matchType: string) => {
    switch (matchType) {
      case 'exact': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const filteredGroups = duplicateGroups.filter(group => {
    // Filter by match type
    if (filterType !== 'all') {
      const hasMatchingType = group.matches.some(match => match.matchType === filterType);
      if (!hasMatchingType) return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        group.name.toLowerCase().includes(searchLower) ||
        group.matches.some(match =>
          match.name.toLowerCase().includes(searchLower) ||
          match.city.toLowerCase().includes(searchLower) ||
          match.country.toLowerCase().includes(searchLower)
        );
      if (!matchesSearch) return false;
    }

    return true;
  });

  if (analyzing) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="space-y-6">
              <div className="relative">
                <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">Analyzing Database</h3>
                <p className="text-gray-600">Scanning for duplicate call centers...</p>
                <p className="text-sm text-gray-500">This may take a few moments</p>
              </div>
              <div className="space-y-2">
                <Progress value={undefined} className="w-full" />
                <p className="text-xs text-gray-500">Processing call center data</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysisResults) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Analysis Results</h3>
          <p className="text-gray-600 mb-4">Unable to analyze database for duplicates</p>
          <Button onClick={analyzeDatabase} disabled={analyzing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Analysis Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Duplicates Analysis Results
            </CardTitle>
            <Button onClick={analyzeDatabase} disabled={analyzing} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
              Re-analyze
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{analysisResults.totalCallCenters}</div>
              <div className="text-sm text-gray-600">Total Call Centers</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-900">{analysisResults.summary.exactMatches}</div>
              <div className="text-sm text-red-600">Exact Matches</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-900">{analysisResults.summary.highMatches}</div>
              <div className="text-sm text-orange-600">High Similarity</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-900">{analysisResults.summary.mediumMatches}</div>
              <div className="text-sm text-yellow-600">Medium Similarity</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{analysisResults.summary.lowMatches}</div>
              <div className="text-sm text-blue-600">Low Similarity</div>
            </div>
          </div>

          {analysisResults.summary.totalDuplicates > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Found {analysisResults.summary.totalDuplicates} potential duplicates across {duplicateGroups.length} groups.
                Review and take action to clean up your data.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Management Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'groups' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('groups')}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Duplicates
              </Button>
              <Button
                variant={viewMode === 'no-phone' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('no-phone')}
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                No Phone Numbers
              </Button>
            </div>

            <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Match Types</SelectItem>
                <SelectItem value="exact">Exact Matches</SelectItem>
                <SelectItem value="high">High Similarity</SelectItem>
                <SelectItem value="medium">Medium Similarity</SelectItem>
                <SelectItem value="low">Low Similarity</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search duplicates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOnlySelected(!showOnlySelected)}
            >
              {showOnlySelected ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showOnlySelected ? 'Show All' : 'Show Selected'}
            </Button>
          </div>

          {/* Bulk Actions */}
          {(selectedGroups.length > 0 || selectedDuplicates.length > 0 || selectedNoPhone.length > 0) && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedGroups.length} groups, {selectedDuplicates.length} duplicates, {selectedNoPhone.length} no-phone selected
                  </Badge>
                  <span className="text-sm text-blue-700">
                    Choose an action to apply to selected items
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedGroups([]);
                      setSelectedDuplicates([]);
                      setSelectedNoPhone([]);
                    }}
                  >
                    Clear Selection
                  </Button>
                  {selectedGroups.length > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleBulkMerge}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Merge className="w-4 h-4 mr-2" />
                      Merge Groups
                    </Button>
                  )}
                  {selectedDuplicates.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Duplicates
                    </Button>
                  )}
                  {selectedNoPhone.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDeleteNoPhone}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <PhoneOff className="w-4 h-4 mr-2" />
                      Delete No-Phone Centers
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {viewMode === 'no-phone' ? (
        /* No Phone Numbers Section */
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <PhoneOff className="w-5 h-5" />
                  Call Centers Without Phone Numbers
                </CardTitle>
                <Button onClick={loadNoPhoneCallCenters} disabled={loadingNoPhone} variant="outline">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingNoPhone ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingNoPhone ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p>Loading call centers without phone numbers...</p>
                </div>
              ) : noPhoneCallCenters.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Call Centers Have Phone Numbers</h3>
                  <p className="text-gray-600">Great! All your call centers have contact information.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All for No Phone */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <Checkbox
                      checked={selectedNoPhone.length === noPhoneCallCenters.length && noPhoneCallCenters.length > 0}
                      onCheckedChange={(checked) => handleSelectAllNoPhone(!!checked)}
                    />
                    <span className="font-medium">Select All ({noPhoneCallCenters.length})</span>
                  </div>

                  {/* No Phone Call Centers List */}
                  {noPhoneCallCenters.map((callCenter) => (
                    <Card key={callCenter.id} className="border-orange-200 bg-orange-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedNoPhone.includes(callCenter.id)}
                              onCheckedChange={(checked) => handleNoPhoneSelect(callCenter.id, !!checked)}
                            />
                            <div>
                              <div className="font-medium text-gray-900">{callCenter.name}</div>
                              <div className="text-sm text-gray-600">
                                {callCenter.city}, {callCenter.country} • {callCenter.positions} positions
                              </div>
                              {callCenter.email && (
                                <div className="text-sm text-blue-600">{callCenter.email}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              <PhoneOff className="w-3 h-3 mr-1" />
                              No Phone
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditNoPhone(callCenter)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteNoPhone(callCenter.id, callCenter.name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Duplicates Found</h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== 'all'
                ? 'No duplicates match your current filters'
                : 'Your database is clean - no duplicate call centers detected'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Select All Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedGroups.length === filteredGroups.length && filteredGroups.length > 0}
                  onCheckedChange={(checked) => handleSelectAllGroups(!!checked)}
                />
                <span className="font-medium">Select All Groups ({filteredGroups.length})</span>
                <div className="ml-auto">
                  <Checkbox
                    checked={selectedDuplicates.length === filteredGroups.flatMap(g => g.matches).length}
                    onCheckedChange={(checked) => handleSelectAllDuplicates(!!checked)}
                  />
                  <span className="ml-2 text-sm text-gray-600">Select All Duplicates</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duplicate Groups */}
          {filteredGroups.map((group) => (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleGroupExpansion(group.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedGroups.includes(group.id)}
                      onCheckedChange={(checked) => handleGroupSelect(group.id, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <p className="text-sm text-gray-600">
                        {group.matches.length} similar call centers • Suggested: {group.suggestedAction}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.matches.some(m => m.matchType === 'exact') && (
                      <Badge className={getMatchTypeColor('exact')}>
                        {getMatchTypeIcon('exact')}
                        <span className="ml-1">Exact Match</span>
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm">
                      {expandedGroups.has(group.id) ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedGroups.has(group.id) && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {group.matches.map((match, index) => (
                      <div
                        key={`${match.id}-${index}`}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedDuplicates.includes(match.id)}
                            onCheckedChange={(checked) => handleDuplicateSelect(match.id, !!checked)}
                          />
                          <div>
                            <div className="font-medium">{match.name}</div>
                            <div className="text-sm text-gray-600">
                              {match.city}, {match.country} • {match.similarity}% similarity
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getMatchTypeColor(match.matchType)}>
                            {getMatchTypeIcon(match.matchType)}
                            <span className="ml-1 capitalize">{match.matchType}</span>
                          </Badge>
                          <div className="text-right">
                            <div className="text-sm font-medium">{match.similarity}%</div>
                            <div className="text-xs text-gray-500">Similarity</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Group Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        {group.suggestedAction === 'merge' && (
                          <span className="text-green-600 font-medium">
                            💡 Recommended: Merge these call centers
                          </span>
                        )}
                        {group.suggestedAction === 'create_new' && (
                          <span className="text-blue-600 font-medium">
                            💡 These appear to be different call centers
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {group.suggestedAction === 'merge' && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Auto-select for merge
                              const masterId = group.matches[0].id;
                              const duplicateIds = group.matches.slice(1).map(m => m.id);
                              setSelectedDuplicates(prev => [...new Set([...prev, ...duplicateIds])]);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Merge className="w-4 h-4 mr-2" />
                            Prepare for Merge
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Select all in group for deletion
                            const allIds = group.matches.map(m => m.id);
                            setSelectedDuplicates(prev => [...new Set([...prev, ...allIds.slice(1)])]);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Mark for Deletion
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

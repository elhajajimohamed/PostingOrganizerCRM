'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CallCenter } from '@/lib/types/external-crm';
import { CallCenterDetailModal } from './call-center-detail-modal';
import { PhoneDetectionService } from '@/lib/services/phone-detection-service';
import {
  Building,
  MapPin,
  Trash2,
  Tag,
  Edit,
  Download,
  Archive,
  Copy,
  Merge,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Phone,
  Eye,
  Plus,
  Calendar
} from 'lucide-react';

interface CallCentersListProps {
  callCenters: CallCenter[];
  onEdit: (callCenter: CallCenter) => void;
  onDelete: (id: number) => void;
  onBatchDelete: (ids: number[]) => void;
  onBatchTag: (ids: number[], tag: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  totalCount?: number;
  onViewDuplicates?: () => void;
  onSearch?: (searchTerm: string) => void;
  onSearchComplete?: () => void;
}

const STATUS_COLORS = {
  'New': 'bg-blue-100 text-blue-800 border-blue-200',
  'Contacted': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Qualified': 'bg-purple-100 text-purple-800 border-purple-200',
  'Proposal': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Negotiation': 'bg-orange-100 text-orange-800 border-orange-200',
  'Closed-Won': 'bg-green-100 text-green-800 border-green-200',
  'Closed-Lost': 'bg-red-100 text-red-800 border-red-200',
  'On-Hold': 'bg-gray-100 text-gray-800 border-gray-200'
};

export function CallCentersList({
  callCenters,
  onEdit,
  onDelete,
  onBatchDelete,
  onBatchTag,
  hasMore = false,
  onLoadMore,
  totalCount = 0,
  onViewDuplicates,
  onSearch,
  onSearchComplete
}: CallCentersListProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('quick');
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    city: '',
    status: '',
    minPositions: '',
    maxPositions: '',
    tags: '',
    minValue: '',
    maxValue: '',
    dateFrom: '',
    dateTo: ''
  });
  const [sort, setSort] = useState({
    field: 'createdAt' as keyof CallCenter,
    direction: 'desc' as 'asc' | 'desc'
  });
  const [potentialDuplicates, setPotentialDuplicates] = useState<{[key: string]: CallCenter[]}>({});
  const [selectedCallCenter, setSelectedCallCenter] = useState<CallCenter | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCallLogDialog, setShowCallLogDialog] = useState(false);
  const [currentCallCenter, setCurrentCallCenter] = useState<CallCenter | null>(null);
  const [callLogData, setCallLogData] = useState({
    outcome: '',
    duration: 0,
    notes: '',
    followUp: 'none',
    steps: [] as Array<{ title: string; description: string; priority: string }>,
    stepDate: new Date().toISOString().split('T')[0],
  });
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedSearch = useCallback((searchTerm: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      if (onSearch) {
        await onSearch(searchTerm);
      }
      setIsSearching(false);
      if (onSearchComplete) {
        onSearchComplete();
      }
    }, 300); // 300ms delay
  }, [onSearch, onSearchComplete]);

  const handleCallCenterClick = (callCenter: CallCenter) => {
    setSelectedCallCenter(callCenter);
    setShowDetailModal(true);
  };

  const handleUpdateCallCenter = (updatedCallCenter: CallCenter) => {
    onEdit(updatedCallCenter);
    setShowDetailModal(false);
    setSelectedCallCenter(null);
  };

  const handleDeleteCallCenterFromModal = (id: string) => {
    onDelete(parseInt(id));
    setShowDetailModal(false);
    setSelectedCallCenter(null);
  };

  const handleOpenCallLog = (callCenter: CallCenter) => {
    setCurrentCallCenter(callCenter);
    setCallLogData({
      outcome: '',
      duration: 0,
      notes: '',
      followUp: 'none',
      steps: [],
      stepDate: new Date().toISOString().split('T')[0],
    });
    setShowCallLogDialog(true);
  };

  const handleSaveCallLog = async () => {
    if (!currentCallCenter || !callLogData.outcome || !callLogData.notes) return;

    try {
      // Save call log
      const response = await fetch('/api/external-crm/daily-calls/call-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callCenterId: currentCallCenter.id.toString(),
          callLog: {
            date: new Date().toISOString(),
            outcome: callLogData.outcome,
            duration: callLogData.duration,
            notes: callLogData.notes,
            followUp: callLogData.followUp,
          },
        }),
      });

      if (response.ok) {
        // Create steps in calendar if any were added
        if (callLogData.steps.length > 0) {
          for (const step of callLogData.steps) {
            try {
              const stepResponse = await fetch('/api/external-crm/calendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: step.title,
                  description: step.description,
                  date: callLogData.stepDate,
                  startTime: '09:00',
                  endTime: '10:00',
                  type: 'call',
                  callCenterId: currentCallCenter.id.toString(),
                  priority: step.priority || 'medium',
                  status: 'scheduled',
                  completed: false,
                  notes: `Created from call log: ${callLogData.notes}`,
                  tags: ['step', 'call-log'],
                  attendees: [],
                  reminder: {
                    enabled: true,
                    timing: [{ type: 'minutes', value: 15 }],
                    methods: ['email', 'browser'],
                    escalation: false,
                    snoozeEnabled: true,
                    snoozeDuration: 5
                  },
                  recurring: {
                    enabled: false,
                    pattern: 'weekly',
                    interval: 1,
                    daysOfWeek: [],
                    endDate: '',
                    occurrences: 0,
                    exceptions: []
                  },
                  followUpRequired: false,
                  outcome: '',
                  createdBy: 'system',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  lastModifiedBy: 'system'
                }),
              });

              if (!stepResponse.ok) {
                console.error('Failed to create calendar event for step:', step.title);
              }
            } catch (error) {
              console.error('Error creating calendar event for step:', error);
            }
          }
        }

        setShowCallLogDialog(false);
        setCurrentCallCenter(null);
      }
    } catch (error) {
      console.error('Error saving call log:', error);
    }
  };

  const handleAddStep = () => {
    setCallLogData(prev => ({
      ...prev,
      steps: [...prev.steps, { title: '', description: '', priority: 'medium' }]
    }));
  };

  const handleUpdateStep = (index: number, field: string, value: string) => {
    setCallLogData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const handleRemoveStep = (index: number) => {
    setCallLogData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const filteredCallCenters = callCenters.filter(callCenter => {
    // Enhanced global search
    const searchTerm = filters.search.toLowerCase();
    const matchesSearch = !filters.search ||
      callCenter.name.toLowerCase().includes(searchTerm) ||
      callCenter.city.toLowerCase().includes(searchTerm) ||
      callCenter.country.toLowerCase().includes(searchTerm) ||
      (callCenter.email && callCenter.email.toLowerCase().includes(searchTerm)) ||
      (callCenter.notes && typeof callCenter.notes === 'string' && callCenter.notes.toLowerCase().includes(searchTerm)) ||
      callCenter.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      callCenter.phones?.some(phone => phone.includes(searchTerm));

    const matchesCountry = !filters.country || filters.country === 'all' || callCenter.country === filters.country;
    const matchesCity = !filters.city || filters.city === 'all' || callCenter.city === filters.city;
    const matchesStatus = !filters.status || filters.status === 'all' || callCenter.status === filters.status;

    // Enhanced filters
    const matchesMinPositions = !filters.minPositions || callCenter.positions >= parseInt(filters.minPositions);
    const matchesMaxPositions = !filters.maxPositions || callCenter.positions <= parseInt(filters.maxPositions);
    const matchesMinValue = !filters.minValue || (callCenter.value || 0) >= parseInt(filters.minValue);
    const matchesMaxValue = !filters.maxValue || (callCenter.value || 0) <= parseInt(filters.maxValue);

    // Tag filtering
    const matchesTags = !filters.tags ||
      callCenter.tags?.some(tag => tag.toLowerCase().includes(filters.tags.toLowerCase()));

    // Date range filtering
    const matchesDateFrom = !filters.dateFrom ||
      new Date(callCenter.createdAt) >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo ||
      new Date(callCenter.createdAt) <= new Date(filters.dateTo);

    return matchesSearch && matchesCountry && matchesCity && matchesStatus &&
           matchesMinPositions && matchesMaxPositions && matchesMinValue &&
           matchesMaxValue && matchesTags && matchesDateFrom && matchesDateTo;
  });

  const sortedCallCenters = [...filteredCallCenters].sort((a, b) => {
    const aValue = a[sort.field];
    const bValue = b[sort.field];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sort.direction === 'asc' ? -1 : 1;
    if (bValue == null) return sort.direction === 'asc' ? 1 : -1;

    if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? sortedCallCenters.map(cc => typeof cc.id === 'string' ? parseInt(cc.id) : cc.id) : []);
  };

  const handleSelect = (id: number, checked: boolean) => {
    setSelectedIds(prev =>
      checked ? [...prev, id] : prev.filter(selectedId => selectedId !== id)
    );
  };

  const handleBatchDelete = () => {
    if (selectedIds.length > 0) {
      onBatchDelete(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBatchTag = (tag: string) => {
    if (selectedIds.length > 0 && tag) {
      onBatchTag(selectedIds, tag);
      setSelectedIds([]);
    }
  };

  const handleBulkExport = (format: 'csv' | 'json' | 'excel' | 'pdf') => {
    // Get selected call centers data
    const selectedCallCenters = callCenters.filter(cc =>
      selectedIds.includes(typeof cc.id === 'string' ? parseInt(cc.id) : cc.id)
    );

    if (selectedCallCenters.length === 0) {
      alert('No call centers selected for export');
      return;
    }

    // Export logic based on format
    switch (format) {
      case 'csv':
        exportToCSV(selectedCallCenters);
        break;
      case 'json':
        exportToJSON(selectedCallCenters);
        break;
      case 'excel':
        exportToExcel(selectedCallCenters);
        break;
      case 'pdf':
        exportToPDF(selectedCallCenters);
        break;
    }

    setSelectedIds([]);
  };

  const exportToCSV = (data: CallCenter[]) => {
    const headers = ['Name', 'Country', 'City', 'Positions', 'Status', 'Phones', 'Emails', 'Website', 'Value', 'Currency'];
    const csvContent = [
      headers.join(','),
      ...data.map(cc => [
        cc.name,
        cc.country,
        cc.city,
        cc.positions,
        cc.status,
        `"${cc.phones.join('; ')}"`,
        `"${cc.emails.join('; ')}"`,
        cc.website,
        cc.value,
        cc.currency
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'call-centers-export.csv', 'text/csv');
  };

  const exportToJSON = (data: CallCenter[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, 'call-centers-export.json', 'application/json');
  };

  const exportToExcel = (data: CallCenter[]) => {
    // For demo purposes, export as CSV with Excel-compatible format
    const headers = ['Name', 'Country', 'City', 'Positions', 'Status', 'Phones', 'Emails', 'Website', 'Value', 'Currency', 'Notes'];
    const csvContent = [
      headers.join('\t'), // Use tabs for Excel compatibility
      ...data.map(cc => [
        cc.name,
        cc.country,
        cc.city,
        cc.positions,
        cc.status,
        cc.phones.join('; '),
        cc.emails.join('; '),
        cc.website,
        cc.value,
        cc.currency,
        cc.notes
      ].join('\t'))
    ].join('\n');

    downloadFile(csvContent, 'call-centers-export.xls', 'application/vnd.ms-excel');
  };

  const exportToPDF = (data: CallCenter[]) => {
    // For demo purposes, create a simple text-based PDF
    const content = `Call Centers Export Report
Generated: ${new Date().toLocaleString()}

Total Records: ${data.length}

${data.map((cc, index) => `
${index + 1}. ${cc.name}
   Location: ${cc.city}, ${cc.country}
   Status: ${cc.status}
   Positions: ${cc.positions}
   Value: ${cc.value} ${cc.currency}
   Contact: ${cc.phones[0] || 'N/A'}
   ${cc.notes ? `Notes: ${cc.notes}` : ''}
`).join('\n')}`;

    downloadFile(content, 'call-centers-report.txt', 'text/plain');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const uniqueCountries = [...new Set(callCenters.map(cc => cc.country).filter(country => country && country.trim()))].sort();
  const uniqueCities = [...new Set(callCenters.map(cc => cc.city).filter(city => city && city.trim()))].sort();

  // Check for potential duplicates for a call center
  const checkForDuplicates = async (callCenter: CallCenter) => {
    try {
      console.log(`🔍 [CALL-CENTERS-LIST] Checking for duplicates for: ${callCenter.name}`);

      const response = await fetch(`/api/external-crm/duplicates/individual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callCenter)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.duplicates.length > 0) {
          setPotentialDuplicates(prev => ({
            ...prev,
            [callCenter.id]: data.duplicates
          }));
          console.log(`⚠️ [CALL-CENTERS-LIST] Found ${data.duplicates.length} potential duplicates for ${callCenter.name}`);
        }
      }
    } catch (error) {
      console.error(`❌ [CALL-CENTERS-LIST] Error checking duplicates for ${callCenter.name}:`, error);
    }
  };

  // Debug logging
  console.log(`🔍 CallCentersList Debug:`, {
    callCentersCount: callCenters.length,
    hasMore,
    onLoadMore: !!onLoadMore,
    totalCount,
    searchTerm: filters.search,
    isSearching
  });

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Search and Filters Header */}
      <Card className="mb-4 flex-shrink-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Advanced Search & Filters</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List View
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('card')}
              >
                Card View
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global Search */}
          <div className="relative">
            <Input
              placeholder="🔍 Global search: name, city, country, email, notes, tags, phones..."
              value={filters.search}
              onChange={(e) => {
                const newSearch = e.target.value;
                setFilters(prev => ({ ...prev, search: newSearch }));
                // Trigger debounced search in parent component
                debouncedSearch(newSearch);
              }}
              className="pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>

          {/* Primary Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={filters.country} onValueChange={(value) => setFilters(prev => ({ ...prev, country: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {uniqueCountries.map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.city} onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Contacted">Contacted</SelectItem>
                <SelectItem value="Qualified">Qualified</SelectItem>
                <SelectItem value="Proposal">Proposal</SelectItem>
                <SelectItem value="Negotiation">Negotiation</SelectItem>
                <SelectItem value="Closed-Won">Closed-Won</SelectItem>
                <SelectItem value="Closed-Lost">Closed-Lost</SelectItem>
                <SelectItem value="On-Hold">On-Hold</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by tags..."
              value={filters.tags}
              onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
            />
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Min positions"
              type="number"
              value={filters.minPositions}
              onChange={(e) => setFilters(prev => ({ ...prev, minPositions: e.target.value }))}
            />
            <Input
              placeholder="Max positions"
              type="number"
              value={filters.maxPositions}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPositions: e.target.value }))}
            />
            <Input
              placeholder="Min value ($)"
              type="number"
              value={filters.minValue}
              onChange={(e) => setFilters(prev => ({ ...prev, minValue: e.target.value }))}
            />
            <Input
              placeholder="Max value ($)"
              type="number"
              value={filters.maxValue}
              onChange={(e) => setFilters(prev => ({ ...prev, maxValue: e.target.value }))}
            />
          </div>

          {/* Date Range Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Created from date"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
            <Input
              placeholder="Created to date"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  search: '',
                  country: '',
                  city: '',
                  status: '',
                  minPositions: '',
                  maxPositions: '',
                  tags: '',
                  minValue: '',
                  maxValue: '',
                  dateFrom: '',
                  dateTo: ''
                })}
              >
                Clear All Filters
              </Button>
              <span className="text-sm text-gray-600">
                Showing {filteredCallCenters.length} of {callCenters.length} call centers
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {filteredCallCenters.length > 0 && (
                <span>
                  Results: {filteredCallCenters.length} call center{filteredCallCenters.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Bulk Actions */}
       {selectedIds.length > 0 && (
         <Card key="bulk-actions" className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {selectedIds.length} call center{selectedIds.length !== 1 ? 's' : ''} selected
                </Badge>
                <span className="text-sm text-gray-600">
                  Choose an action to apply to all selected items
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                Clear Selection
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="quick" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="quick">Quick Actions</TabsTrigger>
                <TabsTrigger value="edit">Bulk Edit</TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${selectedIds.length} call centers? This action cannot be undone.`)) {
                        handleBatchDelete();
                      }
                    }}
                    className="flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Input placeholder="Tag name" className="w-32" id="batch-tag" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const tagInput = document.getElementById('batch-tag') as HTMLInputElement;
                        if (tagInput.value) {
                          handleBatchTag(tagInput.value);
                          tagInput.value = '';
                        }
                      }}
                    >
                      <Tag className="w-4 h-4 mr-2" />
                      Add Tag
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('edit')}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Selected
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('export')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="edit" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bulk-status">Update Status</Label>
                    <Select onValueChange={(value) => {
                      if (confirm(`Update status of ${selectedIds.length} call centers to "${value}"?`)) {
                        // Handle bulk status update
                        console.log('Bulk status update:', value);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Qualified">Qualified</SelectItem>
                        <SelectItem value="Proposal">Proposal</SelectItem>
                        <SelectItem value="Negotiation">Negotiation</SelectItem>
                        <SelectItem value="Closed-Won">Closed-Won</SelectItem>
                        <SelectItem value="Closed-Lost">Closed-Lost</SelectItem>
                        <SelectItem value="On-Hold">On-Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bulk-country">Update Country</Label>
                    <Select onValueChange={(value) => {
                      if (confirm(`Update country of ${selectedIds.length} call centers to "${value}"?`)) {
                        console.log('Bulk country update:', value);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Morocco">🇲🇦 Morocco</SelectItem>
                        <SelectItem value="Tunisia">🇹🇳 Tunisia</SelectItem>
                        <SelectItem value="Senegal">🇸🇳 Senegal</SelectItem>
                        <SelectItem value="Ivory Coast">🇨🇮 Ivory Coast</SelectItem>
                        <SelectItem value="Guinea">🇬🇳 Guinea</SelectItem>
                        <SelectItem value="Cameroon">🇨🇲 Cameroon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bulk-priority">Set Priority</Label>
                    <Select onValueChange={(value) => {
                      if (confirm(`Set priority for ${selectedIds.length} call centers to "${value}"?`)) {
                        console.log('Bulk priority update:', value);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">🔴 High</SelectItem>
                        <SelectItem value="medium">🟡 Medium</SelectItem>
                        <SelectItem value="low">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setActiveTab('quick')}>
                    Back to Quick Actions
                  </Button>
                  <Button onClick={() => alert('Bulk edit applied to selected call centers')}>
                    Apply Changes
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="export" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkExport('csv')}
                    className="flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export as CSV
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkExport('json')}
                    className="flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export as JSON
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkExport('excel')}
                    className="flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export as Excel
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkExport('pdf')}
                    className="flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export as PDF Report
                  </Button>
                </div>

                <div className="text-sm text-gray-600">
                  <p>Export includes: Basic info, contact details, status, value, and interaction history</p>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Archive ${selectedIds.length} call centers?`)) {
                        console.log('Bulk archive');
                      }
                    }}
                    className="flex items-center"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Selected
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Duplicate ${selectedIds.length} call centers?`)) {
                        console.log('Bulk duplicate');
                      }
                    }}
                    className="flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Selected
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Merge ${selectedIds.length} call centers into one?`)) {
                        console.log('Bulk merge');
                      }
                    }}
                    className="flex items-center"
                  >
                    <Merge className="w-4 h-4 mr-2" />
                    Merge Selected
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Reset status of ${selectedIds.length} call centers to "New"?`)) {
                        console.log('Bulk status reset');
                      }
                    }}
                    className="flex items-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Status
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Call Centers Display */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CardTitle>Call Centers ({sortedCallCenters.length})</CardTitle>
              {filteredCallCenters.length !== callCenters.length && (
                <Badge variant="secondary">
                  Filtered: {filteredCallCenters.length} of {callCenters.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {onViewDuplicates && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewDuplicates}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Manage Duplicates
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={`${sort.field}-${sort.direction}`}
                onValueChange={(value) => {
                  const [field, direction] = value.split('-');
                  setSort({ field: field as keyof CallCenter, direction: direction as 'asc' | 'desc' });
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="country-asc">Country (A-Z)</SelectItem>
                  <SelectItem value="country-desc">Country (Z-A)</SelectItem>
                  <SelectItem value="city-asc">City (A-Z)</SelectItem>
                  <SelectItem value="city-desc">City (Z-A)</SelectItem>
                  <SelectItem value="positions-asc">Positions (Low-High)</SelectItem>
                  <SelectItem value="positions-desc">Positions (High-Low)</SelectItem>
                  <SelectItem value="value-desc">Value (High-Low)</SelectItem>
                  <SelectItem value="value-asc">Value (Low-High)</SelectItem>
                  <SelectItem value="createdAt-desc">Newest First</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <div className="h-full overflow-y-auto p-6" style={{ height: '100%', minHeight: '400px' }}>
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Searching call centers...</p>
              </div>
            </div>
          ) : sortedCallCenters.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Building className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No call centers found</h3>
              <p className="text-gray-500 mb-4">
                {callCenters.length === 0
                  ? "Get started by adding your first call center or importing data."
                  : "Try adjusting your search criteria or filters."
                }
              </p>
              {Object.keys(filters).some(key => filters[key as keyof typeof filters]) && (
                <Button
                  variant="outline"
                  onClick={() => setFilters({
                    search: '',
                    country: '',
                    city: '',
                    status: '',
                    minPositions: '',
                    maxPositions: '',
                    tags: '',
                    minValue: '',
                    maxValue: '',
                    dateFrom: '',
                    dateTo: ''
                  })}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Header with select all */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg mb-4">
                <Checkbox
                  checked={selectedIds.length === sortedCallCenters.length && sortedCallCenters.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="font-medium">Select All Visible</span>
                <span className="text-sm text-gray-600">
                  ({selectedIds.length} selected)
                </span>
              </div>

              {/* Call Center Items */}
              {viewMode === 'list' ? (
                <div className="space-y-3">
                   {sortedCallCenters.map((callCenter, index) => (
                     <div key={`${callCenter.id}-${index}`} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <Checkbox
                        checked={selectedIds.includes(typeof callCenter.id === 'string' ? parseInt(callCenter.id) : callCenter.id)}
                        onCheckedChange={(checked: boolean) => handleSelect(typeof callCenter.id === 'string' ? parseInt(callCenter.id) : callCenter.id, checked)}
                      />

                      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <button
                              className="font-semibold text-lg text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              onClick={() => handleCallCenterClick(callCenter)}
                            >
                              {callCenter.name}
                            </button>
                            {potentialDuplicates[callCenter.id] && potentialDuplicates[callCenter.id].length > 0 && (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                  {potentialDuplicates[callCenter.id].length} duplicate{potentialDuplicates[callCenter.id].length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <MapPin className="w-4 h-4 mr-1" />
                            {callCenter.city}, {callCenter.country}
                          </p>
                          {callCenter.tags && callCenter.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {callCenter.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {callCenter.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{callCenter.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-4 min-w-0">
                          <div className="text-center flex flex-col items-center justify-center min-h-[60px]">
                            <Badge className={`${STATUS_COLORS[callCenter.status as keyof typeof STATUS_COLORS]} mb-1`}>
                              {callCenter.status}
                            </Badge>
                            <p className="text-sm text-gray-600">
                              {callCenter.positions} positions
                            </p>
                            {callCenter.value && (
                              <p className="text-sm font-medium text-green-600">
                                ${callCenter.value.toLocaleString()} {callCenter.currency}
                              </p>
                            )}
                          </div>

                          <div className="text-center">
                            {callCenter.phones.length > 0 && (
                              <p className="text-sm font-medium">{callCenter.phones[0]}</p>
                            )}
                            {callCenter.email && (
                              <p className="text-sm text-gray-600 truncate">{callCenter.email}</p>
                            )}
                            {callCenter.website && (
                              <p className="text-sm text-blue-600 truncate">{callCenter.website}</p>
                            )}
                          </div>

                          <div className="text-center">
                            {callCenter.email && (
                              <p className="text-sm text-gray-600 truncate">{callCenter.email}</p>
                            )}
                            {callCenter.website && (
                              <p className="text-sm text-blue-600 truncate">{callCenter.website}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 justify-center">
                            {callCenter.phones.length > 0 && callCenter.phone_infos && callCenter.phone_infos[0] && callCenter.phone_infos[0].is_mobile && callCenter.phone_infos[0].whatsapp_confidence >= 0.7 ? (
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 text-xs px-2 py-1"
                              >
                                <a
                                  href={PhoneDetectionService.getWhatsAppLink(callCenter.phones[0])}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Phone className="w-3 h-3 mr-1" />
                                  WhatsApp
                                </a>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="text-gray-400 border-gray-300 text-xs px-2 py-1"
                              >
                                <Phone className="w-3 h-3 mr-1" />
                                WhatsApp
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleOpenCallLog(callCenter)} className="text-xs px-2 py-1">
                              <Phone className="w-3 h-3 mr-1" />
                              Log Call
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => onEdit(callCenter)} className="text-xs px-2 py-1">
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => onDelete(typeof callCenter.id === 'string' ? parseInt(callCenter.id) : callCenter.id)} className="text-xs px-2 py-1">
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Card View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {sortedCallCenters.map((callCenter, index) => (
                     <Card key={`${callCenter.id}-${index}`} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <button
                                className="text-lg line-clamp-1 text-left text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                onClick={() => handleCallCenterClick(callCenter)}
                              >
                                {callCenter.name}
                              </button>
                              {potentialDuplicates[callCenter.id] && potentialDuplicates[callCenter.id].length > 0 && (
                                <div className="flex items-center gap-1">
                                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                    {potentialDuplicates[callCenter.id].length}
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <MapPin className="w-4 h-4 mr-1" />
                              {callCenter.city}, {callCenter.country}
                            </p>
                          </div>
                          <Checkbox
                            checked={selectedIds.includes(typeof callCenter.id === 'string' ? parseInt(callCenter.id) : callCenter.id)}
                            onCheckedChange={(checked: boolean) => handleSelect(typeof callCenter.id === 'string' ? parseInt(callCenter.id) : callCenter.id, checked)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className={STATUS_COLORS[callCenter.status as keyof typeof STATUS_COLORS]}>
                            {callCenter.status}
                          </Badge>
                          <span className="text-sm font-medium">{callCenter.positions} positions</span>
                        </div>

                        {callCenter.value && (
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <span className="text-sm text-green-700">Value:</span>
                            <span className="font-semibold text-green-800">
                              ${callCenter.value.toLocaleString()} {callCenter.currency}
                            </span>
                          </div>
                        )}

                        <div className="space-y-1">
                          {callCenter.phones.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <p className="text-sm">
                                <span className="font-medium">📞</span> {callCenter.phones[0]}
                              </p>
                              {callCenter.phone_infos && callCenter.phone_infos[0] && callCenter.phone_infos[0].is_mobile && callCenter.phone_infos[0].whatsapp_confidence >= 0.7 && (
                                <a
                                  href={PhoneDetectionService.getWhatsAppLink(callCenter.phones[0])}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                                >
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          )}
                          {callCenter.email && (
                            <p className="text-sm">
                              <span className="font-medium">✉️</span> {callCenter.email}
                            </p>
                          )}
                          {callCenter.website && (
                            <p className="text-sm">
                              <span className="font-medium">🌐</span> {callCenter.website}
                            </p>
                          )}
                        </div>

                        {callCenter.tags && callCenter.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {callCenter.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {callCenter.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{callCenter.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex space-x-2 pt-2">
                          {callCenter.phones.length > 0 && callCenter.phone_infos && callCenter.phone_infos[0] && callCenter.phone_infos[0].is_mobile && callCenter.phone_infos[0].whatsapp_confidence >= 0.7 && (
                            <a
                              href={PhoneDetectionService.getWhatsAppLink(callCenter.phones[0])}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                            >
                              WhatsApp
                            </a>
                          )}
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenCallLog(callCenter)}>
                            <Phone className="w-3 h-3 mr-1" />
                            Log Call
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(callCenter)}>
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" className="flex-1" onClick={() => onDelete(typeof callCenter.id === 'string' ? parseInt(callCenter.id) : callCenter.id)}>
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Load More Button */}
          {hasMore && onLoadMore && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={onLoadMore}
                disabled={isSearching}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    Load More Call Centers ({callCenters.length} of {totalCount})
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Show message when all records are loaded */}
          {!hasMore && totalCount > 20 && (
            <div className="text-center mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-green-800 font-medium">
                ✅ All {totalCount} call centers are loaded!
              </p>
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Call Center Detail Modal */}
      <CallCenterDetailModal
        callCenter={selectedCallCenter}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCallCenter(null);
        }}
        onUpdate={handleUpdateCallCenter}
        onDelete={handleDeleteCallCenterFromModal}
      />

      {/* Call Log Dialog */}
      <Dialog open={showCallLogDialog} onOpenChange={setShowCallLogDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Log Call - {currentCallCenter?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Call Outcome */}
            <div>
              <Label htmlFor="outcome">Call Outcome *</Label>
              <Select value={callLogData.outcome} onValueChange={(value) =>
                setCallLogData(prev => ({ ...prev, outcome: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="no-answer">No Answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="wrong-number">Wrong Number</SelectItem>
                  <SelectItem value="callback-requested">Callback Requested</SelectItem>
                  <SelectItem value="answering-machine">Answering Machine</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <input
                type="number"
                id="duration"
                value={callLogData.duration}
                onChange={(e) =>
                  setCallLogData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
                placeholder="0"
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes *</Label>
              <Textarea
                id="notes"
                value={callLogData.notes}
                onChange={(e) =>
                  setCallLogData(prev => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Enter detailed call notes..."
                rows={4}
              />
            </div>

            {/* Follow Up */}
            <div>
              <Label htmlFor="followUp">Follow Up Required</Label>
              <Select value={callLogData.followUp} onValueChange={(value) =>
                setCallLogData(prev => ({ ...prev, followUp: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select follow up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No follow up needed</SelectItem>
                  <SelectItem value="callback">Schedule callback</SelectItem>
                  <SelectItem value="email">Send email</SelectItem>
                  <SelectItem value="meeting">Schedule meeting</SelectItem>
                  <SelectItem value="send-materials">Send materials</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Steps Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-medium">Steps to Add to Calendar</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddStep}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>

              {/* Step Date */}
              <div className="mb-4">
                <Label htmlFor="stepDate">Step Date</Label>
                <input
                  type="date"
                  id="stepDate"
                  value={callLogData.stepDate}
                  onChange={(e) =>
                    setCallLogData(prev => ({ ...prev, stepDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  title="Select date for calendar steps"
                />
              </div>

              {/* Steps List */}
              <div className="space-y-3">
                {callLogData.steps.map((step, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium">Step {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStep(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`step-title-${index}`}>Title *</Label>
                        <input
                          type="text"
                          id={`step-title-${index}`}
                          value={step.title}
                          onChange={(e) => handleUpdateStep(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Step title"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`step-priority-${index}`}>Priority</Label>
                        <Select
                          value={step.priority}
                          onValueChange={(value) => handleUpdateStep(index, 'priority', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Label htmlFor={`step-description-${index}`}>Description</Label>
                      <Textarea
                        id={`step-description-${index}`}
                        value={step.description}
                        onChange={(e) => handleUpdateStep(index, 'description', e.target.value)}
                        placeholder="Step description..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))}

                {callLogData.steps.length === 0 && (
                  <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No steps added yet</p>
                    <p className="text-sm">Steps will be added to your calendar</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCallLogDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCallLog}
                disabled={!callLogData.outcome || !callLogData.notes}
              >
                Save Call Log & Add Steps
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
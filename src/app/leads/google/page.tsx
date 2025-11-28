'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search, MapPin, Phone, Globe, Star, Plus, CheckCircle, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { DuplicateDetectionService } from '@/lib/services/duplicate-detection-service';

interface GoogleLead {
  name: string;
  address: string;
  phone: string;
  website: string;
  mapsUrl: string;
  rating: number;
  reviewCount: number;
  placeId: string;
  country: string;
  city: string;
  estimatedPositions: number;
  confidenceScore?: number;
  existsInCRM?: boolean;
  isNew?: boolean;
  isInCRM?: boolean; // For backward compatibility
}

export default function GoogleLeadFinder() {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<GoogleLead[]>([]);
  const [summary, setSummary] = useState<{ total: number; new: number; existing: number } | null>(null);
  const [runningDuplicateCheck, setRunningDuplicateCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'not-added'>('all');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [progressDialog, setProgressDialog] = useState<{
    isOpen: boolean;
    currentStep: string;
    progress: number;
    totalSteps: number;
    currentBatch: number;
    totalBatches: number;
    currentVariation: string;
    resultsFound: number;
  }>({
    isOpen: false,
    currentStep: '',
    progress: 0,
    totalSteps: 37, // Total search variations
    currentBatch: 0,
    totalBatches: 8, // 8 batches of 5-2 variations
    currentVariation: '',
    resultsFound: 0
  });

  // Check if toast is available
  useEffect(() => {
    // Ensure toast is loaded
    if (typeof window !== 'undefined') {
      console.log('Google Lead Finder page loaded');
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !city.trim()) {
      toast.error('Please enter both keyword and city');
      return;
    }

    setLoading(true);
    setProgressDialog({
      isOpen: true,
      currentStep: 'Initializing search...',
      progress: 0,
      totalSteps: 37,
      currentBatch: 0,
      totalBatches: 8,
      currentVariation: '',
      resultsFound: 0
    });

    try {
      const response = await fetch('/api/googleLeads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: keyword.trim(), city: city.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leads');
      }

      setProgressDialog(prev => ({ ...prev, currentStep: 'Analyzing CRM status...', progress: 80 }));

      // Results now come with CRM status from the API
      const leadsWithCRMStatus = (data.results || []).map((lead: GoogleLead) => ({
        ...lead,
        isInCRM: lead.existsInCRM || false,
        existsInCRM: lead.existsInCRM || false,
        isNew: lead.isNew || false
      }));

      setProgressDialog(prev => ({ ...prev, currentStep: 'Finalizing results...', progress: 95 }));

      setResults(leadsWithCRMStatus);
      setSummary(data.summary || null);
      setProgressDialog(prev => ({ ...prev, currentStep: 'Complete!', progress: 100, resultsFound: leadsWithCRMStatus.length }));

      // Close dialog after a short delay
      setTimeout(() => {
        setProgressDialog(prev => ({ ...prev, isOpen: false }));
        toast.success(`Found ${leadsWithCRMStatus.length} leads`);
      }, 1500);

    } catch (error) {
      console.error('Search error:', error);
      setProgressDialog(prev => ({ ...prev, isOpen: false }));
      toast.error(error instanceof Error ? error.message : 'Failed to search leads');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCRM = async (lead: GoogleLead) => {
    setSaving(lead.placeId);
    try {
      const leadData = {
        ...lead,
        source: 'Google',
        createdAt: new Date().toISOString(),
      };

      // Add to Firestore
      const response = await fetch('/api/googleLeads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message === 'Lead already exists in CRM') {
          toast.info(`${lead.name} is already in CRM`);
          // Update the lead status in the results
          setResults(prev => prev.map(l =>
            l.placeId === lead.placeId ? { ...l, isInCRM: true } : l
          ));
          return;
        }
        throw new Error(data.error || 'Failed to save lead');
      }

      toast.success(`${lead.name} added to CRM`);
      // Update the lead status in the results
      setResults(prev => prev.map(l =>
        l.placeId === lead.placeId ? { ...l, isInCRM: true } : l
      ));
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add lead to CRM');
    } finally {
      setSaving(null);
    }
  };

  const handleBulkAddToCRM = async () => {
    const leadsToAdd = filteredResults.filter(lead => selectedLeads.has(lead.placeId) && !lead.isInCRM);
    if (leadsToAdd.length === 0) {
      toast.info('No new leads selected to add');
      return;
    }

    setBulkSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const lead of leadsToAdd) {
        try {
          const leadData = {
            ...lead,
            source: 'Google',
            createdAt: new Date().toISOString(),
          };

          const response = await fetch('/api/googleLeads', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(leadData),
          });

          const data = await response.json();

          if (response.ok) {
            successCount++;
            // Update the lead status in the results
            setResults(prev => prev.map(l =>
              l.placeId === lead.placeId ? { ...l, isInCRM: true } : l
            ));
          } else if (data.message === 'Lead already exists in CRM') {
            // Already exists, mark as added
            setResults(prev => prev.map(l =>
              l.placeId === lead.placeId ? { ...l, isInCRM: true } : l
            ));
          } else {
            errorCount++;
            console.error(`Failed to add ${lead.name}:`, data.error);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error adding ${lead.name}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully added ${successCount} leads to CRM`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} leads failed to add`);
      }

      // Clear selection after bulk add
      setSelectedLeads(new Set());
    } catch (error) {
      console.error('Bulk save error:', error);
      toast.error('Failed to perform bulk add operation');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleClearList = () => {
    if (confirm('Are you sure you want to clear all search results?')) {
      setResults([]);
      setSelectedLeads(new Set());
      setSummary(null);
      toast.info('Search results cleared');
    }
  };

  const handleSelectOnlyNew = () => {
    const newLeadIds = new Set(results.filter(lead => lead.isNew).map(lead => lead.placeId));
    setSelectedLeads(newLeadIds);
    toast.success(`Selected ${newLeadIds.size} new leads`);
  };

  const handleRunDuplicateCheck = async () => {
    if (results.length === 0) {
      toast.error('No leads to check for duplicates');
      return;
    }

    setRunningDuplicateCheck(true);
    try {
      // Use the same approach as the working duplicates section
      const checkResponse = await fetch('/api/external-crm/duplicates', {
        method: 'GET',
      });

      if (!checkResponse.ok) {
        throw new Error('Failed to get CRM data for duplicate check');
      }

      const crmData = await checkResponse.json();

      // Get all existing call centers from the CRM
      const crmResponse = await fetch('/api/external-crm?page=1&limit=10000', {
        method: 'GET',
      });

      if (!crmResponse.ok) {
        throw new Error('Failed to get CRM call centers');
      }

      const crmResult = await crmResponse.json();
      const existingCallCenters = crmResult.callCenters || [];

      console.log(`🔍 Checking ${results.length} leads against ${existingCallCenters.length} existing CRM entries`);

      // Check each lead against all existing centers using in-memory comparison
    const updatedResults = results.map((lead) => {
      // Check for exact placeId match first (most reliable)
      const exactPlaceIdMatch = existingCallCenters.find((cc: any) => cc.placeId === lead.placeId);
      if (exactPlaceIdMatch) {
        console.log(`Found exact placeId match for ${lead.name}`);
        return { ...lead, existsInCRM: true, isNew: false };
      }

      // Check for exact name match
      const exactNameMatch = existingCallCenters.find((cc: any) =>
        cc.name?.toLowerCase().trim() === lead.name?.toLowerCase().trim()
      );
      if (exactNameMatch) {
        console.log(`Found exact name match for ${lead.name}`);
        return { ...lead, existsInCRM: true, isNew: false };
      }

      // Use similarity-based duplicate detection (same logic as working system)
      const duplicates = existingCallCenters.filter((cc: any) => {
        // Same country check
        if (cc.country !== lead.country) return false;

        // Calculate name similarity
        const nameSimilarity = DuplicateDetectionService.calculateSimilarity(
          lead.name || '',
          cc.name || ''
        );

        // Check for high similarity matches (90%+)
        if (nameSimilarity >= 90) return true;

        // Check for medium similarity with city boost (70%+ name + 80%+ city)
        if (nameSimilarity >= 70) {
          const citySimilarity = DuplicateDetectionService.calculateSimilarity(
            lead.city || '',
            cc.city || ''
          );
          if (citySimilarity >= 80) return true;
        }

        return false;
      });

      const hasDuplicates = duplicates.length > 0;
      if (hasDuplicates) {
        console.log(`Found similarity match for ${lead.name} (${duplicates.length} matches)`);
      }
      return { ...lead, existsInCRM: hasDuplicates, isNew: !hasDuplicates };
    });

      setResults(updatedResults);

      // Update summary
      const newCount = updatedResults.filter(lead => lead.isNew).length;
      const existingCount = updatedResults.filter(lead => lead.existsInCRM).length;
      setSummary({
        total: updatedResults.length,
        new: newCount,
        existing: existingCount
      });

      toast.success(`Duplicate check complete! Found ${newCount} new leads and ${existingCount} existing.`);
    } catch (error) {
      console.error('Duplicate check error:', error);
      toast.error('Failed to run duplicate check');
    } finally {
      setRunningDuplicateCheck(false);
    }
  };

  const handleSelectLead = (placeId: string, selected: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (selected) {
      newSelected.add(placeId);
    } else {
      newSelected.delete(placeId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = new Set(filteredResults.map(lead => lead.placeId));
      setSelectedLeads(allIds);
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleExport = (format: 'csv' | 'json' | 'pdf') => {
    const dataToExport = filteredResults;

    if (dataToExport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      // CSV Export
      const headers = ['Name', 'Address', 'Phone', 'Website', 'City', 'Country', 'Positions', 'Rating', 'Reviews', 'Status'];
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(lead => [
          `"${lead.name.replace(/"/g, '""')}"`,
          `"${lead.address.replace(/"/g, '""')}"`,
          `"${lead.phone}"`,
          `"${lead.website}"`,
          `"${lead.city}"`,
          `"${lead.country}"`,
          lead.estimatedPositions,
          lead.rating,
          lead.reviewCount,
          lead.isNew ? 'New' : 'Existing'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `google-leads-${timestamp}.csv`;
      link.click();

    } else if (format === 'json') {
      // JSON Export
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `google-leads-${timestamp}.json`;
      link.click();

    } else if (format === 'pdf') {
      // PDF Export (simple HTML to PDF)
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const htmlContent = `
          <html>
            <head>
              <title>Google Leads Export - ${timestamp}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .new-lead { background-color: #e8f5e8; }
                .existing-lead { background-color: #ffe8e8; }
              </style>
            </head>
            <body>
              <h1>Google Leads Export</h1>
              <p>Generated on: ${new Date().toLocaleString()}</p>
              <p>Total leads: ${dataToExport.length}</p>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Phone</th>
                    <th>Website</th>
                    <th>City</th>
                    <th>Country</th>
                    <th>Positions</th>
                    <th>Rating</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${dataToExport.map(lead => `
                    <tr class="${lead.isNew ? 'new-lead' : 'existing-lead'}">
                      <td>${lead.name}</td>
                      <td>${lead.address}</td>
                      <td>${lead.phone}</td>
                      <td>${lead.website}</td>
                      <td>${lead.city}</td>
                      <td>${lead.country}</td>
                      <td>${lead.estimatedPositions}</td>
                      <td>${lead.rating}/5 (${lead.reviewCount} reviews)</td>
                      <td>${lead.isNew ? 'New Lead' : 'Already in CRM'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </body>
          </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
    }

    toast.success(`Exported ${dataToExport.length} leads as ${format.toUpperCase()}`);
  };

  const filteredResults = results.filter(lead => {
    if (filterMode === 'not-added') {
      return !lead.isInCRM;
    }
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Search className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Google Lead Finder</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search for Business Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter keyword (e.g., call center, restaurant)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Enter city (e.g., Rabat, Casablanca)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={loading} className="px-6">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </form>

          {/* Inline Progress Bar - Only show when searching */}
          {progressDialog.isOpen && (
            <div className="mt-6 space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Generating Leads...</h3>
                <span className="text-sm text-gray-600">{progressDialog.progress}% Complete</span>
              </div>

              {/* Progress Bar */}
              <Progress value={progressDialog.progress} className="h-3" />

              {/* Current Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Current Step:</span>
                  <span className="text-sm text-gray-600">{progressDialog.currentStep}</span>
                </div>

                {progressDialog.currentVariation && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Searching:</span>
                    <span className="text-sm text-blue-600 font-mono">"{progressDialog.currentVariation}"</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{progressDialog.currentBatch}</div>
                    <div className="text-xs text-gray-600">Batch</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{progressDialog.resultsFound}</div>
                    <div className="text-xs text-gray-600">Leads Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{progressDialog.totalSteps}</div>
                    <div className="text-xs text-gray-600">Variations</div>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Technical Details:</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-medium text-blue-800">Search Strategy:</span>
                    <p className="text-blue-700 mt-1">37 keyword variations across 8 batches</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">API Calls:</span>
                    <p className="text-blue-700 mt-1">Up to 111 Google Places requests</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Deduplication:</span>
                    <p className="text-blue-700 mt-1">Smart filtering removes duplicates</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Rate Limiting:</span>
                    <p className="text-blue-700 mt-1">3-second delays between batches</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Search Results ({results.length} total, {filteredResults.length} shown)</CardTitle>
              <div className="flex items-center gap-2">
                {/* Filter Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Filter:</span>
                  <Button
                    variant={filterMode === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterMode('all')}
                  >
                    All ({results.length})
                  </Button>
                  <Button
                    variant={filterMode === 'not-added' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterMode('not-added')}
                  >
                    Not Added ({results.filter(r => !r.isInCRM).length})
                  </Button>
                </div>

                {/* Select Only New Button */}
                {summary && summary.new > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectOnlyNew}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Select Only New ({summary.new})
                  </Button>
                )}

                {/* Auto-Select New Leads Button */}
                {summary && summary.new > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      const newLeadIds = new Set(results.filter(lead => lead.isNew).map(lead => lead.placeId));
                      setSelectedLeads(newLeadIds);
                      toast.success(`Auto-selected ${newLeadIds.size} new leads for bulk import`);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Auto-Select New Leads ({summary.new})
                  </Button>
                )}

                {/* Export Buttons */}
                {results.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('csv')}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('json')}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport('pdf')}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                )}

                {/* Run Duplicate Check Button */}
                {results.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunDuplicateCheck}
                    disabled={runningDuplicateCheck}
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    {runningDuplicateCheck ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Run Duplicate Check
                      </>
                    )}
                  </Button>
                )}

                {/* Clear List Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearList}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear List
                </Button>
              </div>
            </div>

            {/* Summary Statistics */}
            {summary && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">CRM Analysis Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                    <div className="text-xs text-blue-700">Total Leads</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{summary.new}</div>
                    <div className="text-xs text-green-700">New Leads</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{summary.existing}</div>
                    <div className="text-xs text-orange-700">Already in CRM</div>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {/* Bulk Actions */}
            {selectedLeads.size > 0 && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-900">
                      {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
                    </span>
                    <span className="text-sm text-blue-700">
                      ({Array.from(selectedLeads).filter(id => {
                        const lead = results.find(r => r.placeId === id);
                        return lead && !lead.isInCRM;
                      }).length} not in CRM)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLeads(new Set())}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      onClick={handleBulkAddToCRM}
                      disabled={bulkSaving}
                      size="sm"
                    >
                      {bulkSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Bulk Add to CRM
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
              <Checkbox
                checked={selectedLeads.size === filteredResults.length && filteredResults.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                Select All {filterMode === 'not-added' ? 'Not Added' : 'Visible'} ({filteredResults.length})
              </span>
            </div>

            <div className="space-y-4">
              {filteredResults.map((lead) => (
                <div
                  key={lead.placeId}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={selectedLeads.has(lead.placeId)}
                        onCheckedChange={(checked) => handleSelectLead(lead.placeId, checked as boolean)}
                      />
                      {lead.existsInCRM ? (
                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Already in CRM
                        </Badge>
                      ) : lead.isNew ? (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          New Lead
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{lead.address}</span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>📍 {lead.city}, {lead.country}</span>
                        <span>👥 Est. {lead.estimatedPositions} positions</span>
                      </div>

                      {lead.phone && lead.phone !== 'Not available' && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{lead.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Globe className="w-4 h-4" />
                        {lead.website && lead.website !== 'Not available' ? (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {lead.website}
                          </a>
                        ) : (
                          <span>Not available</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        {lead.rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-gray-600">
                              {lead.rating} ({lead.reviewCount} reviews)
                            </span>
                          </div>
                        )}

                        {lead.confidenceScore && (
                          <div className="flex items-center gap-1">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              lead.confidenceScore >= 80 ? 'bg-green-100 text-green-800' :
                              lead.confidenceScore >= 60 ? 'bg-blue-100 text-blue-800' :
                              lead.confidenceScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {lead.confidenceScore}% confidence
                            </div>
                          </div>
                        )}

                        <a
                          href={lead.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View on Google Maps
                        </a>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAddToCRM(lead)}
                      disabled={saving === lead.placeId || lead.isInCRM}
                      size="sm"
                      className="ml-4"
                      variant={lead.isInCRM ? "secondary" : "default"}
                    >
                      {saving === lead.placeId ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : lead.isInCRM ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Added to CRM
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add to CRM
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length === 0 && !loading && keyword && city && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No results found for "{keyword}" in {city}</p>
              <p className="text-sm mt-2">Try different keywords or check your spelling</p>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

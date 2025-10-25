'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search, MapPin, Phone, Globe, Star, Plus, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
  isInCRM?: boolean;
}

export default function GoogleLeadFinder() {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<GoogleLead[]>([]);
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

      setProgressDialog(prev => ({ ...prev, currentStep: 'Checking CRM status...', progress: 80 }));

      // Check which leads are already in CRM
      const leadsWithCRMStatus = await Promise.all(
        (data.results || []).map(async (lead: GoogleLead, index: number) => {
          try {
            setProgressDialog(prev => ({
              ...prev,
              currentStep: `Checking CRM status for ${lead.name}...`,
              progress: 80 + Math.floor((index / (data.results?.length || 1)) * 15)
            }));

            const checkResponse = await fetch('/api/googleLeads', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ...lead, checkOnly: true }),
            });
            const checkData = await checkResponse.json();
            return { ...lead, isInCRM: checkData.exists || false };
          } catch (error) {
            console.error('Error checking CRM status:', error);
            return { ...lead, isInCRM: false };
          }
        })
      );

      setProgressDialog(prev => ({ ...prev, currentStep: 'Finalizing results...', progress: 95 }));

      setResults(leadsWithCRMStatus);
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
      toast.info('Search results cleared');
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
                      {lead.isInCRM && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          In CRM
                        </Badge>
                      )}
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
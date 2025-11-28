'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search, MapPin, Briefcase, Users, Globe, Star, Plus, CheckCircle, Trash2, UserCheck, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface LinkedInLead {
  name: string;
  title: string;
  company: string;
  location: string;
  skills: string[];
  openToWork: boolean;
  profileUrl: string;
  source: string;
  isInCRM?: boolean;
}

export default function LinkedInLeadFinder() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<LinkedInLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<'all' | 'not-added'>('all');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [progressDialog, setProgressDialog] = useState<{
    isOpen: boolean;
    currentStep: string;
    progress: number;
  }>({
    isOpen: false,
    currentStep: '',
    progress: 0
  });

  // Check if toast is available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('LinkedIn Lead Finder page loaded');
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      toast.error('Please enter keywords');
      return;
    }

    setLoading(true);
    setProgressDialog({
      isOpen: true,
      currentStep: 'Searching LinkedIn profiles...',
      progress: 0
    });

    try {
      const response = await fetch('/api/linkedinFinder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords: keyword.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leads');
      }

      setProgressDialog(prev => ({ ...prev, currentStep: 'Checking CRM status...', progress: 80 }));

      // Check which leads are already in CRM
      const leadsWithCRMStatus = await Promise.all(
        (data.results || []).map(async (lead: LinkedInLead, index: number) => {
          try {
            setProgressDialog(prev => ({
              ...prev,
              currentStep: `Checking CRM status for ${lead.name}...`,
              progress: 80 + Math.floor((index / (data.results?.length || 1)) * 15)
            }));

            const checkResponse = await fetch('/api/linkedinFinder', {
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
      setProgressDialog(prev => ({ ...prev, currentStep: 'Complete!', progress: 100 }));

      // Close dialog after a short delay
      setTimeout(() => {
        setProgressDialog(prev => ({ ...prev, isOpen: false }));
        toast.success(`Found ${leadsWithCRMStatus.length} LinkedIn profiles`);
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

  const handleAddToCRM = async (lead: LinkedInLead) => {
    setSaving(lead.name);
    try {
      const leadData = {
        ...lead,
        source: 'LinkedIn',
        createdAt: new Date().toISOString(),
      };

      // Add to Firestore
      const response = await fetch('/api/linkedinFinder', {
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
            l.name === lead.name ? { ...l, isInCRM: true } : l
          ));
          return;
        }
        throw new Error(data.error || 'Failed to save lead');
      }

      toast.success(`${lead.name} added to CRM`);
      // Update the lead status in the results
      setResults(prev => prev.map(l =>
        l.name === lead.name ? { ...l, isInCRM: true } : l
      ));
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add lead to CRM');
    } finally {
      setSaving(null);
    }
  };

  const handleBulkAddToCRM = async () => {
    const leadsToAdd = filteredResults.filter(lead => selectedLeads.has(lead.name) && !lead.isInCRM);
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
            source: 'LinkedIn',
            createdAt: new Date().toISOString(),
          };

          const response = await fetch('/api/linkedinFinder', {
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
              l.name === lead.name ? { ...l, isInCRM: true } : l
            ));
          } else if (data.message === 'Lead already exists in CRM') {
            // Already exists, mark as added
            setResults(prev => prev.map(l =>
              l.name === lead.name ? { ...l, isInCRM: true } : l
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

  const handleSelectLead = (name: string, selected: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (selected) {
      newSelected.add(name);
    } else {
      newSelected.delete(name);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = new Set(filteredResults.map(lead => lead.name));
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
        <h1 className="text-2xl font-bold text-gray-900">LinkedIn Lead Finder</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search for Professional Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter keywords (e.g., call center manager Rabat)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
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

          {/* Progress Dialog */}
          {progressDialog.isOpen && (
            <div className="mt-6 space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Searching LinkedIn...</h3>
                <span className="text-sm text-gray-600">{progressDialog.progress}% Complete</span>
              </div>

              <Progress value={progressDialog.progress} className="h-3" />

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <span className="text-sm text-gray-600">{progressDialog.currentStep}</span>
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
                      ({Array.from(selectedLeads).filter(name => {
                        const lead = results.find(r => r.name === name);
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
                  key={lead.name}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={selectedLeads.has(lead.name)}
                        onCheckedChange={(checked) => handleSelectLead(lead.name, checked as boolean)}
                      />
                      {lead.isInCRM && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          In CRM
                        </Badge>
                      )}
                      {lead.openToWork && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Open to Work
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="w-4 h-4" />
                        <span>{lead.title}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 className="w-4 h-4" />
                        <span>{lead.company}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{lead.location}</span>
                      </div>

                      {lead.skills && lead.skills.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <div className="flex flex-wrap gap-1">
                            {lead.skills.slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {lead.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{lead.skills.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Globe className="w-4 h-4" />
                        <a
                          href={lead.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          View LinkedIn Profile
                        </a>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAddToCRM(lead)}
                      disabled={saving === lead.name || lead.isInCRM}
                      size="sm"
                      className="ml-4"
                      variant={lead.isInCRM ? "secondary" : "default"}
                    >
                      {saving === lead.name ? (
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

      {results.length === 0 && !loading && keyword && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No results found for "{keyword}"</p>
              <p className="text-sm mt-2">Try different keywords or check your spelling</p>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

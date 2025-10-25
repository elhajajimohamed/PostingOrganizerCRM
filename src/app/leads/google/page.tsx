'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, MapPin, Phone, Globe, Star, Plus } from 'lucide-react';
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
}

export default function GoogleLeadFinder() {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<GoogleLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

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

      setResults(data.results || []);
      toast.success(`Found ${data.results?.length || 0} leads`);
    } catch (error) {
      console.error('Search error:', error);
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

      if (!response.ok) {
        throw new Error('Failed to save lead');
      }

      toast.success(`${lead.name} added to CRM`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to add lead to CRM');
    } finally {
      setSaving(null);
    }
  };

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
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((lead) => (
                <div
                  key={lead.placeId}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
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
                      disabled={saving === lead.placeId}
                      size="sm"
                      className="ml-4"
                    >
                      {saving === lead.placeId ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
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
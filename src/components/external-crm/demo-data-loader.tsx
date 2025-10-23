'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEMO_CALL_CENTERS, DEMO_SUGGESTIONS } from '@/lib/demo-data';

interface DemoDataLoaderProps {
  onDataLoaded?: () => void;
}

export function DemoDataLoader({ onDataLoaded }: DemoDataLoaderProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  const loadDemoData = async (type: 'call-centers' | 'suggestions' | 'all') => {
    setLoading(type);
    try {
      const response = await fetch('/api/demo-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();
      setResults(data);

      if (data.success && onDataLoaded) {
        onDataLoaded();
      }
    } catch (error) {
      console.error('Error loading demo data:', error);
      setResults({ success: false, error: 'Failed to load demo data' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo Data Loader</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <h3 className="font-semibold mb-2">Call Centers</h3>
            <Badge variant="outline" className="mb-2">
              {DEMO_CALL_CENTERS.length} items
            </Badge>
            <p className="text-sm text-gray-600 mb-4">
              Sample call centers across all 6 countries with different statuses
            </p>
            <Button
              onClick={() => loadDemoData('call-centers')}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'call-centers' ? 'Loading...' : 'Load Call Centers'}
            </Button>
          </div>

          <div className="text-center">
            <h3 className="font-semibold mb-2">Suggestions</h3>
            <Badge variant="outline" className="mb-2">
              {DEMO_SUGGESTIONS.length} items
            </Badge>
            <p className="text-sm text-gray-600 mb-4">
              Lead generation suggestions from Google, Facebook, and CSV
            </p>
            <Button
              onClick={() => loadDemoData('suggestions')}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'suggestions' ? 'Loading...' : 'Load Suggestions'}
            </Button>
          </div>

          <div className="text-center">
            <h3 className="font-semibold mb-2">All Demo Data</h3>
            <Badge variant="outline" className="mb-2">
              {DEMO_CALL_CENTERS.length + DEMO_SUGGESTIONS.length} items
            </Badge>
            <p className="text-sm text-gray-600 mb-4">
              Load both call centers and suggestions for complete demo
            </p>
            <Button
              onClick={() => loadDemoData('all')}
              disabled={loading !== null}
              variant="default"
              className="w-full"
            >
              {loading === 'all' ? 'Loading...' : 'Load All Data'}
            </Button>
          </div>
        </div>

        {results && (
          <div className="mt-4 p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">
              {results.success ? '✅ Success' : '❌ Error'}
            </h4>
            <p className="text-sm mb-2">{results.message || results.error}</p>

            {results.callCenters && (
              <div className="text-sm">
                <p><strong>Call Centers:</strong> {results.callCenters.filter((r: any) => r.success).length} imported, {results.callCenters.filter((r: any) => !r.success).length} failed</p>
              </div>
            )}

            {results.suggestions && (
              <div className="text-sm">
                <p><strong>Suggestions:</strong> {results.suggestions.filter((r: any) => r.success).length} imported, {results.suggestions.filter((r: any) => !r.success).length} failed</p>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p><strong>Note:</strong> Demo data includes realistic call center information across Morocco, Tunisia, Senegal, Ivory Coast, Guinea, and Cameroon.</p>
          <p className="mt-1">Use this to test bulk operations, filtering, and the complete CRM workflow.</p>
        </div>
      </CardContent>
    </Card>
  );
}
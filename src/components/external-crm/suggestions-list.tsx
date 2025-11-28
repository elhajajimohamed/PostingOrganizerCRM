'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Suggestion } from '@/lib/types/external-crm';
import { PhoneDetectionService } from '@/lib/services/phone-detection-service';

interface SuggestionsListProps {
  suggestions: Suggestion[];
  onImport: (ids: string[]) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const COUNTRY_FLAGS = {
  'Morocco': '🇲🇦',
  'Tunisia': '🇹🇳',
  'Senegal': '🇸🇳',
  'Ivory Coast': '🇨🇮',
  'Guinea': '🇬🇳',
  'Cameroon': '🇨🇲'
};

const SOURCE_COLORS = {
  'google': 'bg-blue-100 text-blue-800',
  'facebook': 'bg-blue-100 text-blue-800',
  'csv': 'bg-green-100 text-green-800'
};

export function SuggestionsList({
  suggestions,
  onImport,
  onDelete,
  loading = false
}: SuggestionsListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? suggestions.map(s => s.id) : []);
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev =>
      checked ? [...prev, id] : prev.filter(selectedId => selectedId !== id)
    );
  };

  const handleImport = () => {
    if (selectedIds.length > 0) {
      onImport(selectedIds);
      setSelectedIds([]);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading suggestions...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedIds.length} selected
              </span>
              <Button onClick={handleImport}>
                Import Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Suggestions ({suggestions.length})</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedIds.length === suggestions.length && suggestions.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No suggestions found. Try scraping for new leads.
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map(suggestion => (
                <div key={suggestion.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Checkbox
                    checked={selectedIds.includes(suggestion.id)}
                    onCheckedChange={(checked: boolean) => handleSelect(suggestion.id, checked)}
                  />

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="font-semibold">{suggestion.name}</h3>
                      <p className="text-sm text-gray-600">{suggestion.city}, {suggestion.country} {COUNTRY_FLAGS[suggestion.country]}</p>
                    </div>

                    <div>
                      <Badge className={SOURCE_COLORS[suggestion.source]}>
                        {suggestion.source}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">
                        {suggestion.positions} positions
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {suggestion.phones.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <p className="text-sm">{suggestion.phones[0]}</p>
                          {suggestion.phone_infos && suggestion.phone_infos[0] && suggestion.phone_infos[0].is_mobile && suggestion.phone_infos[0].whatsapp_confidence >= 0.7 && (
                            <a
                              href={PhoneDetectionService.getWhatsAppLink(suggestion.phones[0])}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(suggestion.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

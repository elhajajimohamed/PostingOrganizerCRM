'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { GroupService } from '@/lib/services/group-service';
import { AccountService } from '@/lib/services/account-service';
import { FacebookAccount, FacebookGroup } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

interface CSVImportProps {
  onImportSuccess: () => void;
  onCancel: () => void;
}

interface ParsedGroupData {
  name: string;
  url: string;
  tags: string[];
  language: string;
}

export function CSVImport({ onImportSuccess, onCancel }: CSVImportProps) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [parsedData, setParsedData] = useState<ParsedGroupData[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<ParsedGroupData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available accounts
  useState(() => {
    const loadAccounts = async () => {
      try {
        const data = await AccountService.getAllAccounts();
        setAccounts(data);
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    };
    loadAccounts();
  });

  const parseCSV = (csvText: string): ParsedGroupData[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const groups: ParsedGroupData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());

      // Find URL column (could be 'url', 'link', 'group_url', etc.)
      const urlIndex = headers.findIndex(h =>
        h.includes('url') || h.includes('link') || h.includes('group')
      );

      if (urlIndex >= 0 && values[urlIndex]) {
        const url = values[urlIndex];

        // Extract group name from URL or use default
        let name = `Group ${i}`;
        const urlMatch = url.match(/facebook\.com\/groups\/([^\/]+)/);
        if (urlMatch) {
          name = urlMatch[1].replace(/[^a-zA-Z0-9]/g, ' ');
        }

        // Find tags column
        const tagsIndex = headers.findIndex(h => h.includes('tag'));
        const tags = tagsIndex >= 0 && values[tagsIndex]
          ? values[tagsIndex].split(/[,;]/).map(t => t.trim()).filter(t => t)
          : [];

        // Find language column
        const langIndex = headers.findIndex(h => h.includes('lang'));
        const language = langIndex >= 0 && values[langIndex]
          ? values[langIndex].trim()
          : 'English';

        groups.push({
          name,
          url,
          tags,
          language
        });
      }
    }

    return groups;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }

      setSelectedFile(file);
      setError('');

      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target?.result as string;
        const parsed = parseCSV(csvText);
        setParsedData(parsed);
        setPreviewData(parsed.slice(0, 5)); // Show first 5 for preview
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedAccount || parsedData.length === 0 || !user) return;

    setImporting(true);
    setError('');

    try {
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < parsedData.length; i++) {
        try {
          const groupData = parsedData[i];

          console.log('Creating group with account:', selectedAccount);

          await GroupService.createGroup({
            name: groupData.name,
            url: groupData.url,
            tags: groupData.tags,
            language: groupData.language,
            accountId: selectedAccount // Assign to selected account
          });

          successCount++;

          // Update progress
          setImportProgress(Math.round(((i + 1) / parsedData.length) * 100));

        } catch (err) {
          console.error(`Failed to import group ${i + 1}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        onImportSuccess();
      } else {
        setError(`Failed to import ${errorCount} groups`);
      }

    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Import Groups from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file containing Facebook group URLs and information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* File Upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="text-green-600">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {parsedData.length} groups found
                  </p>
                </div>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Choose Different File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-medium">Upload your CSV file</p>
                  <p className="text-sm text-gray-600">Select a CSV file with group URLs</p>
                </div>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Browse Files
                </Button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Account Selection */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign to Facebook Account</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id!}>
                      {account.name} ({account.accountId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview Data */}
          {previewData.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Preview (First 5 groups)</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                {previewData.map((group, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{group.name}</p>
                      <p className="text-xs text-gray-600 truncate">{group.url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {group.language}
                      </Badge>
                      {group.tags.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {group.tags.length} tags
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {parsedData.length > 5 && (
                  <p className="text-sm text-gray-600 text-center mt-2">
                    ... and {parsedData.length - 5} more groups
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing groups...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={handleImport}
              disabled={!selectedFile || !selectedAccount || importing || parsedData.length === 0}
              className="flex-1"
            >
              {importing ? 'Importing...' : `Import ${parsedData.length} Groups`}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={importing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
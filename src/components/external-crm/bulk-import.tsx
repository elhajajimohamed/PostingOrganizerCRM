'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react';

interface BulkImportProps {
  onImport: (callCenters: any[]) => void;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

export function BulkImport({ onImport }: BulkImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'json' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/json'
      ];

      const isCSV = selectedFile.name.endsWith('.csv') ||
                   selectedFile.name.endsWith('.xlsx') ||
                   selectedFile.name.endsWith('.xls') ||
                   selectedFile.type.includes('csv') ||
                   selectedFile.type.includes('excel');
      const isJSON = selectedFile.name.endsWith('.json') ||
                    selectedFile.type === 'application/json';

      if (!isCSV && !isJSON) {
        alert('Please select a CSV, Excel, or JSON file (.csv, .xlsx, .xls, .json)');
        return;
      }

      setFile(selectedFile);
      setFileType(isJSON ? 'json' : 'csv');
      setResult(null);
    }
  };

  const parseJSON = (text: string): any[] => {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return [];

      return data.map((item, index) => {
        // Check if this is the standard CallCenter format (has 'name' field)
        if (item.name && typeof item.name === 'string') {
          // Standard CallCenter format - use fields directly
          const callCenter: any = {
            name: item.name,
            country: item.country || 'Morocco',
            city: item.city || '',
            positions: item.positions || 0,
            status: item.status || 'New',
            phones: Array.isArray(item.phones) ? item.phones : [],
            emails: Array.isArray(item.emails) ? item.emails : [],
            website: item.website || '',
            tags: Array.isArray(item.tags) ? item.tags : [],
            notes: item.notes || '',
            address: item.address || '',
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
            lastContacted: item.lastContacted || null,
          };

          // Validate country
          const validCountries = ['Morocco', 'Tunisia', 'Senegal', 'Ivory Coast', 'Guinea', 'Cameroon'];
          if (!validCountries.includes(callCenter.country)) {
            callCenter.country = 'Morocco';
          }

          // Validate status
          const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost', 'On-Hold'];
          if (!validStatuses.includes(callCenter.status)) {
            callCenter.status = 'New';
          }

          return callCenter;
        } else {
          // Legacy format - find name in non-standard field
          const standardFields = ['Country', 'Status', 'City', 'Number of Positions', 'Phone Numbers', 'Commentaire', 'Address'];
          const nameKey = Object.keys(item).find(key => !standardFields.includes(key));

          const name = nameKey ? item[nameKey] : '';
          const address = nameKey || '';

          // Map the legacy JSON structure to our CallCenter format
          const callCenter: any = {
            name: name,
            country: item.Country || 'Morocco',
            city: item.City || '',
            positions: parseInt(item['Number of Positions']) || 0,
            status: item.Status === 'Cold' ? 'New' : (item.Status || 'New'),
            phones: item['Phone Numbers'] ? (typeof item['Phone Numbers'] === 'string' ? [item['Phone Numbers'].trim()].filter((p: string) => p) : []) : [],
            emails: [], // JSON doesn't have emails
            website: '',
            tags: [],
            notes: item.Commentaire || '',
            address: item.Address || address,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastContacted: null,
          };

          // Validate country
          const validCountries = ['Morocco', 'Tunisia', 'Senegal', 'Ivory Coast', 'Guinea', 'Cameroon'];
          if (!validCountries.includes(callCenter.country)) {
            callCenter.country = 'Morocco';
          }

          // Validate status
          const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost', 'On-Hold'];
          if (!validStatuses.includes(callCenter.status)) {
            callCenter.status = 'New';
          }

          return callCenter;
        }
      });
    } catch (error) {
      console.error('JSON parsing error:', error);
      return [];
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1);

    return rows.map((row, index) => {
      const values = row.split(',').map(v => v.trim());
      const callCenter: any = {};

      headers.forEach((header, i) => {
        const value = values[i] || '';

        switch (header) {
          case 'name':
            callCenter.name = value;
            break;
          case 'country':
            // Validate country
            const validCountries = ['Morocco', 'Tunisia', 'Senegal', 'Ivory Coast', 'Guinea', 'Cameroon'];
            callCenter.country = validCountries.includes(value) ? value : 'Morocco';
            break;
          case 'city':
            callCenter.city = value;
            break;
          case 'positions':
          case 'number of positions':
            callCenter.positions = parseInt(value) || 0;
            break;
          case 'status':
            const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost', 'On-Hold'];
            callCenter.status = validStatuses.includes(value) ? value : 'New';
            break;
          case 'phones':
          case 'phone numbers':
            callCenter.phones = value ? value.split(';').map(p => p.trim()).filter(p => p) : [];
            break;
          case 'emails':
            callCenter.emails = value ? value.split(';').map(e => e.trim()).filter(e => e) : [];
            break;
          case 'website':
            callCenter.website = value;
            break;
          case 'tags':
            callCenter.tags = value ? value.split(';').map(t => t.trim()).filter(t => t) : [];
            break;
          case 'notes':
          case 'commentaire':
            callCenter.notes = value;
            break;
          case 'address':
            callCenter.address = value;
            break;
          case 'lastcontacted':
          case 'last_contacted':
            callCenter.lastContacted = value;
            break;
        }
      });

      // Set defaults
      callCenter.createdAt = new Date().toISOString();
      callCenter.updatedAt = new Date().toISOString();

      return callCenter;
    });
  };

  const handleImport = async () => {
    if (!file || !fileType) return;

    setUploading(true);
    setProgress(0);
    setProgressText('Starting import...');
    setResult(null);

    try {
      setProgressText('Reading file...');
      const text = await file.text();
      console.log('File content preview:', text.substring(0, 500));
      setProgress(25);

      let callCenters: any[] = [];

      setProgressText('Parsing data...');
      if (fileType === 'json') {
        callCenters = parseJSON(text);
        console.log('Parsed JSON call centers:', callCenters.length, callCenters.slice(0, 3));
      } else {
        callCenters = parseCSV(text);
      }

      setProgressText('Validating data...');
      setProgress(50);

      if (callCenters.length === 0) {
        setResult({
          success: false,
          imported: 0,
          failed: 0,
          errors: ['No valid data found in file']
        });
        return;
      }

      // Validate required fields
      const validCallCenters: any[] = [];
      const errors: string[] = [];

      callCenters.forEach((cc, index) => {
        if (!cc.name || !cc.name.trim()) {
          errors.push(`Row ${index + (fileType === 'csv' ? 2 : 1)}: Missing name`);
          return;
        }
        validCallCenters.push(cc);
      });

      console.log('Valid call centers:', validCallCenters.length, validCallCenters.slice(0, 3));

      setProgressText(`Preparing to import ${validCallCenters.length} call centers...`);
      setProgress(75);

      if (validCallCenters.length > 0) {
        setProgressText('Importing data to database...');
        await onImport(validCallCenters);
        setProgress(100);
        setProgressText('Import completed successfully!');

        setResult({
          success: true,
          imported: validCallCenters.length,
          failed: callCenters.length - validCallCenters.length,
          errors
        });
      } else {
        setResult({
          success: false,
          imported: 0,
          failed: callCenters.length,
          errors: ['No valid call centers found']
        });
      }

    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        imported: 0,
        failed: 1,
        errors: ['Failed to process file: ' + (error as Error).message]
      });
    } finally {
      setUploading(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetImport();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Call Centers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select CSV or Excel file</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  disabled={uploading}
                />
              </div>

              {file && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">{progressText || 'Processing file...'}</p>
                    <p className="text-sm text-gray-500">{Math.round(progress)}%</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CSV Format</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Your CSV file should include these columns (optional columns can be empty):
              </p>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                name,country,city,positions,status,phones,emails,website,tags,notes,last_contacted
                <br />
                "ABC Call Center","Morocco","Casablanca",50,"New","+212 6XX XXX XXX","","www.abc.ma","telecom;b2b","Good prospect","2024-01-15"
              </div>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono mt-3">
                <strong>JSON Format Example:</strong>
                <br />
                [<br />
                &nbsp;&nbsp;&#123;<br />
                &nbsp;&nbsp;&nbsp;&nbsp;"M38R+WMM, Rue Casablanca, Oujda": "creacall",<br />
                &nbsp;&nbsp;&nbsp;&nbsp;"Country": "Morocco",<br />
                &nbsp;&nbsp;&nbsp;&nbsp;"Status": "Cold",<br />
                &nbsp;&nbsp;&nbsp;&nbsp;"Number of Positions": 12,<br />
                &nbsp;&nbsp;&nbsp;&nbsp;"Phone Numbers": "212668 54 96 54",<br />
                &nbsp;&nbsp;&nbsp;&nbsp;"Commentaire": "NumAcro non attribuAc. 12."<br />
                &nbsp;&nbsp;&#125;<br />
                ]
              </div>
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>CSV Format:</strong> Standard CSV with headers in first row</p>
                <p><strong>JSON Format:</strong> Array of objects with the structure shown in your database file</p>
                <p><strong>Required:</strong> name</p>
                <p><strong>Multiple values:</strong> Use semicolons (;) to separate phones, emails, or tags</p>
                <p><strong>Country:</strong> Morocco, Tunisia, Senegal, Ivory Coast, Guinea, Cameroon</p>
                <p><strong>Status:</strong> New, Cold, Warm, Hot, Won, Lost</p>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mr-2" />
                )}
                <AlertDescription>
                  <div>
                    <p className="font-medium">
                      {result.success ? 'Import completed successfully!' : 'Import failed'}
                    </p>
                    <p className="text-sm mt-1">
                      Imported: {result.imported} | Failed: {result.failed}
                    </p>
                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Errors:</p>
                        <ul className="text-sm list-disc list-inside">
                          {result.errors.slice(0, 5).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                          {result.errors.length > 5 && (
                            <li>...and {result.errors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {file && !result && (
              <Button onClick={handleImport} disabled={uploading}>
                {uploading ? 'Importing...' : 'Import Call Centers'}
              </Button>
            )}
            {result && (
              <Button onClick={resetImport}>
                Import Another File
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

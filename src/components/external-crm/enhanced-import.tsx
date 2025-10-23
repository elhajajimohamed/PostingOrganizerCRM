'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Trash2
} from 'lucide-react';
import { CallCenter } from '@/lib/types/external-crm';
import { DuplicateDetectionService, DuplicateGroup } from '@/lib/services/duplicate-detection-service';

interface EnhancedImportProps {
  onImport: (callCenters: any[], options?: ImportOptions) => Promise<void>;
}

interface ImportOptions {
  skipDuplicates: boolean;
  updateExisting: boolean;
  mergeStrategy: 'overwrite' | 'preserve' | 'combine';
}

interface ParsedCallCenter {
  data: any;
  isValid: boolean;
  errors: string[];
  duplicates: DuplicateGroup[];
  selected: boolean;
  action: 'create' | 'skip' | 'merge' | 'update';
}

export function EnhancedImport({ onImport }: EnhancedImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileType, setFileType] = useState<'csv' | 'json' | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCallCenter[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    skipDuplicates: true,
    updateExisting: false,
    mergeStrategy: 'preserve'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const isCSV = selectedFile.name.endsWith('.csv') || selectedFile.type.includes('csv');
    const isJSON = selectedFile.name.endsWith('.json') || selectedFile.type === 'application/json';

    if (!isCSV && !isJSON) {
      alert('Please select a CSV or JSON file');
      return;
    }

    setFile(selectedFile);
    setFileType(isJSON ? 'json' : 'csv');
    setUploading(true);
    setProgress(10);

    try {
      const text = await selectedFile.text();
      setProgress(30);

      let rawData: any[] = [];

      if (isJSON) {
        rawData = JSON.parse(text);
        if (!Array.isArray(rawData)) {
          throw new Error('JSON file must contain an array of objects');
        }
      } else {
        // Simple CSV parsing
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          throw new Error('CSV file must have at least a header row and one data row');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        rawData = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, i) => {
            obj[header] = values[i] || '';
          });
          return obj;
        });
      }

      setProgress(50);

      // Process and validate data
      const processedData: ParsedCallCenter[] = [];

      for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];

        // Sanitize data
        const sanitized = DuplicateDetectionService.sanitizeCallCenter(item);

        // Validate data
        const validation = DuplicateDetectionService.validateCallCenter(sanitized);

        // Find duplicates
        const duplicates = await DuplicateDetectionService.findDuplicates(sanitized);
        const duplicateGroups = DuplicateDetectionService.groupDuplicates(duplicates);

        // Determine suggested action
        let suggestedAction: 'create' | 'skip' | 'merge' | 'update' = 'create';
        if (duplicateGroups.length > 0) {
          const bestMatch = duplicateGroups[0];
          if (bestMatch.suggestedAction === 'merge') {
            suggestedAction = 'merge';
          } else if (bestMatch.suggestedAction === 'skip') {
            suggestedAction = 'skip';
          }
        }

        processedData.push({
          data: sanitized,
          isValid: validation.isValid,
          errors: validation.errors,
          duplicates: duplicateGroups,
          selected: validation.isValid,
          action: suggestedAction
        });
      }

      setParsedData(processedData);
      setShowPreview(true);
      setProgress(100);

    } catch (error) {
      console.error('File processing error:', error);
      alert('Error processing file: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    const selectedData = parsedData.filter(item => item.selected && item.isValid);

    if (selectedData.length === 0) {
      alert('No valid data selected for import');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Apply import options
      let finalData = selectedData.map(item => {
        let data = { ...item.data };

        // Handle duplicates based on action
        if (item.action === 'merge' && item.duplicates.length > 0) {
          const bestMatch = item.duplicates[0].matches[0];
          if (bestMatch) {
            // Merge strategy
            if (importOptions.mergeStrategy === 'overwrite') {
              data = { ...data, id: bestMatch.id };
            } else if (importOptions.mergeStrategy === 'combine') {
              data = { ...bestMatch.existingCallCenter, ...data };
            }
          }
        }

        return data;
      });

      // Filter out items to skip
      if (importOptions.skipDuplicates) {
        finalData = finalData.filter(item => item.action !== 'skip');
      }

      setProgress(50);

      await onImport(finalData, importOptions);
      setProgress(100);

      alert(`Successfully imported ${finalData.length} call centers`);
      handleClose();

    } catch (error) {
      console.error('Import error:', error);
      alert('Import failed: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectAll = (selected: boolean) => {
    setParsedData(prev => prev.map(item => ({ ...item, selected })));
  };

  const handleSelectItem = (index: number, selected: boolean) => {
    setParsedData(prev => prev.map((item, i) =>
      i === index ? { ...item, selected } : item
    ));
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'merge': return 'bg-blue-100 text-blue-800';
      case 'update': return 'bg-yellow-100 text-yellow-800';
      case 'skip': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const resetImport = () => {
    setFile(null);
    setParsedData([]);
    setShowPreview(false);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetImport();
  };

  const selectedCount = parsedData.filter(item => item.selected).length;
  const validCount = parsedData.filter(item => item.isValid).length;
  const duplicateCount = parsedData.filter(item => item.duplicates.length > 0).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Enhanced Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enhanced Import with Duplicate Detection</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                File Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select CSV or JSON file</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.json"
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
                      {(file.size / 1024).toFixed(1)} KB • {fileType?.toUpperCase()}
                    </p>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-gray-600">Processing file...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import Options */}
          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Import Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Duplicate Handling</Label>
                    <Select
                      value={importOptions.skipDuplicates ? 'skip' : 'import'}
                      onValueChange={(value) => setImportOptions(prev => ({
                        ...prev,
                        skipDuplicates: value === 'skip'
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip Duplicates</SelectItem>
                        <SelectItem value="import">Import All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Update Existing</Label>
                    <Select
                      value={importOptions.updateExisting ? 'yes' : 'no'}
                      onValueChange={(value) => setImportOptions(prev => ({
                        ...prev,
                        updateExisting: value === 'yes'
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">Create Only</SelectItem>
                        <SelectItem value="yes">Update Existing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Merge Strategy</Label>
                    <Select
                      value={importOptions.mergeStrategy}
                      onValueChange={(value: 'overwrite' | 'preserve' | 'combine') =>
                        setImportOptions(prev => ({ ...prev, mergeStrategy: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preserve">Preserve Existing</SelectItem>
                        <SelectItem value="overwrite">Overwrite</SelectItem>
                        <SelectItem value="combine">Combine Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Preview */}
          {showPreview && parsedData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Data Preview & Review ({parsedData.length} records)
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">
                      Selected: {selectedCount}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Valid: {validCount}
                    </Badge>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      Duplicates: {duplicateCount}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{parsedData.length}</p>
                      <p className="text-sm text-gray-600">Total Records</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{validCount}</p>
                      <p className="text-sm text-gray-600">Valid</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{duplicateCount}</p>
                      <p className="text-sm text-gray-600">Duplicates</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{selectedCount}</p>
                      <p className="text-sm text-gray-600">Selected</p>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">
                              <Checkbox
                                checked={selectedCount === validCount && validCount > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            </th>
                            <th className="px-4 py-2 text-left">Name</th>
                            <th className="px-4 py-2 text-left">Country</th>
                            <th className="px-4 py-2 text-left">City</th>
                            <th className="px-4 py-2 text-left">Status</th>
                            <th className="px-4 py-2 text-left">Action</th>
                            <th className="px-4 py-2 text-left">Issues</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.map((item, index) => (
                            <tr key={index} className={`border-t ${!item.isValid ? 'bg-red-50' : ''}`}>
                              <td className="px-4 py-2">
                                <Checkbox
                                  checked={item.selected}
                                  onCheckedChange={(checked) => handleSelectItem(index, !!checked)}
                                  disabled={!item.isValid}
                                />
                              </td>
                              <td className="px-4 py-2">
                                <div>
                                  <p className="font-medium">{item.data.name || 'Unnamed'}</p>
                                  {item.data.positions && (
                                    <p className="text-sm text-gray-500">{item.data.positions} positions</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <Badge variant="outline">{item.data.country}</Badge>
                              </td>
                              <td className="px-4 py-2">{item.data.city || '-'}</td>
                              <td className="px-4 py-2">
                                <Badge className={getActionBadgeColor(item.action)}>
                                  {item.action}
                                </Badge>
                              </td>
                              <td className="px-4 py-2">
                                <div className="space-y-1">
                                  {item.duplicates.length > 0 && (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                      {item.duplicates.length} duplicate{item.duplicates.length !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {item.data.value && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                      ${item.data.value}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                {item.errors.length > 0 && (
                                  <div className="flex items-center text-red-600">
                                    <XCircle className="w-4 h-4 mr-1" />
                                    <span className="text-sm">{item.errors[0]}</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Summary */}
          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{selectedCount}</p>
                    <p className="text-sm text-gray-600">Records to Import</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {parsedData.filter(item => item.action === 'create').length}
                    </p>
                    <p className="text-sm text-gray-600">New Records</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {parsedData.filter(item => item.action === 'merge' || item.action === 'update').length}
                    </p>
                    <p className="text-sm text-gray-600">Updates/Merges</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              {showPreview ? 'Cancel' : 'Close'}
            </Button>
            {showPreview && (
              <>
                <Button variant="outline" onClick={resetImport}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Start Over
                </Button>
                <Button onClick={handleImport} disabled={uploading || selectedCount === 0}>
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Import {selectedCount} Records
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
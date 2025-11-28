'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Template } from '@/lib/types';
import { TemplateService } from '@/lib/services/template-service';
import { TemplateForm } from './template-form';
import { useAuth } from '@/lib/auth-context';
import { ClipboardButton } from '@/components/ui/clipboard-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function TemplatesList() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>();
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load templates
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await TemplateService.getAllTemplates();
      setTemplates(data);
      setFilteredTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Filter templates based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTemplates(templates);
    } else {
      const filtered = templates.filter(template =>
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.body.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTemplates(filtered);
    }
  }, [searchTerm, templates]);

  // Handle form success
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTemplate(undefined);
    loadTemplates();
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTemplate(undefined);
  };

  // Handle edit
  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingTemplate?.id) return;

    try {
      await TemplateService.deleteTemplate(deletingTemplate.id);
      setDeletingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  // Handle template usage (copy to clipboard)
  const handleUseTemplate = async (template: Template) => {
    try {
      // Increment usage count
      await TemplateService.incrementUsageCount(template.id!);

      // Reload templates to show updated usage count
      loadTemplates();
    } catch (error) {
      console.error('Failed to use template:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <TemplateForm
        template={editingTemplate}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Posting Templates</h2>
          <p className="text-gray-600">Create and manage reusable posting templates</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          Create New Template
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search templates by title or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-semibold mb-2">
              {templates.length === 0 ? 'No templates yet' : 'No templates found'}
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {templates.length === 0
                ? 'Get started by creating your first posting template'
                : 'Try adjusting your search terms'
              }
            </p>
            {templates.length === 0 && (
              <Button onClick={() => setShowForm(true)}>
                Create Your First Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg truncate">{template.title}</CardTitle>
                    <CardDescription>
                      Created {template.createdAt?.toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {template.usageCount} uses
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 line-clamp-3">
                    {template.body}
                  </div>

                  {template.placeholders.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-600 block mb-1">Placeholders:</span>
                      <div className="flex flex-wrap gap-1">
                        {template.placeholders.slice(0, 3).map((placeholder) => (
                          <Badge key={placeholder} variant="secondary" className="text-xs">
                            {`{${placeholder}}`}
                          </Badge>
                        ))}
                        {template.placeholders.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.placeholders.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <ClipboardButton
                      text={template.body}
                      size="sm"
                      className="flex-1"
                      onCopy={() => handleUseTemplate(template)}
                    >
                      Copy & Use
                    </ClipboardButton>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeletingTemplate(template)}
                      className="flex-1"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTemplate?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

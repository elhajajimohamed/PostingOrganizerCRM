'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/lib/notification-context';
import {
  Play,
  Plus,
  RefreshCw,
  Calendar,
  Target,
  Users,
  FileText,
  Image as ImageIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Settings,
  BarChart3,
  Activity,
  Zap,
  Brain,
  Globe,
  Eye,
  X,
  Upload,
  Trash2,
  Edit,
  Download,
  Search,
  Filter,
  Grid3X3,
  List,
  Move,
  Copy,
  CheckSquare,
  Square,
  UserCheck,
  UserPlus,
  Clipboard
} from 'lucide-react';
import { GroupsPostingGeneratorService } from '@/lib/services/groups-posting-generator-service';
import { FacebookAccount, FacebookGroup, Media, Template } from '@/lib/types';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface WeeklyPostingPlan {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  totalTasks: number;
  generatedAt: string;
  status: 'active' | 'completed' | 'cancelled';
}

interface WeeklyTask {
  id: string;
  planId: string;
  dayOfWeek: number;
  accountId: string;
  accountName: string;
  accountBrowser?: string;
  groupId: string;
  groupName: string;
  groupUrl: string;
  groupMemberCount: number;
  textId: string;
  textTitle: string;
  textContent: string;
  imageId?: string;
  imageUrl?: string;
  imageFilename?: string;
  scheduledTime: string;
  status: 'pending' | 'completed' | 'failed' | 'joining';
  createdAt: string;
  updatedAt: string;
}

interface MediaItem extends Media {
  selected?: boolean;
  uploading?: boolean;
  storagePath?: string;
  fileSize?: number;
  mimeType?: string;
  filename?: string;
  createdAt?: Date;
}

interface GroupsPostingPageProps {
  onEditGroup?: (groupData: any) => void;
}

export default function GroupsPostingPage({ onEditGroup }: GroupsPostingPageProps) {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotifications();

  const [plan, setPlan] = useState<WeeklyPostingPlan | null>(null);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    failedTasks: 0,
    joiningTasks: 0,
    groupsUsed: 0,
    accountsUsed: 0
  });
  
  // Data loading states
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [groups, setGroups] = useState<FacebookGroup[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Generation settings
  const [generationSettings, setGenerationSettings] = useState({
    tasksPerDay: 15,
    startTime: '09:00',
    timeInterval: 60,
    forcePartialWeek: false
  });

  // Active tab for data management
  const [activeTab, setActiveTab] = useState('dashboard');

  // Generation progress tracking
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Media management states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newMediaName, setNewMediaName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template management states
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());

  // Account management states
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [editingAccount, setEditingAccount] = useState<FacebookAccount | null>(null);
  const [editAccountDialogOpen, setEditAccountDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountId, setNewAccountId] = useState('');
  const [newAccountStatus, setNewAccountStatus] = useState<'active' | 'limited' | 'banned'>('active');
  const [newAccountBrowser, setNewAccountBrowser] = useState('');
  const [newAccountImage, setNewAccountImage] = useState('');

  // Group management states
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  const loadData = async () => {
    try {
      setLoading(true);
      const [currentPlan, currentTasks, currentStats] = await Promise.all([
        GroupsPostingGeneratorService.getCurrentWeekPlan(),
        GroupsPostingGeneratorService.getCurrentWeekTasks(),
        GroupsPostingGeneratorService.getCurrentWeekStats()
      ]);
      
      setPlan(currentPlan);
      setTasks(currentTasks);
      setStats(currentStats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const q = query(collection(db, 'accountsVOIP'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const accountsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FacebookAccount[];
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadGroups = async () => {
    try {
      setLoadingGroups(true);
      const q = query(collection(db, 'groupsVOIP'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FacebookGroup[];
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadMedia = async () => {
    try {
      setLoadingMedia(true);
      const q = query(collection(db, 'imagesVOIP'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const mediaData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        selected: false,
        uploading: false
      })) as MediaItem[];
      setMedia(mediaData);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoadingMedia(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const q = query(collection(db, 'textsVOIP'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const templatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Template[];
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadDatabaseData = async () => {
    try {
      setLoading(true);
      
      // Load all data concurrently
      await Promise.all([
        loadAccounts(),
        loadGroups(),
        loadMedia(),
        loadTemplates()
      ]);
    } catch (error) {
      console.error('Error loading database data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Media management functions
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        continue;
      }

      const fileId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to media list with uploading state
      const uploadingMedia: MediaItem = {
        id: fileId,
        filename: file.name,
        name: file.name,
        url: URL.createObjectURL(file),
        storagePath: '',
        selected: false,
        uploading: true,
        type: 'image',
        category: 'uploaded',
        uploadedAt: new Date(),
        uploadedBy: 'current-user',
        fileSize: file.size,
        mimeType: file.type
      };
      
      setMedia(prev => [uploadingMedia, ...prev]);
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      try {
        // Create storage reference
        const storageRef = ref(storage, `imagesVOIP/${Date.now()}-${file.name}`);
        
        // Upload file to Firebase Storage
        const uploadTask = uploadBytes(storageRef, file);
        
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: Math.min((prev[fileId] || 0) + 10, 90)
          }));
        }, 200);

        const snapshot = await uploadTask;
        clearInterval(progressInterval);
        
        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Save metadata to Firestore
        const docRef = await addDoc(collection(db, 'imagesVOIP'), {
          filename: file.name,
          name: file.name,
          url: downloadURL,
          storagePath: snapshot.ref.fullPath,
          uploaded: true,
          createdAt: new Date(),
          fileSize: file.size,
          mimeType: file.type
        });

        // Update media list
        setMedia(prev => prev.map(item => 
          item.id === fileId 
            ? { 
                ...item, 
                id: docRef.id,
                url: downloadURL,
                storagePath: snapshot.ref.fullPath,
                uploading: false,
                selected: false
              }
            : item
        ));

        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        
        // Remove progress after a delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }, 1000);

      } catch (error) {
        console.error('Error uploading file:', error);
        // Remove failed upload
        setMedia(prev => prev.filter(item => item.id !== fileId));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        alert(`Failed to upload ${file.name}`);
      }
    }
  };

  const toggleMediaSelection = (mediaId: string) => {
    setSelectedMedia(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(mediaId)) {
        newSelection.delete(mediaId);
      } else {
        newSelection.add(mediaId);
      }
      return newSelection;
    });
  };

  const selectAllMedia = () => {
    if (selectedMedia.size === filteredMedia.length) {
      setSelectedMedia(new Set());
    } else {
      setSelectedMedia(new Set(filteredMedia.map(item => item.id!).filter(Boolean)));
    }
  };

  const deleteSelectedMedia = async () => {
    if (selectedMedia.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedMedia.size} image(s)?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedMedia).map(async (mediaId) => {
        const mediaItem = media.find(item => item.id === mediaId);
        if (!mediaItem) return;

        // Delete from storage if it has a storage path
        if (mediaItem.storagePath) {
          const storageRef = ref(storage, mediaItem.storagePath);
          await deleteObject(storageRef);
        }

        // Delete from Firestore
        await deleteDoc(doc(db, 'imagesVOIP', mediaId));
      });

      await Promise.all(deletePromises);
      
      // Refresh media list
      await loadMedia();
      setSelectedMedia(new Set());
      
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete some images');
    }
  };

  const renameMedia = async () => {
    if (!editingMedia || !editingMedia.id || !newMediaName.trim()) return;

    try {
      await updateDoc(doc(db, 'imagesVOIP', editingMedia.id), {
        name: newMediaName.trim(),
        filename: newMediaName.trim()
      });

      // Update local state
      setMedia(prev => prev.map(item =>
        item.id === editingMedia.id
          ? { ...item, name: newMediaName.trim(), filename: newMediaName.trim() }
          : item
      ));

      setEditingMedia(null);
      setNewMediaName('');
      setRenameDialogOpen(false);
    } catch (error) {
      console.error('Error renaming media:', error);
      alert('Failed to rename image');
    }
  };

  const replaceMedia = async (mediaId: string, newFile: File) => {
    if (!newFile.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      const mediaItem = media.find(item => item.id === mediaId);
      if (!mediaItem) return;

      // Delete old file from storage
      if (mediaItem.storagePath) {
        const oldStorageRef = ref(storage, mediaItem.storagePath);
        await deleteObject(oldStorageRef);
      }

      // Upload new file
      const storageRef = ref(storage, `imagesVOIP/${Date.now()}-${newFile.name}`);
      const snapshot = await uploadBytes(storageRef, newFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update Firestore
      await updateDoc(doc(db, 'imagesVOIP', mediaId), {
        filename: newFile.name,
        name: newFile.name,
        url: downloadURL,
        storagePath: snapshot.ref.fullPath,
        fileSize: newFile.size,
        mimeType: newFile.type
      });

      // Update local state
      setMedia(prev => prev.map(item =>
        item.id === mediaId
          ? {
              ...item,
              filename: newFile.name,
              name: newFile.name,
              url: downloadURL,
              storagePath: snapshot.ref.fullPath,
              fileSize: newFile.size,
              mimeType: newFile.type
            }
          : item
      ));

      alert('Image replaced successfully');
    } catch (error) {
      console.error('Error replacing media:', error);
      alert('Failed to replace image');
    }
  };

  // Template management functions
  const handleAddTemplate = async () => {
    if (!newTemplateTitle.trim() || !newTemplateBody.trim()) return;

    try {
      const docRef = await addDoc(collection(db, 'textsVOIP'), {
        title: newTemplateTitle.trim(),
        body: newTemplateBody.trim(),
        placeholders: [],
        usageCount: 0,
        createdBy: 'current-user',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update local state
      setTemplates(prev => [{
        id: docRef.id,
        title: newTemplateTitle.trim(),
        body: newTemplateBody.trim(),
        placeholders: [],
        usageCount: 0,
        createdBy: 'current-user',
        createdAt: new Date(),
        updatedAt: new Date()
      }, ...prev]);

      // Clear form
      setNewTemplateTitle('');
      setNewTemplateBody('');

      // Close dialog
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Error adding template:', error);
      alert('Failed to add template');
    }
  };

  const handleEditTemplate = async () => {
    if (!editingTemplate || !editingTemplate.id || !newTemplateTitle.trim() || !newTemplateBody.trim()) return;

    try {
      await updateDoc(doc(db, 'textsVOIP', editingTemplate.id), {
        title: newTemplateTitle.trim(),
        body: newTemplateBody.trim(),
        updatedAt: new Date()
      });

      // Update local state
      setTemplates(prev => prev.map(template =>
        template.id === editingTemplate.id
          ? {
              ...template,
              title: newTemplateTitle.trim(),
              body: newTemplateBody.trim()
            }
          : template
      ));

      // Clear form and close dialog
      setEditingTemplate(null);
      setNewTemplateTitle('');
      setNewTemplateBody('');
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteDoc(doc(db, 'textsVOIP', templateId));

      // Update local state
      setTemplates(prev => prev.filter(template => template.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handleTemplateImport = async (file: File) => {
    try {
      const fileContent = await file.text();
      let templatesToImport: { title: string; body: string }[] = [];

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(fileContent);
        templatesToImport = parsed.map((item: any) => ({
          title: item.title || '',
          body: item.body || item.content || ''
        }));
      } else if (file.name.endsWith('.csv')) {
        // Parse CSV - assuming format: title,body
        const lines = fileContent.split('\n').filter(line => line.trim());
        templatesToImport = lines.slice(1).map(line => {
          const [title, ...bodyParts] = line.split(',');
          return {
            title: title?.trim() || '',
            body: bodyParts.join(',').trim()
          };
        });
      }

      // Validate templates
      const validTemplates = templatesToImport.filter(t => t.title && t.body);

      if (validTemplates.length === 0) {
        alert('No valid templates found in the file');
        return;
      }

      // Add templates to Firestore
      const addPromises = validTemplates.map(template =>
        addDoc(collection(db, 'textsVOIP'), {
          title: template.title,
          body: template.body,
          placeholders: [],
          usageCount: 0,
          createdBy: 'current-user',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      );

      const results = await Promise.all(addPromises);

      // Update local state
      const newTemplates = results.map((docRef, index) => ({
        id: docRef.id,
        title: validTemplates[index].title,
        body: validTemplates[index].body,
        placeholders: [],
        usageCount: 0,
        createdBy: 'current-user',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      setTemplates(prev => [...newTemplates, ...prev]);

      alert(`Successfully imported ${validTemplates.length} template(s)`);
    } catch (error) {
      console.error('Error importing templates:', error);
      alert('Failed to import templates. Please check the file format.');
    }
  };

  const handleGroupImport = async (file: File) => {
    try {
      const fileContent = await file.text();
      let groupsToImport: { name: string; url: string; memberCount?: number }[] = [];

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(fileContent);
        groupsToImport = parsed.map((item: any) => ({
          name: item.name || '',
          url: item.url || '',
          memberCount: item.memberCount || item.members || 0
        }));
      }

      // Validate groups
      const validGroups = groupsToImport.filter(g => g.name && g.url);

      if (validGroups.length === 0) {
        alert('No valid groups found in the file');
        return;
      }

      // Add groups to Firestore
      const addPromises = validGroups.map(group =>
        addDoc(collection(db, 'groupsVOIP'), {
          name: group.name,
          url: group.url,
          tags: [],
          language: 'en',
          warningCount: 0,
          memberCount: group.memberCount || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      );

      const results = await Promise.all(addPromises);

      // Update local state
      const newGroups = results.map((docRef, index) => ({
        id: docRef.id,
        name: validGroups[index].name,
        url: validGroups[index].url,
        tags: [],
        language: 'en',
        warningCount: 0,
        memberCount: validGroups[index].memberCount || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      setGroups(prev => [...newGroups, ...prev]);

      alert(`Successfully imported ${validGroups.length} group(s)`);
    } catch (error) {
      console.error('Error importing groups:', error);
      alert('Failed to import groups. Please check the file format.');
    }
  };

  // Template selection functions
  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(templateId)) {
        newSelection.delete(templateId);
      } else {
        newSelection.add(templateId);
      }
      return newSelection;
    });
  };

  const selectAllTemplates = () => {
    if (selectedTemplates.size === templates.length) {
      setSelectedTemplates(new Set());
    } else {
      setSelectedTemplates(new Set(templates.map(template => template.id!).filter(Boolean)));
    }
  };

  const deleteSelectedTemplates = async () => {
    if (selectedTemplates.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedTemplates.size} template(s)?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedTemplates).map(async (templateId) => {
        await deleteDoc(doc(db, 'textsVOIP', templateId));
      });

      await Promise.all(deletePromises);

      // Update local state
      setTemplates(prev => prev.filter(template => !selectedTemplates.has(template.id!)));
      setSelectedTemplates(new Set());

    } catch (error) {
      console.error('Error deleting templates:', error);
      alert('Failed to delete some templates');
    }
  };

  // Account management functions
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(accountId)) {
        newSelection.delete(accountId);
      } else {
        newSelection.add(accountId);
      }
      return newSelection;
    });
  };

  const selectAllAccounts = () => {
    if (selectedAccounts.size === accounts.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(accounts.map(account => account.id!).filter(Boolean)));
    }
  };

  const deleteSelectedAccounts = async () => {
    if (selectedAccounts.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedAccounts.size} account(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedAccounts).map(async (accountId) => {
        await deleteDoc(doc(db, 'accountsVOIP', accountId));
      });

      await Promise.all(deletePromises);

      // Update local state
      setAccounts(prev => prev.filter(account => !selectedAccounts.has(account.id!)));
      setSelectedAccounts(new Set());

      alert(`Successfully deleted ${selectedAccounts.size} account(s)`);
    } catch (error) {
      console.error('Error deleting accounts:', error);
      alert('Failed to delete some accounts');
    }
  };

  const handleEditAccount = async () => {
    if (!editingAccount || !editingAccount.id || !newAccountName.trim() || !newAccountId.trim()) return;

    try {
      await updateDoc(doc(db, 'accountsVOIP', editingAccount.id), {
        name: newAccountName.trim(),
        accountId: newAccountId.trim(),
        status: newAccountStatus,
        browser: newAccountBrowser.trim() || undefined,
        profileImage: newAccountImage.trim() || undefined,
        notes: editingAccount.notes,
        updatedAt: new Date()
      });

      // Update local state
      setAccounts(prev => prev.map(account =>
        account.id === editingAccount.id
          ? {
              ...account,
              name: newAccountName.trim(),
              accountId: newAccountId.trim(),
              status: newAccountStatus,
              browser: newAccountBrowser.trim() || undefined,
              profileImage: newAccountImage.trim() || undefined
            }
          : account
      ));

      setEditingAccount(null);
      setNewAccountName('');
      setNewAccountId('');
      setNewAccountStatus('active');
      setNewAccountBrowser('');
      setNewAccountImage('');
      setEditAccountDialogOpen(false);

      alert('Account updated successfully');
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Failed to update account');
    }
  };

  // Group management functions
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(groupId)) {
        newSelection.delete(groupId);
      } else {
        newSelection.add(groupId);
      }
      return newSelection;
    });
  };

  const selectAllGroups = () => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groups.map(group => group.id!).filter(Boolean)));
    }
  };

  const deleteSelectedGroups = async () => {
    if (selectedGroups.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedGroups.size} group(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedGroups).map(async (groupId) => {
        await deleteDoc(doc(db, 'groupsVOIP', groupId));
      });

      await Promise.all(deletePromises);

      // Update local state
      setGroups(prev => prev.filter(group => !selectedGroups.has(group.id!)));
      setSelectedGroups(new Set());

      alert(`Successfully deleted ${selectedGroups.size} group(s)`);
    } catch (error) {
      console.error('Error deleting groups:', error);
      alert('Failed to delete some groups');
    }
  };


  const handleGeneratePlan = async () => {
    try {
      setIsGenerating(true);
      setGenerationProgress(0);

      console.log('🎯 Starting plan generation with settings:', generationSettings);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const newPlan = await GroupsPostingGeneratorService.generateWeeklyPlan(generationSettings);

      clearInterval(progressInterval);
      setGenerationProgress(100);

      console.log('✅ Plan generation completed, reloading data...');

      // Reload data
      await loadData();

      console.log('✅ Data reloaded, checking plan:', plan);

      setTimeout(() => setGenerationProgress(0), 1000);
    } catch (error) {
      console.error('❌ Error generating plan:', error);
      alert(`Failed to generate plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setGenerationProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearPlan = async () => {
    if (!confirm('Are you sure you want to clear the current week plan? This will delete all tasks.')) {
      return;
    }
    
    try {
      await GroupsPostingGeneratorService.clearCurrentWeekPlan();
      await loadData();
    } catch (error) {
      console.error('Error clearing plan:', error);
    }
  };

  const handleTaskStatusUpdate = async (taskId: string, status: 'completed' | 'failed' | 'joining') => {
    try {
      await GroupsPostingGeneratorService.updateTaskStatus(taskId, status);

      // Send notification for completed tasks
      if (status === 'completed') {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          addNotification({
            title: 'Group Posting Completed',
            message: `Successfully posted to "${task.groupName}" using account "${task.accountName}"`,
            type: 'success',
            taskId: taskId,
          });
        }
      }

      await loadData();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  // Authentication check
  useEffect(() => {
    if (authLoading) return;

    const isDevelopment = process.env.NODE_ENV === 'development';
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    if (!user?.uid && !(isDevelopment && bypassAuth)) {
      router.push('/');
      return;
    }
  }, [user?.uid, router, authLoading]);

  useEffect(() => {
    loadData();
    loadDatabaseData();
  }, []);

  // Filter media based on search term
  const filteredMedia = media.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.filename && item.filename.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  };

  const getTasksForDay = (dayOfWeek: number) => {
    return tasks.filter(task => task.dayOfWeek === dayOfWeek).sort((a, b) =>
      new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  };

  const isDayFullyCompleted = (dayOfWeek: number) => {
    const dayTasks = getTasksForDay(dayOfWeek);
    if (dayTasks.length === 0) return false;

    // A day is fully completed if all tasks have one of the done statuses
    return dayTasks.every(task =>
      task.status === 'completed' ||
      task.status === 'joining' ||
      task.status === 'failed'
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'joining':
        return <UserPlus className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'joining':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Utility function to truncate text
  const truncateText = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Show loading if still authenticating
  if (authLoading || (!user?.uid && !(process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                  Smart Groups Posting
                </h1>
                <p className="text-sm text-slate-600">Automated Facebook Groups Marketing</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={loadData} 
                disabled={loading}
                className="bg-white/50 backdrop-blur-sm border-slate-200 hover:bg-white/80"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button id="new-plan-button" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    New Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-blue-600" />
                      <span>Generate Weekly Plan</span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Tasks per Day</label>
                      <Input
                        type="number"
                        value={generationSettings.tasksPerDay}
                        onChange={(e) => setGenerationSettings(prev => ({
                          ...prev,
                          tasksPerDay: parseInt(e.target.value) || 15
                        }))}
                        min="5"
                        max="20"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-700">Start Time</label>
                      <Input
                        type="time"
                        value={generationSettings.startTime}
                        onChange={(e) => setGenerationSettings(prev => ({
                          ...prev,
                          startTime: e.target.value
                        }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-slate-700">Time Interval (minutes)</label>
                      <Input
                        type="number"
                        value={generationSettings.timeInterval}
                        onChange={(e) => setGenerationSettings(prev => ({
                          ...prev,
                          timeInterval: parseInt(e.target.value) || 60
                        }))}
                        min="30"
                        max="180"
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="forcePartialWeek"
                        checked={generationSettings.forcePartialWeek}
                        onChange={(e) => setGenerationSettings(prev => ({
                          ...prev,
                          forcePartialWeek: e.target.checked
                        }))}
                        className="rounded border-slate-300"
                      />
                      <label htmlFor="forcePartialWeek" className="text-sm text-slate-700">
                        Force partial week generation
                      </label>
                    </div>
                    
                    <Button
                      onClick={handleGeneratePlan}
                      disabled={isGenerating || accounts.length === 0 || groups.length === 0 || templates.length === 0}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : accounts.length === 0 || groups.length === 0 || templates.length === 0 ? (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Import Data First
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Generate Plan
                        </>
                      )}
                    </Button>
                    
                    {isGenerating && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-600">
                          <span>Progress</span>
                          <span>{generationProgress}%</span>
                        </div>
                        <Progress value={generationProgress} className="h-2" />
                      </div>
                    )}

                    {accounts.length === 0 || groups.length === 0 || templates.length === 0 ? (
                      <div className="text-sm text-slate-600 text-center">
                        <p className="mb-2">To generate a plan, you need to import:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {accounts.length === 0 && <li>Facebook accounts (in Database tab)</li>}
                          {groups.length === 0 && <li>Facebook groups (in Database tab)</li>}
                          {templates.length === 0 && <li>Text templates (in Database tab)</li>}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Tasks</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalTasks}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completedTasks}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pending</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.pendingTasks}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Joining</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.joiningTasks}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{stats.failedTasks}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Progress */}
        {(() => {
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
          const mappedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday (0) to 7, keep others
          const todayTasks = getTasksForDay(mappedDay > 5 ? 1 : mappedDay); // If weekend, show Monday
          const completedCount = todayTasks.filter(task =>
            task.status === 'completed' || task.status === 'joining' || task.status === 'failed'
          ).length;
          const pendingCount = todayTasks.filter(task => task.status === 'pending').length;
          const totalToday = todayTasks.length;

          return totalToday > 0 ? (
            <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span>Today's Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Completion Rate</span>
                    <span className="font-medium">
                      {Math.round((completedCount / totalToday) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(completedCount / totalToday) * 100}
                    className="h-3"
                  />
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{completedCount} done</span>
                    <span>{pendingCount} pending</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null;
        })()}

        {/* Progress Overview */}
        {stats.totalTasks > 0 && (
          <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Weekly Progress</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Completion Rate</span>
                  <span className="font-medium">
                    {Math.round((stats.completedTasks / stats.totalTasks) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(stats.completedTasks / stats.totalTasks) * 100} 
                  className="h-3"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{stats.groupsUsed}</div>
                    <div className="text-slate-600">Groups Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{stats.accountsUsed}</div>
                    <div className="text-slate-600">Accounts Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {plan ? new Date(plan.weekStartDate).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="text-slate-600">Week Start</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {plan ? new Date(plan.weekEndDate).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="text-slate-600">Week End</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {plan && (
          <div className="flex flex-wrap gap-4 mb-8">
            <Button 
              variant="outline" 
              onClick={handleClearPlan}
              className="bg-white/70 backdrop-blur-sm border-slate-200 hover:bg-white/90"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Plan
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setActiveTab('database')}
              className="bg-white/70 backdrop-blur-sm border-slate-200 hover:bg-white/90"
            >
              <Globe className="w-4 h-4 mr-2" />
              Manage Data
            </Button>
          </div>
        )}


        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/70 backdrop-blur-sm border border-slate-200 p-1">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="database"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Activity className="w-4 h-4 mr-2" />
              Database
            </TabsTrigger>
            <TabsTrigger
              value="accounts"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Accounts
            </TabsTrigger>
            <TabsTrigger
              value="media"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Media
            </TabsTrigger>
            <TabsTrigger
              value="groups"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Groups
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-slate-600">Loading tasks...</span>
              </div>
            ) : tasks.length === 0 ? (
              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full mb-4">
                    <Calendar className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Weekly Plan</h3>
                  <p className="text-slate-600 text-center mb-4">
                    Generate your first weekly posting plan to get started with automated group posting.
                  </p>
                  <Button
                    onClick={() => {
                      const dialogTrigger = document.getElementById('new-plan-button') as HTMLElement;
                      dialogTrigger?.click();
                    }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Plan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Weekly Calendar View with Tabs */}
                <Tabs defaultValue="1" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 bg-white/70 backdrop-blur-sm border border-slate-200">
                    {[1, 2, 3, 4, 5].map(dayOfWeek => {
                      const dayTasks = getTasksForDay(dayOfWeek);
                      const isFullyCompleted = isDayFullyCompleted(dayOfWeek);
                      return (
                        <TabsTrigger
                          key={dayOfWeek}
                          value={dayOfWeek.toString()}
                          className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white ${
                            isFullyCompleted
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-300 shadow-md'
                              : ''
                          }`}
                        >
                          <div className="flex flex-col items-center relative">
                            <span className="text-sm font-medium">{getDayName(dayOfWeek).slice(0, 3)}</span>
                            <span className="text-xs">{dayTasks.length}</span>
                            {isFullyCompleted && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                                <span className="text-xs text-black font-bold">✓</span>
                              </div>
                            )}
                          </div>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {[1, 2, 3, 4, 5].map(dayOfWeek => {
                    const dayTasks = getTasksForDay(dayOfWeek);
                    const isFullyCompleted = isDayFullyCompleted(dayOfWeek);
                    return (
                      <TabsContent key={dayOfWeek} value={dayOfWeek.toString()} className="mt-6">
                        <Card className={`bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg ${
                          isFullyCompleted ? 'ring-2 ring-green-300 bg-green-50/70' : ''
                        }`}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-xl flex items-center space-x-2">
                              <Calendar className="w-6 h-6 text-blue-600" />
                              <span>{getDayName(dayOfWeek)}</span>
                              {isFullyCompleted && (
                                <div className="flex items-center space-x-1 ml-2">
                                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-sm font-medium text-green-700">All Done!</span>
                                </div>
                              )}
                            </CardTitle>
                            <CardDescription className="text-base">
                              {dayTasks.length} tasks scheduled
                              {isFullyCompleted && (
                                <span className="ml-2 text-green-600 font-medium">
                                  • All tasks completed
                                </span>
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {dayTasks.length === 0 ? (
                              <div className="text-center py-8 text-slate-500">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                <p>No tasks scheduled for {getDayName(dayOfWeek)}</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {dayTasks.map(task => (
                                  <div
                                    key={task.id}
                                    className={`group p-4 rounded-lg border transition-all hover:shadow-md ${
                                      task.status === 'completed' ? 'bg-green-50 border-green-200' :
                                      task.status === 'failed' ? 'bg-red-50 border-red-200' :
                                      task.status === 'joining' ? 'bg-purple-50 border-purple-200' :
                                      'bg-blue-50 border-blue-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center space-x-3">
                                        {getStatusIcon(task.status)}
                                        <span className="text-lg font-medium">
                                          {new Date(task.scheduledTime).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      <Badge className={`${getStatusColor(task.status)} text-sm px-3 py-1`}>
                                        {task.status}
                                      </Badge>
                                    </div>

                                    <div className="space-y-3">
                                      <div>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2 text-sm">
                                            <Users className="w-4 h-4 text-slate-500" />
                                            <span className="font-medium text-slate-900" title={task.groupName}>{task.groupName}</span>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                              navigator.clipboard.writeText(task.groupUrl);
                                            }}
                                            title="Copy group URL"
                                          >
                                            <Clipboard className="w-3 h-3" />
                                          </Button>
                                        </div>
                                        <div className="text-sm text-slate-600 ml-6">
                                          {task.groupMemberCount.toLocaleString()} members
                                        </div>
                                      </div>
 
                                      <div className="flex items-center space-x-2 text-sm">
                                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                                          <span className="text-xs text-white font-bold">F</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-700 font-medium">{task.accountName}</span>
                                          {task.accountBrowser && (
                                            <span className="text-slate-500 text-xs ml-2">({task.accountBrowser})</span>
                                          )}
                                        </div>
                                      </div>
 
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2 text-sm flex-1 min-w-0">
                                          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                          <span className="text-slate-700 truncate">{task.textTitle}</span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                          onClick={() => {
                                            navigator.clipboard.writeText(task.textContent);
                                          }}
                                          title="Copy text content"
                                        >
                                          <Clipboard className="w-3 h-3" />
                                        </Button>
                                      </div>
 
                                      {task.imageFilename && (
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2 text-sm flex-1 min-w-0">
                                            <ImageIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                            <span className="text-slate-700 truncate">{task.imageFilename}</span>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                            onClick={() => {
                                              navigator.clipboard.writeText(task.imageUrl || '');
                                            }}
                                            title="Copy image URL"
                                          >
                                            <Clipboard className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>

                                    {task.status === 'pending' && (
                                      <div className="flex space-x-3 mt-4">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleTaskStatusUpdate(task.id, 'completed')}
                                          className="flex-1"
                                        >
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Mark Done
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleTaskStatusUpdate(task.id, 'joining')}
                                          className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                        >
                                          <UserPlus className="w-4 h-4 mr-2" />
                                          Joining
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleTaskStatusUpdate(task.id, 'failed')}
                                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                        >
                                          <X className="w-4 h-4 mr-2" />
                                          Mark Failed
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>
            )}

          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Accounts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-slate-900">{accounts.length}</div>
                      <div className="text-sm text-slate-600">Available</div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={loadAccounts} 
                      disabled={loadingAccounts}
                      className="w-full"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loadingAccounts ? 'animate-spin' : ''}`} />
                      Refresh Accounts
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-green-600" />
                    <span>Groups</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-slate-900">{groups.length}</div>
                      <div className="text-sm text-slate-600">Available</div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={loadGroups} 
                      disabled={loadingGroups}
                      className="w-full"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loadingGroups ? 'animate-spin' : ''}`} />
                      Refresh Groups
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200" onClick={() => setActiveTab('media')}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ImageIcon className="w-5 h-5 text-purple-600" />
                    <span>Media</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-slate-900">{media.length}</div>
                      <div className="text-sm text-slate-600">Available</div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadMedia();
                      }}
                      disabled={loadingMedia}
                      className="w-full"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loadingMedia ? 'animate-spin' : ''}`} />
                      Refresh Media
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200" onClick={() => setActiveTab('templates')}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span>Templates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-slate-900">{templates.length}</div>
                      <div className="text-sm text-slate-600">Available</div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTemplates();
                      }}
                      disabled={loadingTemplates}
                      className="w-full"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loadingTemplates ? 'animate-spin' : ''}`} />
                      Refresh Templates
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center">
              <Button 
                onClick={loadDatabaseData}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Load All Data
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            {/* Accounts Management Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-slate-900">Facebook Accounts</h2>
                <Badge variant="outline" className="text-slate-600">
                  {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="flex items-center space-x-2">
                {selectedAccounts.size > 0 && (
                  <Button
                    variant="outline"
                    onClick={deleteSelectedAccounts}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedAccounts.size})
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllAccounts}
                  className="text-slate-600"
                >
                  {selectedAccounts.size === accounts.length ? (
                    <CheckSquare className="w-4 h-4 mr-2" />
                  ) : (
                    <Square className="w-4 h-4 mr-2" />
                  )}
                  {selectedAccounts.size === accounts.length ? 'Deselect All' : 'Select All'}
                </Button>

                <Button
                  variant="outline"
                  onClick={loadAccounts}
                  disabled={loadingAccounts}
                  className="bg-white/70 backdrop-blur-sm border-slate-200 hover:bg-white/90"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingAccounts ? 'animate-spin' : ''}`} />
                  Refresh Accounts
                </Button>
              </div>
            </div>

            {/* Accounts Grid */}
            {loadingAccounts ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-slate-600">Loading accounts...</span>
              </div>
            ) : accounts.length === 0 ? (
              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full mb-4">
                    <UserCheck className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Accounts Found</h3>
                  <p className="text-slate-600 text-center mb-4">
                    Import your Facebook accounts to get started with automated posting.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map((account) => (
                  <Card key={account.id} className="group relative bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    {/* Selection Checkbox */}
                    <div className="absolute top-4 left-4 z-10">
                      <Checkbox
                        checked={selectedAccounts.has(account.id!)}
                        onCheckedChange={() => toggleAccountSelection(account.id!)}
                        className="bg-white/90 backdrop-blur-sm border-slate-300"
                      />
                    </div>

                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between pl-8">
                        <div className="flex items-center space-x-2">
                          {account.profileImage ? (
                            <img
                              src={account.profileImage}
                              alt={account.name}
                              className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling!.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center ${account.profileImage ? 'hidden' : ''}`}>
                            <span className="text-sm text-white font-bold">F</span>
                          </div>
                          <span className="truncate" title={account.name}>{account.name}</span>
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingAccount(account);
                              setNewAccountName(account.name);
                              setNewAccountId(account.accountId);
                              setNewAccountStatus(account.status);
                              setNewAccountBrowser(account.browser || '');
                              setNewAccountImage(account.profileImage || '');
                              setEditAccountDialogOpen(true);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription className="pl-8">
                        Browser: {account.browser || 'Default'} • Status: {account.status}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-8">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Account ID: {account.accountId}</span>
                          <span>Created: {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                        {account.notes && (
                          <div className="text-sm text-slate-700">
                            <p className="line-clamp-2" title={account.notes}>{account.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Edit Account Dialog */}
            <Dialog open={editAccountDialogOpen} onOpenChange={setEditAccountDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Edit className="w-5 h-5 text-blue-600" />
                    <span>Edit Facebook Account</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="account-name">Account Name *</Label>
                      <Input
                        id="account-name"
                        value={newAccountName}
                        onChange={(e) => setNewAccountName(e.target.value)}
                        placeholder="Enter account name..."
                        className="mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="account-id">Account ID *</Label>
                      <Input
                        id="account-id"
                        value={newAccountId}
                        onChange={(e) => setNewAccountId(e.target.value)}
                        placeholder="Enter Facebook account ID..."
                        className="mt-1"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="account-status">Status</Label>
                      <Select value={newAccountStatus} onValueChange={(value: 'active' | 'limited' | 'banned') => setNewAccountStatus(value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="limited">Limited</SelectItem>
                          <SelectItem value="banned">Banned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="account-browser">Browser</Label>
                      <Select value={newAccountBrowser || "default"} onValueChange={(value) => setNewAccountBrowser(value === "default" ? "" : value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select browser" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="aloha">Aloha</SelectItem>
                          <SelectItem value="Avast">Avast</SelectItem>
                          <SelectItem value="Brave">Brave</SelectItem>
                          <SelectItem value="Duck">Duck</SelectItem>
                          <SelectItem value="midori">Midori</SelectItem>
                          <SelectItem value="Pale">Pale</SelectItem>
                          <SelectItem value="phebe">Phebe</SelectItem>
                          <SelectItem value="Srware">Srware</SelectItem>
                          <SelectItem value="Vivaldi">Vivaldi</SelectItem>
                          <SelectItem value="waterfox">Waterfox</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="account-image">Profile Image URL (Optional)</Label>
                    <Input
                      id="account-image"
                      value={newAccountImage}
                      onChange={(e) => setNewAccountImage(e.target.value)}
                      placeholder="https://example.com/profile-image.jpg"
                      className="mt-1"
                    />
                    {newAccountImage && (
                      <div className="mt-2">
                        <img
                          src={newAccountImage}
                          alt="Profile preview"
                          className="w-16 h-16 rounded-full object-cover border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditAccountDialogOpen(false);
                        setEditingAccount(null);
                        setNewAccountName('');
                        setNewAccountId('');
                        setNewAccountStatus('active');
                        setNewAccountBrowser('');
                        setNewAccountImage('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEditAccount}
                      disabled={!newAccountName.trim() || !newAccountId.trim()}
                    >
                      Update Account
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            {/* Media Management Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-slate-900">Media Library</h2>
                <Badge variant="outline" className="text-slate-600">
                  {filteredMedia.length} image{filteredMedia.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Images
                </Button>
                
                {selectedMedia.size > 0 && (
                  <Button
                    variant="outline"
                    onClick={deleteSelectedMedia}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedMedia.size})
                  </Button>
                )}
              </div>
            </div>

            {/* Search and View Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search images..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllMedia}
                  className="text-slate-600"
                >
                  {selectedMedia.size === filteredMedia.length ? (
                    <CheckSquare className="w-4 h-4 mr-2" />
                  ) : (
                    <Square className="w-4 h-4 mr-2" />
                  )}
                  {selectedMedia.size === filteredMedia.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Media Grid/List */}
            {loadingMedia ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-slate-600">Loading media...</span>
              </div>
            ) : filteredMedia.length === 0 ? (
              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full mb-4">
                    <ImageIcon className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Images Found</h3>
                  <p className="text-slate-600 text-center mb-4">
                    {searchTerm ? 'No images match your search criteria.' : 'Upload your first images to get started.'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Images
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4' 
                : 'space-y-2'
              }>
                {filteredMedia.map((mediaItem) => (
                  <div
                    key={mediaItem.id}
                    className={`group relative bg-white/70 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${
                      viewMode === 'list' ? 'flex items-center space-x-4 p-4' : 'aspect-square'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedMedia.has(mediaItem.id)}
                        onCheckedChange={() => toggleMediaSelection(mediaItem.id)}
                        className="bg-white/90 backdrop-blur-sm border-slate-300"
                      />
                    </div>

                    {/* Upload Progress */}
                    {mediaItem.uploading && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-20">
                        <div className="text-center">
                          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                          <div className="text-sm text-slate-600">
                            {uploadProgress[mediaItem.id] || 0}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Image Container */}
                    <div className={`relative ${viewMode === 'list' ? 'w-16 h-16 flex-shrink-0' : 'w-full h-full'}`}>
                      {mediaItem.url ? (
                        <img
                          src={mediaItem.url}
                          alt={mediaItem.name}
                          className={`w-full h-full object-cover rounded-t-lg ${
                            viewMode === 'list' ? 'rounded-lg' : 'rounded-t-lg'
                          }`}
                        />
                      ) : (
                        <div className={`w-full h-full bg-slate-100 rounded-t-lg flex items-center justify-center ${
                          viewMode === 'list' ? 'rounded-lg' : 'rounded-t-lg'
                        }`}>
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Media Info */}
                    <div className={`${viewMode === 'list' ? 'flex-1 min-w-0' : 'p-3'}`}>
                      <h4 className="font-medium text-slate-900 truncate text-sm" title={mediaItem.name}>
                        {mediaItem.name}
                      </h4>
                      {mediaItem.fileSize && (
                        <p className="text-xs text-slate-500 mt-1">
                          {(mediaItem.fileSize / 1024 / 1024).toFixed(1)} MB
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm"
                        onClick={() => {
                          setEditingMedia(mediaItem);
                          setNewMediaName(mediaItem.name);
                          setRenameDialogOpen(true);
                        }}
                        disabled={mediaItem.uploading}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            replaceMedia(mediaItem.id, e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        id={`replace-${mediaItem.id}`}
                      />
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm"
                        onClick={() => document.getElementById(`replace-${mediaItem.id}`)?.click()}
                        disabled={mediaItem.uploading}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this image?')) {
                            setSelectedMedia(new Set([mediaItem.id]));
                            deleteSelectedMedia();
                          }
                        }}
                        disabled={mediaItem.uploading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rename Dialog */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Rename Image</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="media-name">New Name</Label>
                    <Input
                      id="media-name"
                      value={newMediaName}
                      onChange={(e) => setNewMediaName(e.target.value)}
                      placeholder="Enter new name..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setRenameDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={renameMedia}
                      disabled={!newMediaName.trim()}
                    >
                      Rename
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            {/* Groups Management Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-slate-900">Groups Library</h2>
                <Badge variant="outline" className="text-slate-600">
                  {groups.length} group{groups.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="flex items-center space-x-2">
                {selectedGroups.size > 0 && (
                  <Button
                    variant="outline"
                    onClick={deleteSelectedGroups}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedGroups.size})
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllGroups}
                  className="text-slate-600"
                >
                  {selectedGroups.size === groups.length ? (
                    <CheckSquare className="w-4 h-4 mr-2" />
                  ) : (
                    <Square className="w-4 h-4 mr-2" />
                  )}
                  {selectedGroups.size === groups.length ? 'Deselect All' : 'Select All'}
                </Button>

                <Button
                  variant="outline"
                  onClick={loadGroups}
                  disabled={loadingGroups}
                  className="bg-white/70 backdrop-blur-sm border-slate-200 hover:bg-white/90"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingGroups ? 'animate-spin' : ''}`} />
                  Refresh Groups
                </Button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleGroupImport(e.target.files[0]);
                    }
                  }}
                  accept=".json"
                  className="hidden"
                  id="group-import"
                />

                <Button
                  onClick={() => document.getElementById('group-import')?.click()}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Groups
                </Button>
              </div>
            </div>

            {/* Groups Grid */}
            {loadingGroups ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-slate-600">Loading groups...</span>
              </div>
            ) : groups.length === 0 ? (
              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full mb-4">
                    <Users className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Groups Found</h3>
                  <p className="text-slate-600 text-center mb-4">
                    Import your Facebook groups to get started with automated posting.
                  </p>
                  <Button
                    onClick={() => document.getElementById('group-import')?.click()}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Groups
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <Card key={group.id} className="group relative bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    {/* Selection Checkbox */}
                    <div className="absolute top-4 left-4 z-10">
                      <Checkbox
                        checked={selectedGroups.has(group.id!)}
                        onCheckedChange={() => toggleGroupSelection(group.id!)}
                        className="bg-white/90 backdrop-blur-sm border-slate-300"
                      />
                    </div>

                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between pl-8">
                        <div className="flex items-center space-x-2">
                          <Users className="w-5 h-5 text-green-600" />
                          <span className="truncate" title={group.name}>{truncateText(group.name)}</span>
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Edit button clicked for group:', group.name);
                              if (onEditGroup) {
                                onEditGroup({
                                  id: group.id,
                                  name: group.name,
                                  url: group.url,
                                  memberCount: group.memberCount,
                                  language: group.language,
                                  accountId: group.accountId
                                });
                              }
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this group?')) {
                                setSelectedGroups(new Set([group.id!]));
                                deleteSelectedGroups();
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription className="pl-8">
                        {group.memberCount?.toLocaleString() || 'Unknown'} members • Language: {group.language || 'Unknown'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-8">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Warnings: {group.warningCount || 0}</span>
                          <span>Created: {group.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                        {group.url && (
                          <div className="text-xs text-blue-600 truncate">
                            <a href={group.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {group.url}
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            {/* Templates Management Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-slate-900">Templates Library</h2>
                <Badge variant="outline" className="text-slate-600">
                  {templates.length} template{templates.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="flex items-center space-x-2">
                {selectedTemplates.size > 0 && (
                  <Button
                    variant="outline"
                    onClick={deleteSelectedTemplates}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedTemplates.size})
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllTemplates}
                  className="text-slate-600"
                >
                  {selectedTemplates.size === templates.length ? (
                    <CheckSquare className="w-4 h-4 mr-2" />
                  ) : (
                    <Square className="w-4 h-4 mr-2" />
                  )}
                  {selectedTemplates.size === templates.length ? 'Deselect All' : 'Select All'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const templateData = [{
                      title: "Sample Template Title",
                      body: "Sample template content goes here..."
                    }];
                    const dataStr = JSON.stringify(templateData, null, 2);
                    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                    const exportFileDefaultName = 'templates-template.json';
                    const linkElement = document.createElement('a');
                    linkElement.setAttribute('href', dataUri);
                    linkElement.setAttribute('download', exportFileDefaultName);
                    linkElement.click();
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleTemplateImport(e.target.files[0]);
                    }
                  }}
                  accept=".json,.csv"
                  className="hidden"
                  id="template-import"
                />

                <Button
                  onClick={() => document.getElementById('template-import')?.click()}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Templates
                </Button>

                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span>Add New Template</span>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="template-title">Template Title</Label>
                        <Input
                          id="template-title"
                          value={newTemplateTitle}
                          onChange={(e) => setNewTemplateTitle(e.target.value)}
                          placeholder="Enter template title..."
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="template-body">Template Content</Label>
                        <Textarea
                          id="template-body"
                          value={newTemplateBody}
                          onChange={(e) => setNewTemplateBody(e.target.value)}
                          placeholder="Enter template content..."
                          className="mt-1 min-h-[200px]"
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setNewTemplateTitle('');
                            setNewTemplateBody('');
                          }}
                          type="button"
                        >
                          Clear
                        </Button>
                        <Button
                          onClick={handleAddTemplate}
                          disabled={!newTemplateTitle.trim() || !newTemplateBody.trim()}
                        >
                          Create Template
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Templates Grid */}
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-slate-600">Loading templates...</span>
              </div>
            ) : templates.length === 0 ? (
              <Card className="bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full mb-4">
                    <FileText className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Found</h3>
                  <p className="text-slate-600 text-center mb-4">
                    Create your first template to get started with automated posting.
                  </p>
                  <Button
                    onClick={() => {
                      const dialogTrigger = document.querySelector('[data-radix-dialog-trigger]') as HTMLElement;
                      dialogTrigger?.click();
                    }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <Card key={template.id} className="group relative bg-white/70 backdrop-blur-sm border-slate-200 shadow-lg hover:shadow-xl transition-all duration-200">
                    {/* Selection Checkbox */}
                    <div className="absolute top-4 left-4 z-10">
                      <Checkbox
                        checked={selectedTemplates.has(template.id!)}
                        onCheckedChange={() => toggleTemplateSelection(template.id!)}
                        className="bg-white/90 backdrop-blur-sm border-slate-300"
                      />
                    </div>

                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between pl-8">
                        <span className="truncate" title={template.title}>{template.title}</span>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingTemplate(template);
                              setNewTemplateTitle(template.title);
                              setNewTemplateBody(template.body);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this template?')) {
                                handleDeleteTemplate(template.id!);
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardTitle>
                      <CardDescription className="pl-8">
                        Created {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'Recently'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-8">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-slate-700 line-clamp-4" title={template.body}>
                            {template.body}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{template.body.length} characters</span>
                          <span>{template.body.split('\n').length} lines</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Edit Template Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Edit className="w-5 h-5 text-blue-600" />
                    <span>Edit Template</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-template-title">Template Title</Label>
                    <Input
                      id="edit-template-title"
                      value={newTemplateTitle}
                      onChange={(e) => setNewTemplateTitle(e.target.value)}
                      placeholder="Enter template title..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-template-body">Template Content</Label>
                    <Textarea
                      id="edit-template-body"
                      value={newTemplateBody}
                      onChange={(e) => setNewTemplateBody(e.target.value)}
                      placeholder="Enter template content..."
                      className="mt-1 min-h-[200px]"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditDialogOpen(false);
                        setEditingTemplate(null);
                        setNewTemplateTitle('');
                        setNewTemplateBody('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEditTemplate}
                      disabled={!newTemplateTitle.trim() || !newTemplateBody.trim()}
                    >
                      Update Template
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

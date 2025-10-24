// User types
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'operator';
  createdAt: Date;
}

// Account types
export interface FacebookAccount {
  id?: string;
  name: string;
  accountId: string;
  profileImage?: string;
  status: 'active' | 'limited' | 'banned';
  browser?: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// Group types
export interface FacebookGroup {
  id?: string;
  name: string;
  url: string;
  tags: string[];
  language: string;
  lastPostAt?: Date;
  warningCount: number;
  accountId?: string; // Link to Facebook account
  createdAt: Date;
  updatedAt: Date;
  // Enhanced group state for cross-account awareness
  assigned_accounts?: string[];
  last_post_times?: Date[];
  global_daily_count?: number;
  initial_ramp_until?: Date;
  recent_combinations?: GroupContentCombination[];
}

// Content combination tracking for duplicate prevention
export interface GroupContentCombination {
  text_variant_id: string;
  media_ids: string[];
  timestamp: Date;
  account_id: string;
}

// Template types
export interface Template {
  id?: string;
  title: string;
  body: string;
  placeholders: string[];
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Enhanced template features
  text_variants?: TextVariant[];
  min_media?: number;
  max_media?: number;
  media_bundle_ids?: string[];
  last_modified_at?: Date;
  usage_history?: TemplateUsage[];
}

// Text variant for templates
export interface TextVariant {
  id: string;
  content: string;
  placeholders: string[];
  usage_count: number;
  created_at: Date;
}

// Template usage tracking
export interface TemplateUsage {
  group_id: string;
  account_id: string;
  timestamp: Date;
  text_variant_id?: string;
  media_ids?: string[];
}

// Media types
export interface Media {
  id?: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  category: string;
  uploadedAt: Date;
  uploadedBy: string;
  size?: number;
}

// Task types
export interface Task {
  id?: string;
  date: Date;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  groupId: string;
  accountId: string;
  templateId: string;
  content?: string;
  doneAt?: Date;
  notes?: string;
  createdAt: Date;
  // Enhanced task features
  media_ids?: string[];
  text_variant_id?: string;
  claimed_at?: Date;
  claimed_by?: string;
}

// Post History types
export interface PostHistory {
  id?: string;
  timestamp: Date;
  accountId: string;
  groupId: string;
  templateUsed?: string;
  content: string;
  notes?: string;
  operatorId: string;
}

// Settings types
export interface Settings {
  maxPostsPerHour: number;
  cooldownMinutes: number;
  backupLastRun?: Date;
  updatedBy: string;
  updatedAt: Date;
  // Enhanced scheduling configuration
  scheduling?: EnhancedSchedulingConfig;
  // Browser configuration
  browsers?: string[];
  // Phone detection configuration
  phoneDetection?: PhoneDetectionConfig;
}

export interface PhoneDetectionConfig {
  countryRules: {
    [country: string]: {
      cc: string;
      prefixes: string[];
      nsnLength: { min: number; max: number };
    };
  };
}

// Enhanced scheduling configuration
export interface EnhancedSchedulingConfig {
  enabled: boolean;
  postsPerDay: number;
  startHour: number;
  endHour: number;
  minIntervalMinutes: number;
  maxGroupsPerAccount: number;
  autoGenerate: boolean;
  lastGeneration?: Date;
  // New configuration options
  global_group_cooldown_hours?: number;
  max_group_posts_per_24h?: number;
  cross_account_spacing_minutes?: number;
  duplicate_content_window_days?: number;
  baseline_min_interval?: number;
  interval_variation_pct?: number;
  group_usage_threshold?: number;
  usage_window_days?: number;
  global_usage_threshold?: number;
  global_window_days?: number;
  staleness_days?: number;
  initial_ramp_delay_hours?: number;
  ramp_week1_max_posts?: number;
  ramp_week2_max_posts?: number;
}

// Form types for creating/editing
export interface CreateAccountData {
  name: string;
  accountId: string;
  profileImage?: string;
  status: 'active' | 'limited' | 'banned';
  browser?: string;
  notes: string;
}

export interface CreateGroupData {
  name: string;
  url: string;
  tags: string[];
  language: string;
  accountId?: string;
}

export interface CreateTemplateData {
  title: string;
  body: string;
  placeholders: string[];
}

export interface CreateTaskData {
  date: Date;
  assignedTo: string;
  groupId: string;
  accountId: string;
  templateId: string;
  notes?: string;
}

export interface CreateMediaData {
  name: string;
  category: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Filter and pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

// Import/Export types
export interface ImportResult {
  added: number;
  skipped: number;
  updated: number;
  errors: string[];
  details: ImportDetail[];
}

export interface ImportDetail {
  fb_group_id: string;
  action: 'added' | 'skipped' | 'updated' | 'error';
  message?: string;
  account_id?: string;
}

// Notification types
export interface NotificationRule {
  id: string;
  type: 'group_usage' | 'global_usage' | 'staleness' | 'duplicate_reuse';
  threshold?: number;
  window_days?: number;
  enabled: boolean;
  created_at: Date;
}

export interface Notification {
  id?: string;
  type: 'warning' | 'info' | 'error';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: Date;
  expires_at?: Date;
}

// Media bundle types
export interface MediaBundle {
  id?: string;
  name: string;
  description?: string;
  media_ids: string[];
  category: string;
  created_by: string;
  created_at: Date;
}
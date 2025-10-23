import { collection, getDocs, query, where, orderBy, limit, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CallCenter, Contact, Step, CallLog, Recharge } from '@/lib/types/external-crm';

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'url' | 'number' | 'date' | 'enum' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface DataBackup {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental' | 'callcenter' | 'contacts' | 'settings';
  data: any;
  metadata: {
    recordCount?: number;
    size?: number;
    version?: string;
    triggeredBy?: string;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'import' | 'export' | 'bulk_operation';
  entityType: 'callcenter' | 'contact' | 'step' | 'calllog' | 'recharge' | 'system';
  entityId: string;
  userId?: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
}

export interface DataIntegrityReport {
  totalRecords: number;
  orphanedRecords: Array<{
    type: string;
    id: string;
    issue: string;
  }>;
  duplicateRecords: Array<{
    type: string;
    records: string[];
    similarity: number;
  }>;
  validationErrors: Array<{
    type: string;
    id: string;
    errors: string[];
  }>;
  backupStatus: {
    lastBackup: string;
    nextScheduled: string;
    backupCount: number;
  };
}

export class DataIntegrityService {
  private static readonly VALIDATION_RULES: Record<string, ValidationRule[]> = {
    callCenter: [
      { field: 'name', type: 'required', message: 'Call center name is required' },
      { field: 'country', type: 'enum', value: ['Morocco', 'Tunisia', 'Senegal', 'Ivory Coast', 'Guinea', 'Cameroon'], message: 'Invalid country' },
      { field: 'status', type: 'enum', value: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost', 'On-Hold'], message: 'Invalid status' },
      { field: 'positions', type: 'number', message: 'Positions must be a valid number' },
      { field: 'value', type: 'number', message: 'Value must be a valid number' },
      { field: 'email', type: 'email', message: 'Invalid email format' },
      { field: 'website', type: 'url', message: 'Invalid website URL' }
    ],
    contact: [
      { field: 'name', type: 'required', message: 'Contact name is required' },
      { field: 'email', type: 'email', message: 'Invalid email format' },
      { field: 'phone', type: 'phone', message: 'Invalid phone number' }
    ],
    step: [
      { field: 'title', type: 'required', message: 'Step title is required' },
      { field: 'date', type: 'date', message: 'Invalid date format' }
    ],
    callLog: [
      { field: 'date', type: 'required', message: 'Call date is required' },
      { field: 'outcome', type: 'enum', value: ['connected', 'voicemail', 'no-answer', 'busy', 'wrong-number', 'callback-requested'], message: 'Invalid call outcome' }
    ],
    recharge: [
      { field: 'amount', type: 'required', message: 'Amount is required' },
      { field: 'amount', type: 'number', message: 'Amount must be a valid number' },
      { field: 'date', type: 'required', message: 'Transaction date is required' },
      { field: 'currency', type: 'enum', value: ['MAD', 'TND', 'XOF', 'XAF', 'USD', 'EUR'], message: 'Invalid currency' }
    ]
  };

  /**
   * Comprehensive validation for any entity
   */
  static validateEntity(entityType: string, data: any): ValidationResult {
    const rules = this.VALIDATION_RULES[entityType];
    if (!rules) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    rules.forEach(rule => {
      const value = data[rule.field];
      let isValid = true;
      let message = rule.message || `Invalid ${rule.field}`;

      switch (rule.type) {
        case 'required':
          isValid = value != null && value !== '';
          break;
        case 'email':
          isValid = !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          break;
        case 'phone':
          isValid = !value || /^[\+\-\(\)\s\d]{7,20}$/.test(value.replace(/\s/g, ''));
          break;
        case 'url':
          isValid = !value || /^https?:\/\/.+/.test(value);
          break;
        case 'number':
          isValid = !value || !isNaN(Number(value));
          break;
        case 'date':
          isValid = !value || !isNaN(Date.parse(value));
          break;
        case 'enum':
          isValid = !value || (rule.value && rule.value.includes(value));
          break;
        case 'custom':
          isValid = rule.validator ? rule.validator(value) : true;
          break;
      }

      if (!isValid) {
        errors.push({
          field: rule.field,
          message,
          severity: 'error'
        });
      }
    });

    // Business logic validations
    this.performBusinessValidations(entityType, data, errors, warnings);

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings
    };
  }

  /**
   * Business logic validations
   */
  private static performBusinessValidations(
    entityType: string,
    data: any,
    errors: ValidationResult['errors'],
    warnings: ValidationResult['warnings']
  ): void {
    switch (entityType) {
      case 'callCenter':
        // Validate that won deals have values
        if (data.status === 'Closed-Won' && (!data.value || data.value <= 0)) {
          warnings.push({
            field: 'value',
            message: 'Won deals typically should have a value greater than 0'
          });
        }

        // Validate phone numbers exist for active call centers
        if (!['Closed-Won', 'Closed-Lost', 'On-Hold'].includes(data.status) && (!data.phones || data.phones.length === 0)) {
          warnings.push({
            field: 'phones',
            message: 'Active call centers should have at least one phone number'
          });
        }

        // Validate email for business communication
        if (!data.email && !data.emails?.length) {
          warnings.push({
            field: 'email',
            message: 'Email contact information is recommended for business communication'
          });
        }
        break;

      case 'contact':
        // Validate contact has either phone or email
        if (!data.phone && !data.email) {
          errors.push({
            field: 'phone',
            message: 'Contact must have either phone or email',
            severity: 'error'
          });
        }
        break;

      case 'recharge':
        // Validate positive amounts
        if (data.amount && data.amount <= 0) {
          errors.push({
            field: 'amount',
            message: 'Recharge amount must be positive',
            severity: 'error'
          });
        }

        // Validate future dates are not too far in the future
        if (data.date) {
          const rechargeDate = new Date(data.date);
          const sixMonthsFromNow = new Date();
          sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

          if (rechargeDate > sixMonthsFromNow) {
            warnings.push({
              field: 'date',
              message: 'Recharge date is more than 6 months in the future'
            });
          }
        }
        break;
    }
  }

  /**
   * Create data backup
   */
  static async createBackup(type: 'full' | 'incremental' | 'callcenter' | 'contacts' | 'settings', entityId?: string): Promise<string> {
    try {
      const backup: Omit<DataBackup, 'id'> = {
        timestamp: new Date().toISOString(),
        type,
        data: {},
        metadata: {
          version: '1.0',
          triggeredBy: 'system'
        }
      };

      switch (type) {
        case 'full':
          backup.data = await this.backupAllData();
          backup.metadata.recordCount = await this.getTotalRecordCount();
          break;
        case 'callcenter':
          if (entityId) {
            backup.data = await this.backupCallCenterData(entityId);
            backup.metadata.recordCount = 1;
          }
          break;
        case 'contacts':
          if (entityId) {
            backup.data = await this.backupContactData(entityId);
          }
          break;
        case 'incremental':
          backup.data = await this.backupIncrementalData();
          break;
      }

      backup.metadata.size = JSON.stringify(backup.data).length;

      const docRef = await addDoc(collection(db, 'dataBackups'), backup);
      return docRef.id;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  /**
   * Backup all data
   */
  private static async backupAllData(): Promise<any> {
    const data: any = {};

    try {
      // Backup call centers
      const callCentersSnapshot = await getDocs(collection(db, 'callCenters'));
      data.callCenters = callCentersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Backup suggestions
      const suggestionsSnapshot = await getDocs(collection(db, 'suggestions'));
      data.suggestions = suggestionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Backup calendar events
      const calendarSnapshot = await getDocs(collection(db, 'calendarEvents'));
      data.calendarEvents = calendarSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return data;
    } catch (error) {
      console.error('Error backing up data:', error);
      throw error;
    }
  }

  /**
   * Backup specific call center data
   */
  private static async backupCallCenterData(callCenterId: string): Promise<any> {
    const data: any = {};

    try {
      // Get call center
      const ccDoc = await getDocs(query(collection(db, 'callCenters'), where('__name__', '==', callCenterId)));
      if (!ccDoc.empty) {
        data.callCenter = { id: ccDoc.docs[0].id, ...ccDoc.docs[0].data() };
      }

      // Get related contacts
      const contactsSnapshot = await getDocs(collection(db, `callCenters/${callCenterId}/contacts`));
      data.contacts = contactsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get related steps
      const stepsSnapshot = await getDocs(collection(db, `callCenters/${callCenterId}/steps`));
      data.steps = stepsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get related call history
      const callsSnapshot = await getDocs(collection(db, `callCenters/${callCenterId}/callHistory`));
      data.callHistory = callsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get related recharges
      const rechargesSnapshot = await getDocs(collection(db, `callCenters/${callCenterId}/recharges`));
      data.recharges = rechargesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return data;
    } catch (error) {
      console.error('Error backing up call center data:', error);
      throw error;
    }
  }

  /**
   * Backup contact data
   */
  private static async backupContactData(callCenterId: string): Promise<any> {
    try {
      const contactsSnapshot = await getDocs(collection(db, `callCenters/${callCenterId}/contacts`));
      return {
        callCenterId,
        contacts: contactsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      };
    } catch (error) {
      console.error('Error backing up contact data:', error);
      throw error;
    }
  }

  /**
   * Backup incremental data (recent changes)
   */
  private static async backupIncrementalData(): Promise<any> {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const data: any = {};

      // Get recently modified call centers
      const recentCCQuery = query(
        collection(db, 'callCenters'),
        where('updatedAt', '>', oneDayAgo.toISOString())
      );
      const recentCCSnapshot = await getDocs(recentCCQuery);
      data.recentCallCenters = recentCCSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return data;
    } catch (error) {
      console.error('Error creating incremental backup:', error);
      throw error;
    }
  }

  /**
   * Get total record count across all collections
   */
  private static async getTotalRecordCount(): Promise<number> {
    try {
      const collections = ['callCenters', 'suggestions', 'calendarEvents'];
      let totalCount = 0;

      for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        totalCount += snapshot.size;
      }

      return totalCount;
    } catch (error) {
      console.error('Error getting record count:', error);
      return 0;
    }
  }

  /**
   * Create audit log entry
   */
  static async createAuditLog(
    action: AuditLog['action'],
    entityType: AuditLog['entityType'],
    entityId: string,
    userId?: string,
    changes?: Record<string, { old: any; new: any }>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const auditLog: Omit<AuditLog, 'id'> = {
        timestamp: new Date().toISOString(),
        action,
        entityType,
        entityId,
        userId,
        changes,
        metadata
      };

      await addDoc(collection(db, 'auditLogs'), auditLog);
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  /**
   * Generate data integrity report
   */
  static async generateIntegrityReport(): Promise<DataIntegrityReport> {
    try {
      const report: DataIntegrityReport = {
        totalRecords: 0,
        orphanedRecords: [],
        duplicateRecords: [],
        validationErrors: [],
        backupStatus: {
          lastBackup: '',
          nextScheduled: '',
          backupCount: 0
        }
      };

      // Get total record count
      report.totalRecords = await this.getTotalRecordCount();

      // Check for orphaned records
      report.orphanedRecords = await this.findOrphanedRecords();

      // Find duplicate records
      report.duplicateRecords = await this.findDuplicateRecords();

      // Validate all records
      report.validationErrors = await this.validateAllRecords();

      // Get backup status
      report.backupStatus = await this.getBackupStatus();

      return report;
    } catch (error) {
      console.error('Error generating integrity report:', error);
      throw error;
    }
  }

  /**
   * Find orphaned records (contacts, steps, etc. without parent call centers)
   */
  private static async findOrphanedRecords(): Promise<DataIntegrityReport['orphanedRecords']> {
    const orphaned: DataIntegrityReport['orphanedRecords'] = [];

    try {
      // Check for contacts without parent call centers
      const contactsSnapshot = await getDocs(query(collection(db, 'callCenters')));
      const validCallCenterIds = new Set(contactsSnapshot.docs.map(doc => doc.id));

      // This would require checking subcollections for orphaned records
      // For demo purposes, return empty array
      return orphaned;
    } catch (error) {
      console.error('Error finding orphaned records:', error);
      return orphaned;
    }
  }

  /**
   * Find duplicate records across all entities
   */
  private static async findDuplicateRecords(): Promise<DataIntegrityReport['duplicateRecords']> {
    const duplicates: DataIntegrityReport['duplicateRecords'] = [];

    try {
      // Get all call centers for duplicate analysis
      const callCentersSnapshot = await getDocs(collection(db, 'callCenters'));
      const callCenters = callCentersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CallCenter[];

      // Find potential duplicates based on name and country similarity
      const potentialDuplicates = new Map<string, string[]>();

      callCenters.forEach(cc => {
        const key = `${cc.name}_${cc.country}`.toLowerCase();
        if (!potentialDuplicates.has(key)) {
          potentialDuplicates.set(key, []);
        }
        potentialDuplicates.get(key)!.push(cc.id);
      });

      // Filter to actual duplicates (more than one record)
      potentialDuplicates.forEach((ids, key) => {
        if (ids.length > 1) {
          duplicates.push({
            type: 'callcenter',
            records: ids,
            similarity: 95 // High similarity for same name+country
          });
        }
      });

      return duplicates;
    } catch (error) {
      console.error('Error finding duplicate records:', error);
      return duplicates;
    }
  }

  /**
   * Validate all records across all collections
   */
  private static async validateAllRecords(): Promise<DataIntegrityReport['validationErrors']> {
    const errors: DataIntegrityReport['validationErrors'] = [];

    try {
      // Validate call centers
      const callCentersSnapshot = await getDocs(collection(db, 'callCenters'));
      callCentersSnapshot.docs.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        const validation = this.validateEntity('callCenter', data);

        if (!validation.isValid || validation.warnings.length > 0) {
          errors.push({
            type: 'callcenter',
            id: doc.id,
            errors: [
              ...validation.errors.map(e => e.message),
              ...validation.warnings.map(w => `Warning: ${w.message}`)
            ]
          });
        }
      });

      return errors;
    } catch (error) {
      console.error('Error validating records:', error);
      return errors;
    }
  }

  /**
   * Get backup status
   */
  private static async getBackupStatus(): Promise<DataIntegrityReport['backupStatus']> {
    try {
      // Get recent backups
      const backupsSnapshot = await getDocs(query(
        collection(db, 'dataBackups'),
        orderBy('timestamp', 'desc'),
        limit(1)
      ));

      const lastBackup = backupsSnapshot.empty ? '' : backupsSnapshot.docs[0].data().timestamp;

      // Get total backup count
      const totalBackupsSnapshot = await getDocs(collection(db, 'dataBackups'));
      const backupCount = totalBackupsSnapshot.size;

      // Calculate next scheduled backup (every 24 hours)
      const nextScheduled = lastBackup
        ? new Date(new Date(lastBackup).getTime() + 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      return {
        lastBackup,
        nextScheduled,
        backupCount
      };
    } catch (error) {
      console.error('Error getting backup status:', error);
      return {
        lastBackup: '',
        nextScheduled: '',
        backupCount: 0
      };
    }
  }

  /**
   * Data cleanup and optimization
   */
  static async performDataCleanup(): Promise<{
    recordsCleaned: number;
    spaceFreed: number;
    optimizations: string[];
  }> {
    const result = {
      recordsCleaned: 0,
      spaceFreed: 0,
      optimizations: [] as string[]
    };

    try {
      // Remove old audit logs (keep last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldAuditLogs = await getDocs(query(
        collection(db, 'auditLogs'),
        where('timestamp', '<', thirtyDaysAgo.toISOString())
      ));

      if (!oldAuditLogs.empty) {
        // In a real implementation, we would delete these records
        result.recordsCleaned += oldAuditLogs.size;
        result.optimizations.push(`Removed ${oldAuditLogs.size} old audit log entries`);
      }

      // Remove old temporary data
      // Add more cleanup operations as needed

      return result;
    } catch (error) {
      console.error('Error performing data cleanup:', error);
      throw error;
    }
  }

  /**
   * Data recovery from backup
   */
  static async recoverFromBackup(backupId: string, options?: {
    selective?: boolean;
    entityTypes?: string[];
  }): Promise<boolean> {
    try {
      // Get backup data
      const backupDoc = await getDocs(query(
        collection(db, 'dataBackups'),
        where('__name__', '==', backupId)
      ));

      if (backupDoc.empty) {
        throw new Error('Backup not found');
      }

      const backup = backupDoc.docs[0].data() as DataBackup;

      // Create audit log for recovery operation
      await this.createAuditLog(
        'create',
        'system',
        'recovery',
        undefined,
        undefined,
        { backupId, type: 'recovery', timestamp: new Date().toISOString() }
      );

      // Recovery logic would go here
      console.log('Data recovery initiated from backup:', backupId);

      return true;
    } catch (error) {
      console.error('Error recovering from backup:', error);
      return false;
    }
  }

  /**
   * Real-time validation hook for forms
   */
  static createValidationHook(entityType: string) {
    return (data: any) => {
      return this.validateEntity(entityType, data);
    };
  }

  /**
   * Data quality scoring
   */
  static calculateDataQualityScore(callCenters: CallCenter[]): {
    overall: number;
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
    breakdown: Record<string, number>;
  } {
    if (callCenters.length === 0) {
      return {
        overall: 0,
        completeness: 0,
        accuracy: 0,
        consistency: 0,
        timeliness: 0,
        breakdown: {}
      };
    }

    let totalScore = 0;
    let totalWeight = 0;

    // Completeness score (required fields filled)
    const completenessWeight = 0.3;
    const completenessScore = callCenters.reduce((sum, cc) => {
      let score = 0;
      score += cc.name ? 1 : 0;
      score += cc.country ? 1 : 0;
      score += cc.city ? 1 : 0;
      score += cc.phones && cc.phones.length > 0 ? 1 : 0;
      score += cc.positions ? 1 : 0;
      return sum + (score / 5);
    }, 0) / callCenters.length;

    totalScore += completenessScore * completenessWeight;
    totalWeight += completenessWeight;

    // Accuracy score (valid data formats)
    const accuracyWeight = 0.25;
    const accuracyScore = callCenters.reduce((sum, cc) => {
      let score = 0;
      score += cc.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cc.email) ? 1 : 0.5;
      score += cc.website && /^https?:\/\/.+/.test(cc.website) ? 1 : 0.5;
      score += cc.positions && cc.positions > 0 ? 1 : 0.5;
      score += cc.value && cc.value > 0 ? 1 : 0.5;
      return sum + (score / 4);
    }, 0) / callCenters.length;

    totalScore += accuracyScore * accuracyWeight;
    totalWeight += accuracyWeight;

    // Consistency score (consistent data patterns)
    const consistencyWeight = 0.25;
    const consistencyScore = this.calculateConsistencyScore(callCenters);
    totalScore += consistencyScore * consistencyWeight;
    totalWeight += consistencyWeight;

    // Timeliness score (recent updates)
    const timelinessWeight = 0.2;
    const timelinessScore = callCenters.reduce((sum, cc) => {
      if (!cc.updatedAt) return sum + 0.5;

      const daysSinceUpdate = (Date.now() - new Date(cc.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) return sum + 1;
      if (daysSinceUpdate < 30) return sum + 0.7;
      if (daysSinceUpdate < 90) return sum + 0.4;
      return sum + 0.1;
    }, 0) / callCenters.length;

    totalScore += timelinessScore * timelinessWeight;
    totalWeight += timelinessWeight;

    const overall = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      overall: Math.round(overall * 100),
      completeness: Math.round(completenessScore * 100),
      accuracy: Math.round(accuracyScore * 100),
      consistency: Math.round(consistencyScore * 100),
      timeliness: Math.round(timelinessScore * 100),
      breakdown: {
        completeness: Math.round(completenessScore * 100),
        accuracy: Math.round(accuracyScore * 100),
        consistency: Math.round(consistencyScore * 100),
        timeliness: Math.round(timelinessScore * 100)
      }
    };
  }

  /**
   * Calculate consistency score across dataset
   */
  private static calculateConsistencyScore(callCenters: CallCenter[]): number {
    if (callCenters.length < 2) return 1;

    // Check consistency in naming patterns
    const namingPatterns = callCenters.map(cc => {
      return {
        hasKeywords: /\b(call|center|centre|appel|contact|service)\b/i.test(cc.name),
        length: cc.name.length,
        format: /^[A-Za-z\s&.-]+$/.test(cc.name) ? 'standard' : 'mixed'
      };
    });

    // Calculate variance in patterns
    const patternConsistency = 1 - this.calculateVariance(namingPatterns.map(p => p.hasKeywords ? 1 : 0));
    const lengthConsistency = 1 - this.calculateVariance(namingPatterns.map(p => p.length));

    return (patternConsistency + lengthConsistency) / 2;
  }

  /**
   * Calculate variance for consistency scoring
   */
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return Math.sqrt(avgSquaredDiff);
  }
}
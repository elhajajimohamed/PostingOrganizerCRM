import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Template, CreateTemplateData, TextVariant, TemplateUsage } from '@/lib/types';

const COLLECTION_NAME = 'textsVOIP';

export class TemplateService {
  // Get all templates
  static async getAllTemplates(): Promise<Template[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Template[];
    } catch (error) {
      console.error('Error getting templates:', error);
      throw new Error('Failed to fetch templates');
    }
  }

  // Get template by ID
  static async getTemplateById(templateId: string): Promise<Template | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, templateId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Template;
      }
      return null;
    } catch (error) {
      console.error('Error getting template:', error);
      throw new Error('Failed to fetch template');
    }
  }

  // Create new template
  static async createTemplate(templateData: CreateTemplateData, createdBy: string): Promise<string> {
    try {
      const newTemplate = {
        ...templateData,
        usageCount: 0,
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newTemplate);
      return docRef.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error('Failed to create template');
    }
  }

  // Update template
  static async updateTemplate(templateId: string, templateData: Partial<CreateTemplateData>): Promise<void> {
    try {
      const updateData = {
        ...templateData,
        updatedAt: serverTimestamp(),
      };

      const templateRef = doc(db, COLLECTION_NAME, templateId);
      await updateDoc(templateRef, updateData);
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error('Failed to update template');
    }
  }

  // Delete template
  static async deleteTemplate(templateId: string): Promise<void> {
    try {
      const templateRef = doc(db, COLLECTION_NAME, templateId);
      await deleteDoc(templateRef);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error('Failed to delete template');
    }
  }

  // Increment usage count
  static async incrementUsageCount(templateId: string): Promise<void> {
    try {
      const templateRef = doc(db, COLLECTION_NAME, templateId);
      await updateDoc(templateRef, {
        usageCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error incrementing usage count:', error);
      throw new Error('Failed to update usage count');
    }
  }

  // Get templates by creator
  static async getTemplatesByCreator(createdBy: string): Promise<Template[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('createdBy', '==', createdBy),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Template[];
    } catch (error) {
      console.error('Error getting templates by creator:', error);
      throw new Error('Failed to fetch templates by creator');
    }
  }

  // Get most used templates
  static async getMostUsedTemplates(limitCount: number = 10): Promise<Template[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('usageCount', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Template[];
    } catch (error) {
      console.error('Error getting most used templates:', error);
      throw new Error('Failed to fetch most used templates');
    }
  }

  // Search templates by title or body
  static async searchTemplates(searchTerm: string): Promise<Template[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const templates = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Template[];

      // Filter templates that match the search term
      return templates.filter(template =>
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.body.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching templates:', error);
      throw new Error('Failed to search templates');
    }
  }

  // Extract placeholders from template body
  static extractPlaceholders(body: string): string[] {
    const placeholderRegex = /\{([^}]+)\}/g;
    const matches = body.match(placeholderRegex);
    if (!matches) return [];

    return [...new Set(matches.map(match => match.replace(/[{}]/g, '')))];
  }

  // Replace placeholders in template body
  static replacePlaceholders(body: string, values: Record<string, string>): string {
    let result = body;
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  }

  // Add text variant to template
  static async addTextVariant(
    templateId: string,
    content: string,
    placeholders: string[]
  ): Promise<string> {
    try {
      const variantId = `variant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const textVariant: TextVariant = {
        id: variantId,
        content,
        placeholders,
        usage_count: 0,
        created_at: new Date(),
      };

      const templateRef = doc(db, COLLECTION_NAME, templateId);
      await updateDoc(templateRef, {
        text_variants: arrayUnion(textVariant),
        updatedAt: serverTimestamp(),
      });

      return variantId;
    } catch (error) {
      console.error('Error adding text variant:', error);
      throw new Error('Failed to add text variant');
    }
  }

  // Remove text variant from template
  static async removeTextVariant(templateId: string, variantId: string): Promise<void> {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      const updatedVariants = template.text_variants?.filter(v => v.id !== variantId) || [];

      const templateRef = doc(db, COLLECTION_NAME, templateId);
      await updateDoc(templateRef, {
        text_variants: updatedVariants,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error removing text variant:', error);
      throw new Error('Failed to remove text variant');
    }
  }

  // Update text variant usage count
  static async incrementTextVariantUsage(templateId: string, variantId: string): Promise<void> {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      const updatedVariants = template.text_variants?.map(variant => {
        if (variant.id === variantId) {
          return { ...variant, usage_count: variant.usage_count + 1 };
        }
        return variant;
      }) || [];

      const templateRef = doc(db, COLLECTION_NAME, templateId);
      await updateDoc(templateRef, {
        text_variants: updatedVariants,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error incrementing text variant usage:', error);
      throw new Error('Failed to update text variant usage');
    }
  }

  // Update template media requirements
  static async updateTemplateMediaRequirements(
    templateId: string,
    minMedia?: number,
    maxMedia?: number,
    mediaBundleIds?: string[]
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };

      if (minMedia !== undefined) updateData.min_media = minMedia;
      if (maxMedia !== undefined) updateData.max_media = maxMedia;
      if (mediaBundleIds !== undefined) updateData.media_bundle_ids = mediaBundleIds;

      const templateRef = doc(db, COLLECTION_NAME, templateId);
      await updateDoc(templateRef, updateData);
    } catch (error) {
      console.error('Error updating template media requirements:', error);
      throw new Error('Failed to update template media requirements');
    }
  }

  // Record template usage for tracking
  static async recordTemplateUsage(
    templateId: string,
    groupId: string,
    accountId: string,
    textVariantId?: string,
    mediaIds?: string[]
  ): Promise<void> {
    try {
      const usage: TemplateUsage = {
        group_id: groupId,
        account_id: accountId,
        timestamp: new Date(),
        text_variant_id: textVariantId,
        media_ids: mediaIds,
      };

      const templateRef = doc(db, COLLECTION_NAME, templateId);
      await updateDoc(templateRef, {
        usage_history: arrayUnion(usage),
        updatedAt: serverTimestamp(),
      });

      // Also increment overall usage count
      await this.incrementUsageCount(templateId);

      // Increment text variant usage if specified
      if (textVariantId) {
        await this.incrementTextVariantUsage(templateId, textVariantId);
      }
    } catch (error) {
      console.error('Error recording template usage:', error);
      throw new Error('Failed to record template usage');
    }
  }

  // Get template usage statistics
  static async getTemplateUsageStats(templateId: string): Promise<{
    totalUsage: number;
    variantUsage: Record<string, number>;
    recentUsage: TemplateUsage[];
    lastModified: Date;
  }> {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      const variantUsage: Record<string, number> = {};
      template.text_variants?.forEach(variant => {
        variantUsage[variant.id] = variant.usage_count;
      });

      return {
        totalUsage: template.usageCount,
        variantUsage,
        recentUsage: template.usage_history || [],
        lastModified: template.last_modified_at || template.updatedAt,
      };
    } catch (error) {
      console.error('Error getting template usage stats:', error);
      throw new Error('Failed to get template usage statistics');
    }
  }

  // Get templates that need creative refresh (staleness detection)
  static async getStaleTemplates(stalenessDays: number = 21): Promise<Template[]> {
    try {
      const cutoffDate = new Date(Date.now() - (stalenessDays * 24 * 60 * 60 * 1000));

      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const templates = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        last_modified_at: doc.data().last_modified_at?.toDate(),
      })) as Template[];

      return templates.filter(template => {
        const checkDate = template.last_modified_at || template.updatedAt;
        return checkDate < cutoffDate;
      });
    } catch (error) {
      console.error('Error getting stale templates:', error);
      throw new Error('Failed to get stale templates');
    }
  }

  // Create enhanced template with variants and media requirements
  static async createEnhancedTemplate(
    templateData: CreateTemplateData & {
      textVariants?: Omit<TextVariant, 'id' | 'usage_count' | 'created_at'>[];
      minMedia?: number;
      maxMedia?: number;
      mediaBundleIds?: string[];
    },
    createdBy: string
  ): Promise<string> {
    try {
      const textVariants: TextVariant[] = (templateData.textVariants || []).map(variant => ({
        id: `variant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        usage_count: 0,
        created_at: new Date(),
        ...variant,
      }));

      const newTemplate = {
        ...templateData,
        text_variants: textVariants,
        min_media: templateData.minMedia,
        max_media: templateData.maxMedia,
        media_bundle_ids: templateData.mediaBundleIds,
        usageCount: 0,
        usage_history: [],
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        last_modified_at: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newTemplate);
      return docRef.id;
    } catch (error) {
      console.error('Error creating enhanced template:', error);
      throw new Error('Failed to create enhanced template');
    }
  }
}
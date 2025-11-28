import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
} from 'firebase/storage';
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
  serverTimestamp,
} from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { Media, CreateMediaData } from '@/lib/types';

const COLLECTION_NAME = 'imagesVOIP';

export class MediaService {
  // Get all media files
  static async getAllMedia(): Promise<Media[]> {
    try {
      console.log('🔍 [MediaService] getAllMedia called');
      console.log('📊 [MediaService] Collection name:', COLLECTION_NAME);
      
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );

      console.log('🔍 [MediaService] Executing query...');
      const querySnapshot = await getDocs(q);
      console.log('📊 [MediaService] Found documents:', querySnapshot.size);
      console.log('📄 [MediaService] Raw document data:', querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
      
      const result = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`📋 [MediaService] Processing document ${doc.id}:`, data);
        
        const mappedData = {
          id: doc.id,
          name: data.filename || data.name, // Map filename to name
          url: data.url,
          type: data.isActive === true ? 'image' : 'video', // Map isActive to type
          category: data.category || 'General', // Default category if missing
          uploadedBy: data.uploadedBy || 'unknown',
          size: data.size,
          uploadedAt: data.createdAt?.toDate() || data.uploadedAt?.toDate(), // Map createdAt to uploadedAt
        };
        
        console.log(`✅ [MediaService] Mapped data for ${doc.id}:`, mappedData);
        return mappedData as Media;
      });
      
      console.log('🎯 [MediaService] Final result:', result);
      return result;
    } catch (error) {
      console.error('❌ [MediaService] Error getting media:', error);
      throw new Error('Failed to fetch media');
    }
  }

  // Get media by ID
  static async getMediaById(mediaId: string): Promise<Media | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, mediaId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          uploadedAt: data.uploadedAt?.toDate(),
        } as Media;
      }
      return null;
    } catch (error) {
      console.error('Error getting media:', error);
      throw new Error('Failed to fetch media');
    }
  }

  // Upload file to Firebase Storage and create media record
  static async uploadMedia(
    file: File,
    category: string,
    uploadedBy: string
  ): Promise<string> {
    try {
      console.log('Starting Firebase Storage upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        category,
        uploadedBy
      });

      // Create unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const filename = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `media/${uploadedBy}/${filename}`);

      console.log('Storage reference:', storageRef.toString());

      // Upload file to Storage
      console.log('Uploading to Firebase Storage...');
      const snapshot = await uploadBytes(storageRef, file);
      console.log('Storage upload complete, getting download URL...');

      // Add a small delay to ensure the file is properly accessible
      await new Promise(resolve => setTimeout(resolve, 1000));

      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Download URL obtained:', downloadURL);

      // Validate the URL is accessible
      try {
        const response = await fetch(downloadURL, { method: 'HEAD' });
        if (!response.ok) {
          console.warn('Download URL may not be accessible:', response.status, response.statusText);
        }
      } catch (error) {
        console.warn('Could not validate download URL:', error);
      }

      // Get file metadata
      console.log('Getting file metadata...');
      const metadata = await getMetadata(snapshot.ref);
      console.log('Metadata obtained:', metadata);

      // Create media record in Firestore
      console.log('Creating Firestore record...');
      const mediaData = {
        name: file.name,
        url: downloadURL,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        category,
        uploadedBy,
        size: metadata.size,
        uploadedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), mediaData);
      console.log('Firestore record created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error uploading media:', error);
      const firebaseError = error as { code?: string; message?: string };
      console.error('Error code:', firebaseError.code);
      console.error('Error message:', firebaseError.message);

      // Provide more specific error messages
      if (firebaseError.code === 'storage/unauthorized') {
        throw new Error('Unauthorized: Please check Firebase Storage security rules and authentication');
      } else if (firebaseError.code === 'storage/canceled') {
        throw new Error('Upload canceled');
      } else if (firebaseError.code === 'storage/quota-exceeded') {
        throw new Error('Storage quota exceeded');
      } else if (firebaseError.code === 'storage/invalid-format') {
        throw new Error('Invalid file format');
      } else if (firebaseError.message?.includes('CORS')) {
        throw new Error('CORS error: Check Firebase Storage CORS configuration');
      } else {
        throw new Error(`Upload failed: ${firebaseError.message || 'Unknown error'}`);
      }
    }
  }

  // Update media metadata
  static async updateMedia(mediaId: string, updates: Partial<CreateMediaData>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        uploadedAt: serverTimestamp(),
      };

      const mediaRef = doc(db, COLLECTION_NAME, mediaId);
      await updateDoc(mediaRef, updateData);
    } catch (error) {
      console.error('Error updating media:', error);
      throw new Error('Failed to update media');
    }
  }

  // Delete media file and record
  static async deleteMedia(mediaId: string): Promise<void> {
    try {
      // Get media record first
      const media = await this.getMediaById(mediaId);
      if (!media) {
        throw new Error('Media not found');
      }

      // Delete file from Storage
      const storageRef = ref(storage, media.url);
      await deleteObject(storageRef);

      // Delete record from Firestore
      const mediaRef = doc(db, COLLECTION_NAME, mediaId);
      await deleteDoc(mediaRef);
    } catch (error) {
      console.error('Error deleting media:', error);
      throw new Error('Failed to delete media');
    }
  }

  // Get media by user
  static async getMediaByUser(uploadedBy: string): Promise<Media[]> {
    try {
      // First try with composite index (uploadedBy + uploadedAt)
      try {
        const q = query(
          collection(db, COLLECTION_NAME),
          where('uploadedBy', '==', uploadedBy),
          orderBy('uploadedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          uploadedAt: doc.data().uploadedAt?.toDate(),
        })) as Media[];
      } catch (indexError: any) {
        // If composite index error, fall back to client-side filtering
        if (indexError.message?.includes('index')) {
          console.warn('Composite index not found, falling back to client-side filtering');
          const allMedia = await this.getAllMedia();
          return allMedia.filter(media => media.uploadedBy === uploadedBy);
        }
        throw indexError;
      }
    } catch (error) {
      console.error('Error getting media by user:', error);
      throw new Error('Failed to fetch user media');
    }
  }

  // Get media by category
  static async getMediaByCategory(category: string): Promise<Media[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('category', '==', category),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
      })) as Media[];
    } catch (error) {
      console.error('Error getting media by category:', error);
      throw new Error('Failed to fetch media by category');
    }
  }

  // Get media by type
  static async getMediaByType(type: 'image' | 'video'): Promise<Media[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('type', '==', type),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
      })) as Media[];
    } catch (error) {
      console.error('Error getting media by type:', error);
      throw new Error('Failed to fetch media by type');
    }
  }

  // Search media by name
  static async searchMedia(searchTerm: string): Promise<Media[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('uploadedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const media = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate(),
      })) as Media[];

      // Filter media that match the search term
      return media.filter(m =>
        (m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.category && m.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    } catch (error) {
      console.error('Error searching media:', error);
      throw new Error('Failed to search media');
    }
  }

  // Get storage usage for user
  static async getUserStorageUsage(uploadedBy: string): Promise<number> {
    try {
      const userMedia = await this.getMediaByUser(uploadedBy);
      return userMedia.reduce((total, media) => total + (media.size || 0), 0);
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return 0;
    }
  }

  // Format file size for display
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Test Firebase Storage connection
  static async testStorageConnection(): Promise<boolean> {
    try {
      console.log('Testing Firebase Storage connection...');

      // Try to list files in the root (this will fail if storage doesn't exist)
      const rootRef = ref(storage, '/');
      await listAll(rootRef);
      console.log('✅ Firebase Storage is accessible');
      return true;
    } catch (error) {
      console.error('❌ Firebase Storage connection failed:', (error as Error).message);
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'storage/bucket-not-found') {
        console.error('Storage bucket does not exist. Please enable Firebase Storage in your Firebase project.');
        console.error('Go to Firebase Console > Storage > Get Started to enable Storage.');
      } else if (firebaseError.code === 'storage/unauthorized') {
        console.error('Storage exists but access is unauthorized. Check your security rules.');
        console.error('Current rules allow read access for all, but write requires authentication.');
      } else if (firebaseError.code === 'storage/cors-error') {
        console.error('CORS error: Firebase Storage CORS configuration issue.');
        console.error('This might be why images are showing as black.');
      }
      return false;
    }
  }

  // Test if a specific media URL is accessible
  static async testMediaUrl(url: string): Promise<boolean> {
    try {
      console.log('Testing media URL accessibility:', url);
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors'
      });
      console.log('URL test response:', response.status, response.statusText);
      return response.ok;
    } catch (error) {
      console.error('Media URL test failed:', error);
      return false;
    }
  }

  // Get authenticated download URL with token
  static async getAuthenticatedMediaUrl(url: string): Promise<string> {
    try {
      console.log('🔍 Checking media URL:', url);

      // If the URL already has a token, return as-is
      if (url.includes('token=')) {
        console.log('✅ URL already has token');
        return url;
      }

      // For Firebase Storage URLs, we need to ensure they have proper authentication
      console.log('🔄 Testing URL accessibility...');
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors'
      });

      console.log('📊 Response status:', response.status, response.statusText);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        console.log('✅ URL is accessible');
        return url;
      } else if (response.status === 401 || response.status === 403) {
        console.warn('🚫 Media URL requires authentication, attempting to refresh...');
        // Try to get a fresh download URL (this would require re-uploading or server-side handling)
        return url; // For now, return original URL
      } else if (response.status === 404) {
        console.error('❌ Media file not found at URL');
        return url;
      } else if (response.status === 403) {
        console.error('❌ Access forbidden - check Firebase Storage rules');
        return url;
      }

      return url;
    } catch (error) {
      console.error('💥 Failed to get authenticated media URL:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        url: url
      });
      return url; // Return original URL as fallback
    }
  }

  // Comprehensive media diagnostic function
  static async runMediaDiagnostics(): Promise<{
    storageConnection: boolean;
    sampleUrls: Array<{url: string, accessible: boolean, status?: number}>;
    firebaseConfig: any;
    recommendations: string[];
  }> {
    console.log('🔬 Running comprehensive media diagnostics...');

    const results = {
      storageConnection: false,
      sampleUrls: [] as Array<{url: string, accessible: boolean, status?: number}>,
      firebaseConfig: {
        apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      },
      recommendations: [] as string[]
    };

    // Test storage connection
    try {
      results.storageConnection = await this.testStorageConnection();
      console.log('Storage connection test:', results.storageConnection ? '✅ PASS' : '❌ FAIL');
    } catch (error) {
      console.error('Storage connection test failed:', error);
      results.recommendations.push('Fix Firebase Storage connection');
    }

    // Get sample media for testing
    try {
      const media = await this.getAllMedia();
      console.log(`Found ${media.length} media items for testing`);

      if (media.length > 0) {
        // Test first 3 URLs
        for (const item of media.slice(0, 3)) {
          try {
            const isAccessible = await this.testMediaUrl(item.url);
            results.sampleUrls.push({
              url: item.url,
              accessible: isAccessible,
              status: isAccessible ? 200 : undefined
            });

            if (!isAccessible) {
              results.recommendations.push(`Fix access to media: ${item.name}`);
            }
          } catch (error) {
            console.error(`Failed to test URL ${item.url}:`, error);
            results.sampleUrls.push({
              url: item.url,
              accessible: false
            });
          }
        }
      } else {
        results.recommendations.push('Upload some media files to test');
      }
    } catch (error) {
      console.error('Failed to get media for testing:', error);
      results.recommendations.push('Fix media fetching from Firestore');
    }

    // Generate recommendations
    if (!results.firebaseConfig.apiKey) {
      results.recommendations.push('Configure NEXT_PUBLIC_FIREBASE_API_KEY');
    }
    if (!results.firebaseConfig.projectId) {
      results.recommendations.push('Configure NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    }
    if (!results.firebaseConfig.storageBucket) {
      results.recommendations.push('Configure NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    }

    console.log('📋 Diagnostic Results:', results);

    // Additional CORS and configuration checks
    console.log('🔍 Checking Firebase Storage configuration...');
    console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    console.log('Storage Bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

    // Check if URLs have the correct format
    try {
      const mediaForFormatCheck = await this.getAllMedia();
      if (mediaForFormatCheck.length > 0) {
        const sampleUrl = mediaForFormatCheck[0].url;
        console.log('Sample URL format check:', {
          isFirebaseUrl: sampleUrl.includes('firebase'),
          isStorageUrl: sampleUrl.includes('storage'),
          hasToken: sampleUrl.includes('token='),
          bucket: sampleUrl.match(/https:\/\/([^.]+)\.firebasestorage\.app/)?.[1]
        });
      }
    } catch (error) {
      console.error('Failed to check URL format:', error);
    }

    return results;
  }

  // Get common categories
  static getCommonCategories(): string[] {
    return [
      'Profile Pictures',
      'Product Images',
      'Marketing Materials',
      'Memes',
      'Infographics',
      'Videos',
      'Stories',
      'Posts',
      'Covers',
      'Other'
    ];
  }
}
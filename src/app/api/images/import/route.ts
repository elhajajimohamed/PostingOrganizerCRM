import { NextRequest, NextResponse } from 'next/server';
import { MediaService } from '@/lib/services/media-service';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ImportImage {
  name: string;
  url?: string;
  description?: string;
  category?: string;
  tags?: string[];
  usageCount?: number;
  fileSize?: number;
  dimensions?: string;
  uploadedBy?: string;
}

interface ImportRequest {
  images: ImportImage[];
  targetAccountId?: string; // Optional for images
}

export async function POST(request: NextRequest) {
  try {
    console.log('🖼️ [IMAGES-IMPORT] Import request received');
    
    const body: ImportRequest = await request.json();
    const { images } = body;

    // Validate request
    if (!images || !Array.isArray(images) || images.length === 0) {
      console.error('❌ [IMAGES-IMPORT] Invalid images array');
      return NextResponse.json(
        { error: 'Invalid images array provided' },
        { status: 400 }
      );
    }

    console.log(`📊 [IMAGES-IMPORT] Processing ${images.length} images`);

    // Get existing images to check for duplicates
    const existingImages = await MediaService.getAllMedia();
    const existingNames = new Set(existingImages.map(i => i.name.toLowerCase()).filter(Boolean));
    
    // Track duplicates within the current import list
    const importedNames = new Set<string>();

    const results = {
      imported: 0,
      failed: 0,
      total: images.length,
      errors: [] as Array<{ imageName: string; error: string }>,
      duplicates: 0,
      message: `Successfully processed ${images.length} images`
    };

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      
      try {
        // Validate required fields
        if (!imageData.name || imageData.name.trim() === '') {
          results.failed++;
          results.errors.push({
            imageName: `Image ${i + 1}`,
            error: 'Image name is required'
          });
          continue;
        }

        const name = imageData.name.trim();
        const url = imageData.url?.trim() || '';
        const description = imageData.description?.trim() || '';
        const category = imageData.category?.trim() || '';
        const tags = imageData.tags || [];
        const usageCount = imageData.usageCount || 0;
        const fileSize = imageData.fileSize || 0;
        const dimensions = imageData.dimensions?.trim() || '';
        const uploadedBy = imageData.uploadedBy?.trim() || 'import';

        // Check for duplicates within the current import list
        const isDuplicate = existingNames.has(name.toLowerCase()) ||
                           importedNames.has(name.toLowerCase());
        
        if (isDuplicate) {
          results.duplicates++;
          console.log(`⚠️ [IMAGES-IMPORT] Duplicate detected: ${name}`);
          continue;
        }

        // Prepare image data for Firebase (matching Media interface)
        const newImage = {
          name,
          url,
          type: 'image', // Default type for imported images
          category,
          uploadedBy,
          size: fileSize,
          uploadedAt: new Date().toISOString(),
          description,
          tags: [...tags, 'imported'],
          usageCount,
          dimensions
        };

        // Create image in Firebase using direct Firestore access
        const docRef = await addDoc(collection(db, 'imagesVOIP'), newImage);
        
        if (docRef.id) {
          results.imported++;
          // Update local set for duplicate detection within this import batch
          importedNames.add(name.toLowerCase());
          
          console.log(`✅ [IMAGES-IMPORT] Image imported: ${name} (ID: ${docRef.id})`);
        } else {
          results.failed++;
          results.errors.push({
            imageName: name,
            error: 'Failed to save image to database'
          });
        }

      } catch (imageError) {
        console.error(`❌ [IMAGES-IMPORT] Error processing image ${i + 1}:`, imageError);
        results.failed++;
        results.errors.push({
          imageName: `Image ${i + 1}`,
          error: imageError instanceof Error ? imageError.message : 'Unknown error'
        });
      }
    }

    console.log(`📊 [IMAGES-IMPORT] Results: ${results.imported} imported, ${results.failed} failed, ${results.duplicates} duplicates`);

    // Return results
    return NextResponse.json(results);

  } catch (error) {
    console.error('💥 [IMAGES-IMPORT] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during import',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Images Import API - Use POST method to import images' },
    { status: 200 }
  );
}
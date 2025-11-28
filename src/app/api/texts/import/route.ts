import { NextRequest, NextResponse } from 'next/server';
import { TemplateService } from '@/lib/services/template-service';

interface ImportText {
  title: string;
  content: string;
  language?: string;
  category?: string;
  tags?: string[];
  usageCount?: number;
  createdBy?: string;
}

interface ImportRequest {
  texts: ImportText[];
  targetAccountId?: string; // Optional for texts
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 [TEXTS-IMPORT] Import request received');
    
    const body: ImportRequest = await request.json();
    const { texts } = body;

    // Validate request
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      console.error('❌ [TEXTS-IMPORT] Invalid texts array');
      return NextResponse.json(
        { error: 'Invalid texts array provided' },
        { status: 400 }
      );
    }

    console.log(`📊 [TEXTS-IMPORT] Processing ${texts.length} texts`);

    // Get existing texts to check for duplicates
    const existingTexts = await TemplateService.getAllTemplates();
    const existingTitles = new Set(existingTexts.map(t => t.title.toLowerCase()).filter(Boolean));
    
    // Track duplicates within the current import list
    const importedTitles = new Set<string>();

    const results = {
      imported: 0,
      failed: 0,
      total: texts.length,
      errors: [] as Array<{ textTitle: string; error: string }>,
      duplicates: 0,
      message: `Successfully processed ${texts.length} texts`
    };

    // Process each text
    for (let i = 0; i < texts.length; i++) {
      const textData = texts[i];
      
      try {
        // Validate required fields
        if (!textData.title || !textData.content || 
            textData.title.trim() === '' || textData.content.trim() === '') {
          results.failed++;
          results.errors.push({
            textTitle: `Text ${i + 1}`,
            error: 'Title and content are required'
          });
          continue;
        }

        const title = textData.title.trim();
        const content = textData.content.trim();
        const language = textData.language?.trim() || 'English';
        const category = textData.category?.trim() || '';
        const tags = textData.tags || [];
        const usageCount = textData.usageCount || 0;
        const createdBy = textData.createdBy?.trim() || 'import';

        // Check for duplicates within the current import list
        const isDuplicate = existingTitles.has(title.toLowerCase()) || 
                           importedTitles.has(title.toLowerCase());
        
        if (isDuplicate) {
          results.duplicates++;
          console.log(`⚠️ [TEXTS-IMPORT] Duplicate detected: ${title}`);
          continue;
        }

        // Prepare text data for Firebase
        const newText = {
          title,
          content,
          language,
          category,
          tags: [...tags, 'imported'],
          usageCount,
          createdBy,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Create text template in Firebase
        const textId = await TemplateService.createTemplate(newText);
        
        if (textId) {
          results.imported++;
          // Update local set for duplicate detection within this import batch
          importedTitles.add(title.toLowerCase());
          
          console.log(`✅ [TEXTS-IMPORT] Text imported: ${title} (ID: ${textId})`);
        } else {
          results.failed++;
          results.errors.push({
            textTitle: title,
            error: 'Failed to save text to database'
          });
        }

      } catch (textError) {
        console.error(`❌ [TEXTS-IMPORT] Error processing text ${i + 1}:`, textError);
        results.failed++;
        results.errors.push({
          textTitle: `Text ${i + 1}`,
          error: textError instanceof Error ? textError.message : 'Unknown error'
        });
      }
    }

    console.log(`📊 [TEXTS-IMPORT] Results: ${results.imported} imported, ${results.failed} failed, ${results.duplicates} duplicates`);

    // Return results
    return NextResponse.json(results);

  } catch (error) {
    console.error('💥 [TEXTS-IMPORT] Unexpected error:', error);
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
    { message: 'Text Templates Import API - Use POST method to import text templates' },
    { status: 200 }
  );
}
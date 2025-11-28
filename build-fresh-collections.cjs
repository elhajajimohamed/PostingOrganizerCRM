const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function buildFreshCollections() {
  console.log('🏗️ Building fresh Facebook CRM collections...\n');

  try {
    // Define our clean collection names
    const collections = {
      accounts: {
        name: 'accounts',
        description: 'Facebook accounts for posting',
        structure: {
          accountName: '',
          browserType: '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastUsed: null
        }
      },
      groups: {
        name: 'groups',
        description: 'Facebook groups for posting',
        structure: {
          name: '',
          url: '',
          memberCount: 0,
          language: 'ar',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastPostAt: null
        }
      },
      texts: {
        name: 'texts',
        description: 'Posting texts content',
        structure: {
          title: '',
          content: '',
          language: 'ar',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      images: {
        name: 'images',
        description: 'Posting images content',
        structure: {
          filename: '',
          url: '',
          altText: '',
          language: 'ar',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    };

    console.log('📋 Creating collection structure...\n');

    for (const [key, collection] of Object.entries(collections)) {
      console.log(`🔧 Creating collection: ${collection.name}`);
      console.log(`   Description: ${collection.description}`);
      
      // Test collection creation with a sample document
      try {
        const docRef = db.collection(collection.name).doc();
        await docRef.set({
          ...collection.structure,
          sample: true, // Mark as sample data to be removed later
          _sampleId: docRef.id // Track sample docs for cleanup
        });
        
        console.log(`   ✅ Collection '${collection.name}' created successfully`);
        
        // Remove the sample document immediately
        await docRef.delete();
        console.log(`   🧹 Sample document removed\n`);
        
      } catch (error) {
        console.log(`   ❌ Error creating collection '${collection.name}': ${error.message}\n`);
      }
    }

    console.log('🎯 COLLECTION STRUCTURE SUMMARY:');
    console.log('================================');
    
    for (const [key, collection] of Object.entries(collections)) {
      console.log(`${collection.name}:`);
      console.log(`  - Collection: ${collection.name}`);
      console.log(`  - Purpose: ${collection.description}`);
      console.log(`  - Fields:`);
      Object.entries(collection.structure).forEach(([field, defaultValue]) => {
        console.log(`    * ${field}: ${typeof defaultValue === 'object' ? 'Date' : typeof defaultValue}`);
      });
      console.log('');
    }

    console.log('✅ Fresh collections structure created!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Add your Facebook accounts to the "accounts" collection');
    console.log('2. Add your Facebook groups to the "groups" collection');
    console.log('3. Add your posting texts to the "texts" collection');
    console.log('4. Add your posting images to the "images" collection');
    console.log('\n🎯 Each collection is now ready for clean, unique data with no duplication!');

  } catch (error) {
    console.error('❌ Error building fresh collections:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the build process
buildFreshCollections().catch(console.error);
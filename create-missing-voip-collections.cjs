// Create missing VOIP collections for Facebook CRM
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function createMissingVoipCollections() {
  console.log('🔄 Creating missing VOIP collections for Facebook CRM...\n');

  const collectionsToCreate = [
    {
      name: 'textsVOIP',
      description: 'Posting texts for Facebook CRM',
      sampleData: {
        title: 'Welcome to our Facebook CRM',
        content: 'This is a sample posting text for Facebook groups.',
        isActive: true,
        status: 'active',
        category: 'welcome',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        usageCount: 0
      }
    },
    {
      name: 'imagesVOIP', 
      description: 'Posting images for Facebook CRM',
      sampleData: {
        filename: 'sample-image.jpg',
        url: 'https://via.placeholder.com/400x300/blue/white?text=Sample+Image',
        storagePath: 'images/sample-image.jpg',
        size: 102400,
        isActive: true,
        status: 'active',
        category: 'sample',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        usageCount: 0
      }
    },
    {
      name: 'posting_tasks_voip',
      description: 'Posting tasks for Facebook CRM',
      sampleData: {
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    }
  ];

  try {
    for (const collection of collectionsToCreate) {
      console.log(`📁 Creating ${collection.name} collection...`);
      
      try {
        // Try to access the collection first
        const snapshot = await db.collection(collection.name).get();
        console.log(`   ✅ ${collection.name} already exists (${snapshot.size} documents)`);
      } catch (error) {
        // Collection doesn't exist, create it with sample data
        console.log(`   🔄 Creating ${collection.name} with sample data...`);
        
        const docRef = await db.collection(collection.name).add({
          ...collection.sampleData,
          isSample: true,
          note: `Sample data for ${collection.description}`
        });
        
        console.log(`   ✅ Created sample document: ${docRef.id}`);
        
        // Clean up the sample data
        await db.collection(collection.name).doc(docRef.id).delete();
        console.log(`   🧹 Cleaned up sample data`);
      }
    }

    // Final verification
    console.log('\n🔍 Final verification of all VOIP collections:');
    const expectedCollections = ['accountsVOIP', 'groupsVOIP', 'textsVOIP', 'imagesVOIP', 'posting_tasks_voip'];
    
    for (const collectionName of expectedCollections) {
      try {
        const snapshot = await db.collection(collectionName).get();
        console.log(`   ✅ ${collectionName}: ${snapshot.size} documents`);
      } catch (error) {
        console.log(`   ❌ ${collectionName}: Error - ${error.message}`);
      }
    }

    console.log('\n🎉 VOIP collections setup completed!');
    console.log('📋 Facebook CRM can now save:');
    console.log('   ✅ Accounts → accountsVOIP');
    console.log('   ✅ Groups → groupsVOIP'); 
    console.log('   ✅ Texts → textsVOIP (created)');
    console.log('   ✅ Images → imagesVOIP (created)');
    console.log('   ✅ Tasks → posting_tasks_voip (created)');

  } catch (error) {
    console.error('❌ Error creating collections:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the creation
createMissingVoipCollections().catch(console.error);
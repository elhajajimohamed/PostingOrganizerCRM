// Script to create all VOIP collections with correct names
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function createAllVoipCollections() {
  console.log('🔄 Creating all VOIP collections with correct names...\n');

  const collectionsToCreate = [
    {
      name: 'groupsVOIP',
      description: 'Facebook Groups for VOIP system'
    },
    {
      name: 'facebook_accounts_voip', 
      description: 'Facebook Accounts for VOIP system'
    },
    {
      name: 'posting_texts_voip',
      description: 'Posting Texts for VOIP system'
    },
    {
      name: 'posting_images_voip',
      description: 'Posting Images for VOIP system'
    },
    {
      name: 'posting_tasks_voip',
      description: 'Posting Tasks for VOIP system'
    }
  ];

  try {
    for (const collection of collectionsToCreate) {
      console.log(`📁 Creating collection: ${collection.name}`);
      
      try {
        // Create a test document to initialize the collection
        const testDoc = {
          collectionName: collection.name,
          description: collection.description,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isTestDocument: true,
          status: 'initialized'
        };

        const docRef = await db.collection(collection.name).add(testDoc);
        console.log(`   ✅ Created test document: ${docRef.id}`);

        // Delete the test document to keep collection empty
        await db.collection(collection.name).doc(docRef.id).delete();
        console.log(`   🗑️ Removed test document`);

        // Verify the collection is accessible
        const verifySnapshot = await db.collection(collection.name).limit(1).get();
        console.log(`   ✅ Collection "${collection.name}" ready (${verifySnapshot.size} documents)`);

      } catch (error) {
        console.log(`   ❌ Failed to create ${collection.name}: ${error.message}`);
      }
      
      console.log(''); // Empty line for readability
    }

    // Final verification
    console.log('📊 Final verification:');
    const allCollections = await db.listCollections();
    for (const collection of collectionsToCreate) {
      const exists = allCollections.some(col => col.id === collection.name);
      console.log(`   ${collection.name}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }

    console.log('\n🎉 VOIP collections setup complete!');
    console.log('📋 Collections ready for Facebook CRM data:');
    collectionsToCreate.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.name}`);
    });

  } catch (error) {
    console.error('❌ Error creating collections:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the creation
createAllVoipCollections().catch(console.error);
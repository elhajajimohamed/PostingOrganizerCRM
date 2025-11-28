// Simple test to verify VOIP collections work for our code
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function testVoipCollections() {
  console.log('🧪 Testing VOIP collections for Facebook CRM...\n');

  const collections = [
    { name: 'groupsVOIP', service: 'GroupService' },
    { name: 'accountsVOIP', service: 'FacebookAccountService' },
    { name: 'textsVOIP', service: 'PostingTextService' },
    { name: 'imagesVOIP', service: 'PostingImageService' },
    { name: 'posting_tasks_voip', service: 'PostingTaskService' }
  ];

  let allWorking = true;

  try {
    for (const collection of collections) {
      console.log(`🔍 Testing ${collection.service} (${collection.name}):`);
      
      try {
        // Test basic operations that our code will use
        const snapshot = await db.collection(collection.name).limit(1).get();
        console.log(`   ✅ Collection accessible: ${collection.name}`);
        console.log(`   📊 Document count: ${snapshot.size}`);
        
        // Test if we can add a document (what our create methods do)
        const testDoc = {
          testOperation: true,
          service: collection.service,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          collectionName: collection.name
        };
        
        const docRef = await db.collection(collection.name).add(testDoc);
        console.log(`   ✅ Can create documents: ${docRef.id}`);
        
        // Clean up test document
        await db.collection(collection.name).doc(docRef.id).delete();
        console.log(`   ✅ Can delete documents`);
        
        console.log(`   🎉 ${collection.service} is ready!\n`);
        
      } catch (error) {
        console.log(`   ❌ ${collection.service} failed: ${error.message}`);
        allWorking = false;
        console.log('');
      }
    }

    if (allWorking) {
      console.log('🎉 SUCCESS: All VOIP collections are working correctly!');
      console.log('📋 Ready for Facebook CRM data:');
      collections.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.service} → ${col.name}`);
      });
      console.log('\n🚀 You can now add Facebook accounts, groups, texts, and images!');
    } else {
      console.log('❌ Some collections are not working properly.');
    }

  } catch (error) {
    console.error('❌ Error testing collections:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the test
testVoipCollections().catch(console.error);
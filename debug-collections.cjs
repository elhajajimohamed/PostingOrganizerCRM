// Script to debug and fix collection issues
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function debugAndFixCollections() {
  console.log('🔍 Debugging Firebase collections...\n');

  try {
    // Check what collections exist
    console.log('📊 Listing all collections in Firebase:');
    const collections = await db.listCollections();
    console.log('Found collections:');
    collections.forEach(collection => {
      console.log(`   - ${collection.id}`);
    });

    // Check for the specific collection name
    const targetCollection = 'groupsVOIP';
    console.log(`\n🔍 Checking for collection: "${targetCollection}"`);
    
    try {
      // Try to access the collection
      const snapshot = await db.collection(targetCollection).limit(1).get();
      console.log(`✅ Collection "${targetCollection}" exists and is accessible`);
      console.log(`📊 Document count: ${snapshot.size}`);
    } catch (error) {
      console.log(`❌ Collection "${targetCollection}" not accessible: ${error.message}`);
      
      // Try to create it
      console.log(`🔄 Attempting to create collection "${targetCollection}"...`);
      try {
        const docRef = await db.collection(targetCollection).doc('test-creation').set({
          created: true,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          collectionName: targetCollection
        });
        console.log(`✅ Created test document in "${targetCollection}"`);
        
        // Delete the test document
        await db.collection(targetCollection).doc('test-creation').delete();
        console.log(`🗑️ Removed test document`);
        
        // Verify it exists
        const verifySnapshot = await db.collection(targetCollection).limit(1).get();
        console.log(`✅ Collection "${targetCollection}" confirmed created and accessible`);
        
      } catch (createError) {
        console.log(`❌ Failed to create collection: ${createError.message}`);
      }
    }

    // Also check for the actual collection name being used in code
    console.log(`\n🔍 Checking for collection: "facebook_groups_voip"`);
    try {
      const fbGroupsSnapshot = await db.collection('facebook_groups_voip').limit(1).get();
      console.log(`✅ Collection "facebook_groups_voip" exists and is accessible`);
    } catch (error) {
      console.log(`❌ Collection "facebook_groups_voip" not accessible: ${error.message}`);
    }

    // Final verification of both collection names
    console.log(`\n📋 FINAL COLLECTION CHECK:`);
    const allCollections = await db.listCollections();
    const hasGroupsVoip = allCollections.some(col => col.id === 'groupsVOIP');
    const hasFacebookGroupsVoip = allCollections.some(col => col.id === 'facebook_groups_voip');
    
    console.log(`   groupsVOIP exists: ${hasGroupsVoip ? '✅ YES' : '❌ NO'}`);
    console.log(`   facebook_groups_voip exists: ${hasFacebookGroupsVoip ? '✅ YES' : '❌ NO'}`);
    
    if (!hasGroupsVoip && hasFacebookGroupsVoip) {
      console.log(`\n⚠️  ISSUE FOUND: Code expects "groupsVOIP" but collection is named "facebook_groups_voip"`);
      console.log(`🔧 SOLUTION: Update group-service.ts to use "facebook_groups_voip"`);
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the debugging
debugAndFixCollections().catch(console.error);
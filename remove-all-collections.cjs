const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function removeAllCollections() {
  console.log('🧹 Removing ALL accounts, groups, images, and texts collections...\n');

  try {
    // Define all collections to remove
    const collectionsToRemove = [
      // Fresh collections we just created
      'accounts',
      'groups', 
      'texts',
      'images',
      
      // Old collections
      'facebook_accounts',
      'facebook_groups',
      'posting_texts',
      'posting_images',
      'Accounts',
      'Groups', 
      'Texts',
      'Images',
      
      // Any variations
      'account',
      'group', 
      'text',
      'image',
      'callcenters',
      'accounts',
      'groups',
      'texts',
      'images'
    ];

    let totalCollectionsRemoved = 0;
    let totalDocumentsDeleted = 0;

    for (const collectionName of collectionsToRemove) {
      try {
        console.log(`🔍 Checking collection: ${collectionName}`);
        
        const collection = db.collection(collectionName);
        const snapshot = await collection.get();
        
        if (snapshot.empty) {
          console.log(`   ✅ Collection '${collectionName}' exists but is empty`);
          totalCollectionsRemoved++;
          continue;
        }
        
        console.log(`   📊 Found ${snapshot.size} documents in '${collectionName}'`);
        
        // Delete all documents in the collection
        const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);
        
        console.log(`   🗑️ Deleted all ${snapshot.size} documents from '${collectionName}'`);
        totalDocumentsDeleted += snapshot.size;
        totalCollectionsRemoved++;
        
      } catch (error) {
        // Collection might not exist, which is fine
        console.log(`   ⚠️ Collection '${collectionName}' not found or error: ${error.message}`);
      }
      
      console.log('');
    }

    console.log('🎯 CLEANUP COMPLETE!');
    console.log('====================');
    console.log(`✅ Total collections processed: ${totalCollectionsRemoved}`);
    console.log(`🗑️ Total documents deleted: ${totalDocumentsDeleted}`);
    
    console.log('\n📋 REMOVED COLLECTIONS:');
    collectionsToRemove.forEach(name => {
      console.log(`   - ${name}`);
    });
    
    console.log('\n✅ ALL accounts, groups, images, and texts collections have been completely removed!');
    console.log('🎯 Your database is now completely clean for Facebook CRM data.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the cleanup
removeAllCollections().catch(console.error);
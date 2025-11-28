// Script to rename "groups" collection to "groupsVOIP"
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function renameGroupsCollection() {
  console.log('🔄 Renaming "groups" collection to "groupsVOIP"...\n');

  try {
    // Step 1: Check if the source collection exists
    console.log('📊 Step 1: Checking source collection "groups"...');
    const sourceCollection = db.collection('groups');
    const sourceSnapshot = await sourceCollection.get();
    
    console.log(`📊 Found ${sourceSnapshot.size} documents in "groups" collection`);
    
    if (sourceSnapshot.size === 0) {
      console.log('⚠️ Source collection "groups" is empty. Creating empty "groupsVOIP" collection...');
    } else {
      console.log('📄 Documents to migrate:');
      sourceSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.name || 'Unnamed'} (ID: ${doc.id})`);
      });
    }

    // Step 2: Create the target collection and migrate data
    console.log('\n📁 Step 2: Creating "groupsVOIP" collection...');
    const targetCollection = db.collection('groupsVOIP');
    
    if (sourceSnapshot.size > 0) {
      console.log('📋 Step 3: Migrating documents...');
      const batch = db.batch();
      
      sourceSnapshot.forEach(doc => {
        const data = doc.data();
        const newDocRef = targetCollection.doc(doc.id);
        batch.set(newDocRef, {
          ...data,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          originalId: doc.id
        });
        console.log(`   ✅ Migrated: ${data.name || 'Unnamed'} (${doc.id})`);
      });
      
      // Commit the batch
      await batch.commit();
      console.log(`🎉 Successfully migrated ${sourceSnapshot.size} documents to "groupsVOIP"`);
    } else {
      // Create an empty placeholder document
      await targetCollection.doc('placeholder').set({
        placeholder: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        note: 'Empty groupsVOIP collection'
      });
      await targetCollection.doc('placeholder').delete();
      console.log('📁 Created empty "groupsVOIP" collection');
    }

    // Step 3: Verify the target collection
    console.log('\n🔍 Step 4: Verifying "groupsVOIP" collection...');
    const targetSnapshot = await targetCollection.get();
    console.log(`✅ "groupsVOIP" collection created with ${targetSnapshot.size} documents`);

    // Step 4: Delete the original collection (optional - you may want to keep it as backup)
    console.log('\n🗑️ Step 5: Handling original "groups" collection...');
    const shouldDelete = false; // Set to true if you want to delete the original
    
    if (shouldDelete) {
      console.log('🗑️ Deleting original "groups" collection...');
      const deleteBatch = db.batch();
      sourceSnapshot.forEach(doc => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();
      console.log('✅ Original "groups" collection deleted');
    } else {
      console.log('ℹ️  Keeping original "groups" collection as backup');
      console.log('   (To delete it, set shouldDelete = true in the script)');
    }

    // Step 5: Final verification
    console.log('\n📊 FINAL STATUS:');
    const allCollections = await db.listCollections();
    const hasGroups = allCollections.some(col => col.id === 'groups');
    const hasGroupsVoip = allCollections.some(col => col.id === 'groupsVOIP');
    
    console.log(`   "groups" collection: ${hasGroups ? '✅ EXISTS' : '❌ DELETED'}`);
    console.log(`   "groupsVOIP" collection: ${hasGroupsVoip ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (hasGroupsVoip) {
      const voipSnapshot = await db.collection('groupsVOIP').get();
      console.log(`   "groupsVOIP" documents: ${voipSnapshot.size}`);
    }

    console.log('\n🎉 Collection rename process completed!');
    if (hasGroupsVoip) {
      console.log('🚀 Your Facebook groups are now available in "groupsVOIP" collection!');
    }

  } catch (error) {
    console.error('❌ Error during collection rename:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the rename process
renameGroupsCollection().catch(console.error);
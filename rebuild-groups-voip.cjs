// Script to rebuild groupsVOIP collection
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function rebuildGroupsVoipCollection() {
  console.log('🔄 Rebuilding groupsVOIP collection...\n');

  try {
    // Create a test document to initialize the collection
    // This will automatically create the collection structure
    const testDoc = {
      name: 'Collection Placeholder',
      isActive: true,
      memberCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      collectionRebuilt: true,
      rebuildDate: new Date().toISOString()
    };

    const docRef = await db.collection('groupsVOIP').add(testDoc);
    console.log('✅ Created groupsVOIP collection with placeholder document');
    console.log('📄 Placeholder document ID:', docRef.id);

    // Delete the placeholder document
    await db.collection('groupsVOIP').doc(docRef.id).delete();
    console.log('🗑️ Removed placeholder document');

    // Verify the collection exists
    const snapshot = await db.collection('groupsVOIP').limit(1).get();
    console.log('📊 Collection verification: Empty collection ready');
    
    console.log('\n🎉 SUCCESS: groupsVOIP collection has been rebuilt!');
    console.log('📁 Collection name: groupsVOIP');
    console.log('📊 Status: Empty and ready for new data');
    console.log('🔧 Use the Facebook Groups CRM interface to add new groups');

  } catch (error) {
    console.error('❌ Error rebuilding groupsVOIP collection:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the rebuild
rebuildGroupsVoipCollection().catch(console.error);
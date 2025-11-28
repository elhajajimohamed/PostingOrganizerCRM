const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../../../../Downloads/posting-organizer-crm-new-firebase-adminsdk-fbsvc-1c7ec88ab1.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function checkGroupsCollection() {
  console.log('🔍 Checking "groups" collection data...\n');

  try {
    // Get all groups from the 'groups' collection
    const groupsSnapshot = await db.collection('groups').get();
    console.log(`📋 Found ${groupsSnapshot.size} groups in the groups collection\n`);

    for (const doc of groupsSnapshot.docs) {
      const groupData = doc.data();
      console.log(`Group: ${groupData.name || 'Unnamed'}`);
      console.log(`  Document ID: ${doc.id}`);
      console.log(`  url: ${groupData.url || 'NOT SET'}`);
      console.log(`  facebookAccountId: ${groupData.facebookAccountId || 'NOT SET'}`);
      console.log(`  name: ${groupData.name || 'NOT SET'}`);
      console.log(`  isActive: ${groupData.isActive}`);
      console.log(`  createdAt: ${groupData.createdAt?.toDate?.() || groupData.createdAt || 'NOT SET'}`);
      console.log(`  updatedAt: ${groupData.updatedAt?.toDate?.() || groupData.updatedAt || 'NOT SET'}`);
      console.log('---');
    }

  } catch (error) {
    console.error('❌ Error checking groups:', error);
  } finally {
    // Close the connection
    await admin.app().delete();
  }
}

checkGroupsCollection().catch(console.error);
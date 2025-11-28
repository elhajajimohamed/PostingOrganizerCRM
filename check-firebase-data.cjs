const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../../../../Downloads/posting-organizer-crm-new-firebase-adminsdk-fbsvc-1c7ec88ab1.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function checkCollections() {
  console.log('🔍 Checking Firebase collections...\n');

  const collections = [
    'accounts',
    'facebook_accounts',
    'facebook_groups',
    'posting_texts',
    'posting_images',
    'posting_tasks'
  ];

  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).get();

      console.log(`📁 ${collectionName}: ${snapshot.size} documents`);

      if (snapshot.size > 0) {
        console.log('   Sample documents:');
        let count = 0;
        snapshot.forEach((doc) => {
          if (count < 3) { // Show first 3 documents
            console.log(`   - ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
            count++;
          }
        });
        if (snapshot.size > 3) {
          console.log(`   ... and ${snapshot.size - 3} more documents`);
        }
      }
      console.log('');

    } catch (error) {
      console.error(`❌ Error checking ${collectionName}:`, error.message);
    }
  }

  // Close the connection
  await admin.app().delete();
}

checkCollections().catch(console.error);
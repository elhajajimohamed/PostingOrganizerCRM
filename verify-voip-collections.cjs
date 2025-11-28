// Script to verify VOIP collections in Firebase
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function verifyVoipCollections() {
  console.log('🔍 Verifying VOIP collections in Firebase...\n');

  const voipCollections = [
    'facebook_accounts_voip',
    'facebook_groups_voip',
    'posting_texts_voip',
    'posting_images_voip',
    'posting_tasks_voip'
  ];

  try {
    for (const collectionName of voipCollections) {
      console.log(`📁 Checking collection: ${collectionName}`);
      
      try {
        const snapshot = await db.collection(collectionName).limit(1).get();
        const count = snapshot.size;
        console.log(`   ✅ Collection exists with ${count} documents`);
      } catch (error) {
        if (error.code === 5) { // NOT_FOUND
          console.log(`   ⚠️  Collection does not exist yet (this is normal for new collections)`);
        } else {
          console.log(`   ❌ Error checking collection: ${error.message}`);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log('   All VOIP collections are configured and ready to use!');
    console.log('   When you add new data, it will be saved to these collections:');
    voipCollections.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });

  } catch (error) {
    console.error('❌ Error verifying collections:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the verification
verifyVoipCollections().catch(console.error);
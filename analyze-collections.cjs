const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase config from your .env.local
const firebaseConfig = {
  apiKey: "AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw",
  authDomain: "posting-organizer-crm-new.firebaseapp.com",
  projectId: "posting-organizer-crm-new",
  storageBucket: "posting-organizer-crm-new.firebasestorage.app",
  messagingSenderId: "593772237603",
  appId: "1:593772237603:web:9559b82b91f3353cb2f296"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function analyzeCollections() {
  console.log('🔍 Analyzing Facebook CRM Collections...\n');

  const collections = [
    'facebook_accounts',
    'facebook_groups',
    'groups', // Check if groups are in the regular groups collection
    'posting_texts',
    'posting_images'
  ];

  for (const collectionName of collections) {
    try {
      console.log(`📊 ${collectionName.toUpperCase()}:`);
      const querySnapshot = await getDocs(collection(db, collectionName));

      console.log(`  Total documents: ${querySnapshot.size}`);

      if (querySnapshot.size > 0) {
        // Get first document as sample
        const firstDoc = querySnapshot.docs[0];
        console.log(`  Sample document ID: ${firstDoc.id}`);
        console.log(`  Sample data keys: ${Object.keys(firstDoc.data()).join(', ')}`);

        // Count active items
        let activeCount = 0;
        querySnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'active' || data.isActive === true) {
            activeCount++;
          }
        });
        console.log(`  Active items: ${activeCount}`);
      }

      console.log('');
    } catch (error) {
      console.log(`❌ Error analyzing ${collectionName}: ${error.message}`);
      console.log('');
    }
  }

  process.exit(0);
}

analyzeCollections().catch(console.error);
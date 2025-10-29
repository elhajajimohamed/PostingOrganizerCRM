import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';

// Firebase configuration from .env.local
const firebaseConfig = {
  apiKey: "AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw",
  authDomain: "posting-organizer-crm-new.firebaseapp.com",
  projectId: "posting-organizer-crm-new",
  storageBucket: "posting-organizer-crm-new.firebasestorage.app",
  messagingSenderId: "593772237603",
  appId: "1:593772237603:web:9559b82b91f3353cb2f296"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCallCenters() {
  try {
    console.log('🗑️ Starting to clear all call centers from the CRM...');

    // Get all documents from the callCenters collection
    const q = collection(db, 'callCenters');
    const querySnapshot = await getDocs(q);

    const docs = querySnapshot.docs;
    let deletedCount = 0;
    const batchSize = 400; // Firebase limit is 500, using 400 for safety

    console.log(`📊 Found ${docs.length} call centers to delete`);

    // Process deletions in batches
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + batchSize);

      batchDocs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += batchDocs.length;
      console.log(`🗑️ Deleted batch of ${batchDocs.length} call centers (${deletedCount}/${docs.length})`);
    }

    console.log(`✅ Successfully cleared ${deletedCount} call centers from the CRM`);
    console.log('📁 The callCenters collection structure is preserved for future imports');

  } catch (error) {
    console.error('❌ Error clearing call centers:', error);
  }
}

// Run the script
clearCallCenters().then(() => {
  console.log('🎉 Call centers clearing operation completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Failed to clear call centers:', error);
  process.exit(1);
});
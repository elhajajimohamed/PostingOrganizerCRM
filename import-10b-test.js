import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import * as fs from 'fs';

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

async function import10bTestData() {
  try {
    console.log('📥 Starting import of 10b test data...');

    // Read the JSON file
    const data = fs.readFileSync('../../../all data/10b test.json', 'utf8');
    const callCenters = JSON.parse(data);

    console.log(`📊 Found ${callCenters.length} call centers to import`);

    let importedCount = 0;
    let errors = 0;

    // Import each call center
    for (const callCenter of callCenters) {
      try {
        // Prepare the data for Firestore
        const callCenterData = {
          name: callCenter.name || '',
          country: callCenter.country || 'Morocco',
          city: callCenter.city || '',
          positions: callCenter.positions || 0,
          status: callCenter.status || 'New',
          value: callCenter.value || 0,
          currency: callCenter.currency || 'USD',
          phones: Array.isArray(callCenter.phones) ? callCenter.phones : [],
          phone_infos: callCenter.phone_infos || [],
          emails: Array.isArray(callCenter.emails) ? callCenter.emails : [],
          website: callCenter.website || '',
          address: callCenter.address || '',
          source: callCenter.source || '',
          type: callCenter.type || '',
          tags: Array.isArray(callCenter.tags) ? callCenter.tags : [],
          markets: Array.isArray(callCenter.markets) ? callCenter.markets : [],
          competitors: Array.isArray(callCenter.competitors) ? callCenter.competitors : [],
          socialMedia: Array.isArray(callCenter.socialMedia) ? callCenter.socialMedia : [],
          foundDate: callCenter.foundDate || '',
          notes: callCenter.notes || '',
          updatedAt: new Date().toISOString(),
        };

        // Add to Firestore
        const docRef = await addDoc(collection(db, 'callCenters'), {
          ...callCenterData,
          createdAt: Timestamp.now(),
          lastContacted: callCenter.lastContacted ? Timestamp.fromDate(new Date(callCenter.lastContacted)) : null,
        });

        importedCount++;
        console.log(`✅ Imported: ${callCenter.name} (ID: ${docRef.id})`);

      } catch (error) {
        console.error(`❌ Failed to import ${callCenter.name}:`, error);
        errors++;
      }
    }

    console.log(`\n📊 Import completed:`);
    console.log(`✅ Successfully imported: ${importedCount} call centers`);
    console.log(`❌ Errors: ${errors}`);

  } catch (error) {
    console.error('❌ Error importing data:', error);
  }
}

// Run the import
import10bTestData().then(() => {
  console.log('🎉 Import operation completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Failed to import data:', error);
  process.exit(1);
});
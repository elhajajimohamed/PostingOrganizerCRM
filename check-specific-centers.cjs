const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw',
  authDomain: 'posting-organizer-crm-new.firebaseapp.com',
  projectId: 'posting-organizer-crm-new',
  storageBucket: 'posting-organizer-crm-new.firebasestorage.app',
  messagingSenderId: '593772237603',
  appId: '1:593772237603:web:9559b82b91f3353cb2f296'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkSpecificCenters() {
  try {
    console.log('🔍 Checking specific call center IDs...\n');

    const idsToCheck = [
      'PuSLQt63UK1F1TnpcyIV', // Ghandi Connect
      '8hqRwFS1zdvyaAJLfPbr', // GREAT CALL
      'm1NoVAj2kbB9W5dZ6NdI', // From search results
      '10LwjBTlEFzw2mMd0Zjf', // Another Ghandi Connect
      'Ztbu0UyEDXIwuN21EvaV'  // Another Ghandi Connect
    ];

    for (const id of idsToCheck) {
      try {
        const docRef = doc(db, 'callCenters', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log(`✅ ${id}: EXISTS - ${data.name || 'No name'}`);
          if (data.notes && data.notes.includes('Merged from duplicate')) {
            console.log(`   📝 Notes: ${data.notes.substring(0, 100)}...`);
          }
        } else {
          console.log(`❌ ${id}: DOES NOT EXIST`);
        }
      } catch (error) {
        console.log(`⚠️ ${id}: ERROR - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking specific centers:', error);
  }
}

checkSpecificCenters();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, getDocs } = require('firebase/firestore');

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

async function checkExistingCenters() {
  try {
    console.log('🔍 Checking existing call centers...\n');

    // Get all call centers
    const callCentersRef = collection(db, 'callCenters');
    const q = query(callCentersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    console.log(`📊 Found ${snapshot.size} call centers\n`);

    const centers = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      centers.push({
        id: doc.id,
        name: data.name || '',
        notes: data.notes || ''
      });
    });

    // Look for Ghandi Connect and GREAT CALL
    const ghandiCenters = centers.filter(c => c.name.toLowerCase().includes('ghandi'));
    const greatCallCenters = centers.filter(c => c.name.toLowerCase().includes('great call'));

    console.log('🎯 Ghandi Connect centers:');
    ghandiCenters.forEach(center => {
      console.log(`  - ${center.name} (${center.id})`);
      if (center.notes) console.log(`    Notes: ${center.notes.substring(0, 100)}...`);
    });

    console.log('\n🎯 GREAT CALL centers:');
    greatCallCenters.forEach(center => {
      console.log(`  - ${center.name} (${center.id})`);
      if (center.notes) console.log(`    Notes: ${center.notes.substring(0, 100)}...`);
    });

    return centers;

  } catch (error) {
    console.error('❌ Error checking existing centers:', error);
  }
}

checkExistingCenters();
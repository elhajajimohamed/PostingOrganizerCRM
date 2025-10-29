import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

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

const COLLECTIONS = [
  'callCenters',
  'calendarEvents',
  'phoneRotation',
  'suggestions',
  'accounts',
  'groups',
  'templates',
  'media',
  'tasks',
  'postHistory',
  'settings',
  'notifications',
  'notificationRules',
  'mediaBundles',
  'groupStates',
  'dailyCallSessions',
  'dataBackups',
  'auditLogs',
  'scrapingJobs'
];

async function verifyCollection(collectionName) {
  try {
    console.log(`🔍 Verifying collection: ${collectionName}`);

    const q = query(collection(db, collectionName), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log(`✅ Collection '${collectionName}' exists with ${querySnapshot.size} document(s)`);
      return true;
    } else {
      console.log(`⚠️  Collection '${collectionName}' exists but is empty`);
      return true; // Collection exists, just empty
    }
  } catch (error) {
    if (error.code === 'permission-denied') {
      console.log(`🔒 Collection '${collectionName}' exists (permission denied on read)`);
      return true;
    } else if (error.code === 'not-found') {
      console.log(`❌ Collection '${collectionName}' does not exist`);
      return false;
    } else {
      console.log(`❓ Collection '${collectionName}' status unknown: ${error.message}`);
      return false;
    }
  }
}

async function verifyAllCollections() {
  console.log('🚀 Verifying all CRM collections...\n');

  const results = [];
  for (const collectionName of COLLECTIONS) {
    const exists = await verifyCollection(collectionName);
    results.push({ name: collectionName, exists });
  }

  console.log('\n📊 Verification Summary:');
  const existing = results.filter(r => r.exists).length;
  const total = results.length;

  console.log(`✅ Existing: ${existing}/${total}`);
  console.log(`❌ Missing: ${total - existing}/${total}`);

  if (existing === total) {
    console.log('\n🎉 All collections are properly set up!');
  } else {
    console.log('\n⚠️  Some collections are missing. Run ensure-collections.js to create them.');
    console.log('\nMissing collections:');
    results.filter(r => !r.exists).forEach(r => console.log(`  - ${r.name}`));
  }

  return { existing, total, results };
}

// Export for use in other scripts
export { verifyAllCollections, COLLECTIONS };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyAllCollections().then(({ existing, total }) => {
    console.log(`\n🏁 Collection verification completed.`);
    process.exit(existing === total ? 0 : 1);
  }).catch(error => {
    console.error('💥 Failed to verify collections:', error);
    process.exit(1);
  });
}
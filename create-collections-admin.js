import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

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

// Collections that are missing based on user's feedback
const MISSING_COLLECTIONS = {
  callCenters: {
    name: 'Sample Call Center',
    country: 'Morocco',
    city: 'Casablanca',
    positions: 10,
    status: 'New',
    value: 0,
    currency: 'USD',
    phones: ['+212-XXX-XXXXXX'],
    emails: ['contact@sample.com'],
    website: 'https://sample.com',
    tags: ['sample'],
    notes: 'Sample call center for collection initialization'
  },
  notificationRules: {
    type: 'group_usage',
    threshold: 100,
    enabled: true
  },
  mediaBundles: {
    name: 'Sample Bundle',
    description: 'Sample media bundle',
    media_ids: [],
    category: 'sample',
    created_by: 'system'
  },
  groupStates: {
    group_id: 'sample_group',
    account_id: 'sample_account',
    last_post_timestamp: Timestamp.now(),
    daily_post_count: 0
  },
  dataBackups: {
    timestamp: Timestamp.now(),
    type: 'sample',
    data: {},
    size: 0
  },
  auditLogs: {
    timestamp: Timestamp.now(),
    action: 'collection_init',
    user: 'system',
    details: 'Collection initialization'
  }
};

async function createMissingCollection(collectionName, sampleData) {
  try {
    console.log(`🔍 Creating missing collection: ${collectionName}`);

    const docRef = await db.collection(collectionName).add({
      ...sampleData,
      _collection_init: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });

    console.log(`✅ Collection '${collectionName}' created with document ID: ${docRef.id}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating collection '${collectionName}':`, error);
    return false;
  }
}

async function createAllMissingCollections() {
  console.log('🚀 Creating missing collections for CRM using Firebase Admin SDK...\n');

  const results = [];

  for (const [collectionName, sampleData] of Object.entries(MISSING_COLLECTIONS)) {
    const success = await createMissingCollection(collectionName, sampleData);
    results.push({ name: collectionName, success });
  }

  console.log('\n📊 Creation Summary:');
  const successful = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);

  if (successful === total) {
    console.log('\n🎉 All missing collections have been created!');
  } else {
    console.log('\n⚠️  Some collections failed to create.');
    console.log('\nFailed collections:');
    results.filter(r => !r.success).forEach(r => console.log(`  - ${r.name}`));
  }

  return { successful, total, results };
}

// Export for use in other scripts
export { createAllMissingCollections, MISSING_COLLECTIONS };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAllMissingCollections().then(({ successful, total }) => {
    console.log(`\n🏁 Missing collection creation completed.`);
    process.exit(successful === total ? 0 : 1);
  }).catch(error => {
    console.error('💥 Failed to create missing collections:', error);
    process.exit(1);
  });
}
import * as admin from 'firebase-admin';
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

const COLLECTIONS = {
  // Main CRM collections
  CALL_CENTERS: 'callCenters',
  CALENDAR_EVENTS: 'calendarEvents',
  PHONE_ROTATION: 'phoneRotation',
  SUGGESTIONS: 'suggestions',

  // Social media collections
  ACCOUNTS: 'accounts',
  GROUPS: 'groups',
  TEMPLATES: 'templates',
  MEDIA: 'media',
  TASKS: 'tasks',
  POST_HISTORY: 'postHistory',
  SETTINGS: 'settings',

  // Notification collections
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_RULES: 'notificationRules',

  // Media bundles
  MEDIA_BUNDLES: 'mediaBundles',

  // State management
  GROUP_STATES: 'groupStates',
  DAILY_CALL_SESSIONS: 'dailyCallSessions',

  // Data management
  DATA_BACKUPS: 'dataBackups',
  AUDIT_LOGS: 'auditLogs',

  // Scraping
  SCRAPING_JOBS: 'scrapingJobs'
};

async function ensureCollectionExists(collectionName, sampleData) {
  try {
    console.log(`🔍 Checking collection: ${collectionName}`);

    // Try to add a sample document to ensure collection exists
    const docRef = await addDoc(collection(db, collectionName), {
      ...sampleData,
      _collection_init: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    console.log(`✅ Collection '${collectionName}' ensured with document ID: ${docRef.id}`);

    // Clean up the initialization document
    // Note: In a real scenario, you might want to keep this or handle it differently
    // For now, we'll leave it as it proves the collection exists

    return true;
  } catch (error) {
    console.error(`❌ Error ensuring collection '${collectionName}':`, error);
    return false;
  }
}

async function ensureAllCollections() {
  console.log('🚀 Starting collection creation for Posting Organizer CRM...');

  const results = [];

  // Main CRM collections
  results.push(await ensureCollectionExists(COLLECTIONS.CALL_CENTERS, {
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
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.CALENDAR_EVENTS, {
    title: 'Sample Event',
    description: 'Sample calendar event',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    type: 'task',
    color: '#4CAF50'
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.PHONE_ROTATION, {
    date: new Date().toISOString().split('T')[0],
    calls: {},
    type: 'daily_selection'
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.SUGGESTIONS, {
    name: 'Sample Suggestion',
    address: 'Sample Address',
    phones: ['+212-XXX-XXXXXX'],
    country: 'Morocco',
    city: 'Casablanca',
    positions: 5,
    source: 'google',
    exported: false,
    website: 'https://sample.com'
  }));

  // Social media collections
  results.push(await ensureCollectionExists(COLLECTIONS.ACCOUNTS, {
    name: 'Sample Account',
    accountId: 'sample_account',
    status: 'active',
    notes: 'Sample Facebook account'
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.GROUPS, {
    name: 'Sample Group',
    url: 'https://facebook.com/groups/sample',
    tags: ['sample'],
    language: 'English',
    warningCount: 0
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.TEMPLATES, {
    title: 'Sample Template',
    body: 'Sample template content',
    placeholders: ['{name}'],
    usageCount: 0
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.MEDIA, {
    name: 'Sample Media',
    url: 'https://example.com/sample.jpg',
    type: 'image',
    category: 'sample',
    uploadedBy: 'system'
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.TASKS, {
    date: new Date().toISOString(),
    assignedTo: 'sample_user',
    status: 'pending',
    groupId: 'sample_group',
    accountId: 'sample_account',
    templateId: 'sample_template',
    notes: 'Sample task'
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.POST_HISTORY, {
    timestamp: Timestamp.now(),
    accountId: 'sample_account',
    groupId: 'sample_group',
    content: 'Sample post content',
    operatorId: 'sample_user'
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.SETTINGS, {
    maxPostsPerHour: 10,
    cooldownMinutes: 5,
    updatedBy: 'system'
  }));

  // Notification collections
  results.push(await ensureCollectionExists(COLLECTIONS.NOTIFICATIONS, {
    type: 'info',
    title: 'Sample Notification',
    message: 'Sample notification message',
    read: false
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.NOTIFICATION_RULES, {
    type: 'group_usage',
    threshold: 100,
    enabled: true
  }));

  // Media bundles
  results.push(await ensureCollectionExists(COLLECTIONS.MEDIA_BUNDLES, {
    name: 'Sample Bundle',
    description: 'Sample media bundle',
    media_ids: [],
    category: 'sample',
    created_by: 'system'
  }));

  // State management
  results.push(await ensureCollectionExists(COLLECTIONS.GROUP_STATES, {
    group_id: 'sample_group',
    account_id: 'sample_account',
    last_post_timestamp: Timestamp.now(),
    daily_post_count: 0
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.DAILY_CALL_SESSIONS, {
    date: new Date().toISOString().split('T')[0],
    selectedCallCenterIds: [],
    alreadyCalledIds: []
  }));

  // Data management
  results.push(await ensureCollectionExists(COLLECTIONS.DATA_BACKUPS, {
    timestamp: Timestamp.now(),
    type: 'sample',
    data: {},
    size: 0
  }));

  results.push(await ensureCollectionExists(COLLECTIONS.AUDIT_LOGS, {
    timestamp: Timestamp.now(),
    action: 'collection_init',
    user: 'system',
    details: 'Collection initialization'
  }));

  // Scraping
  results.push(await ensureCollectionExists(COLLECTIONS.SCRAPING_JOBS, {
    type: 'google_scrape',
    status: 'completed',
    target: 'sample',
    results: []
  }));

  // Summary
  const successful = results.filter(Boolean).length;
  const total = results.length;

  console.log(`\n📊 Collection Creation Summary:`);
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);

  if (successful === total) {
    console.log('🎉 All collections have been successfully created!');
  } else {
    console.log('⚠️  Some collections failed to create. Check the logs above.');
  }

  return { successful, total };
}

// Export for use in other scripts
export { ensureAllCollections, COLLECTIONS };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureAllCollections().then(({ successful, total }) => {
    console.log(`\n🏁 Collection initialization completed.`);
    process.exit(successful === total ? 0 : 1);
  }).catch(error => {
    console.error('💥 Failed to initialize collections:', error);
    process.exit(1);
  });
}
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function debugAllAccounts() {
  console.log('🔍 DEBUGGING ALL FACEBOOK ACCOUNTS');
  console.log('====================================\n');

  try {
    // Load all accounts from facebook_accounts collection
    const snapshot = await db.collection('facebook_accounts').get();
    console.log(`📊 Total accounts in database: ${snapshot.docs.length}\n`);

    let activeAccounts = 0;
    let inactiveAccounts = 0;
    let otherStatuses = 0;
    const statusValues = {};
    const browserValues = {};

    console.log('🔍 ALL ACCOUNTS WITH DETAILS:');
    console.log('================================\n');

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const accountName = data.name || data.displayName || 'No Name';
      const status = data.status || 'No Status';
      const browser = data.browser || data.browserType || 'No Browser';
      const groups = data.groups || data.groupCount || 0;
      const id = doc.id;

      console.log(`${index + 1}. ID: ${id}`);
      console.log(`   Name: ${accountName}`);
      console.log(`   Status: ${status}`);
      console.log(`   Browser: ${browser}`);
      console.log(`   Groups: ${groups}`);
      console.log(`   Created: ${data.createdAt?.toDate?.() || 'No date'}`);
      console.log('');

      // Track status distribution
      statusValues[status] = (statusValues[status] || 0) + 1;
      if (status === 'active') activeAccounts++;
      else if (status === 'inactive') inactiveAccounts++;
      else otherStatuses++;

      // Track browser distribution
      browserValues[browser] = (browserValues[browser] || 0) + 1;
    });

    console.log('📊 STATUS DISTRIBUTION:');
    console.log('========================');
    Object.entries(statusValues).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} accounts`);
    });
    console.log(`   Active: ${activeAccounts}`);
    console.log(`   Inactive: ${inactiveAccounts}`);
    console.log(`   Other: ${otherStatuses}`);
    console.log('');

    console.log('🌐 BROWSER DISTRIBUTION:');
    console.log('==========================');
    Object.entries(browserValues).forEach(([browser, count]) => {
      console.log(`   ${browser}: ${count} accounts`);
    });
    console.log('');

    console.log('🔍 QUERY SIMULATION:');
    console.log('======================');
    console.log('Query: facebook_accounts where status == "active"');
    console.log(`Expected to return: ${activeAccounts} accounts`);
    console.log(`But test showed: 5 accounts`);
    console.log('');

    console.log('🔍 POSSIBLE ISSUES:');
    console.log('===================');
    console.log('1. Status value mismatch (case sensitivity)');
    console.log('2. Some accounts have different status values');
    console.log('3. Firebase query indexing issue');
    console.log('4. Multiple documents with same account name');
    console.log('');

    // Simulate the exact query the service uses
    console.log('🔍 TESTING ACTUAL QUERY:');
    console.log('=========================');
    const activeQuery = await db.collection('facebook_accounts').where('status', '==', 'active').get();
    console.log(`Query result: ${activeQuery.docs.length} accounts`);
    
    activeQuery.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. ${data.name} (${data.browser || data.browserType})`);
    });

  } catch (error) {
    console.error('❌ Error debugging accounts:', error);
  } finally {
    await admin.app().delete();
  }
}

debugAllAccounts().catch(console.error);
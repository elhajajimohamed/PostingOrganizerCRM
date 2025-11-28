// Script to list all browsers in Facebook accounts
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function listAllBrowsers() {
  console.log('🔍 Listing all Facebook accounts and their browsers...\n');

  try {
    // Get all Facebook accounts
    const accountsSnapshot = await db.collection('facebook_accounts').get();
    const accounts = [];

    accountsSnapshot.forEach(doc => {
      const data = doc.data();
      accounts.push({
        id: doc.id,
        name: data.name || 'No name',
        browser: data.browser || data.browserType || 'No browser specified',
        status: data.status || 'unknown',
        groupCount: data.groups?.length || 0,
        ...data
      });
    });

    console.log(`📊 Found ${accounts.length} Facebook accounts\n`);

    // Sort by name for better readability
    accounts.sort((a, b) => a.name.localeCompare(b.name));

    // Display all accounts with their browsers
    accounts.forEach((account, index) => {
      console.log(`${index + 1}. Account: ${account.name}`);
      console.log(`   Browser: ${account.browser}`);
      console.log(`   Status: ${account.status}`);
      console.log(`   Groups: ${account.groupCount}`);
      console.log('');
    });

    // Get unique browsers
    const uniqueBrowsers = new Set();
    accounts.forEach(account => {
      uniqueBrowsers.add(account.browser);
    });

    console.log('🎯 COMPLETE LIST OF UNIQUE BROWSERS:');
    Array.from(uniqueBrowsers).forEach((browser, index) => {
      console.log(`${index + 1}. ${browser}`);
    });

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Accounts: ${accounts.length}`);
    console.log(`   Unique Browsers: ${uniqueBrowsers.size}`);
    console.log(`   Active Accounts: ${accounts.filter(a => a.status === 'active').length}`);

  } catch (error) {
    console.error('❌ Error listing browsers:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the script
listAllBrowsers().catch(console.error);
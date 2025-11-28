const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../../../../Downloads/posting-organizer-crm-new-firebase-adminsdk-fbsvc-1c7ec88ab1.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function checkAccountsCollection() {
  console.log('🔍 Checking "accounts" collection data...\n');

  try {
    // Get all accounts from the 'accounts' collection
    const accountsSnapshot = await db.collection('accounts').get();
    console.log(`📋 Found ${accountsSnapshot.size} accounts in the accounts collection\n`);

    for (const doc of accountsSnapshot.docs) {
      const accountData = doc.data();
      console.log(`Account: ${accountData.name || 'Unnamed'}`);
      console.log(`  Document ID: ${doc.id}`);
      console.log(`  accountId: ${accountData.accountId || 'NOT SET'}`);
      console.log(`  browser: ${accountData.browser || 'NOT SET'}`);
      console.log(`  name: ${accountData.name || 'NOT SET'}`);
      console.log(`  isActive: ${accountData.isActive}`);
      console.log(`  createdAt: ${accountData.createdAt?.toDate?.() || accountData.createdAt || 'NOT SET'}`);
      console.log(`  updatedAt: ${accountData.updatedAt?.toDate?.() || accountData.updatedAt || 'NOT SET'}`);
      console.log('---');
    }

  } catch (error) {
    console.error('❌ Error checking accounts:', error);
  } finally {
    // Close the connection
    await admin.app().delete();
  }
}

checkAccountsCollection().catch(console.error);
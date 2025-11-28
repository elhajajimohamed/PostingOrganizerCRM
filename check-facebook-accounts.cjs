const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../../../../Downloads/posting-organizer-crm-new-firebase-adminsdk-fbsvc-1c7ec88ab1.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function checkFacebookAccounts() {
  console.log('🔍 Checking Facebook accounts data...\n');

  try {
    // Get all facebook accounts
    const accountsSnapshot = await db.collection('facebook_accounts').get();
    console.log(`📋 Found ${accountsSnapshot.size} Facebook accounts\n`);

    for (const doc of accountsSnapshot.docs) {
      const accountData = doc.data();
      console.log(`Account: ${accountData.name || 'Unnamed'}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  browserType: ${accountData.browserType || 'NOT SET'}`);
      console.log(`  browserId: ${accountData.browserId || 'NOT SET'}`);
      console.log(`  browser: ${accountData.browser || 'NOT SET'}`);
      console.log(`  facebookAccountId: ${accountData.facebookAccountId || 'NOT SET'}`);
      console.log(`  isActive: ${accountData.isActive}`);
      console.log('---');
    }

  } catch (error) {
    console.error('❌ Error checking accounts:', error);
  } finally {
    // Close the connection
    await admin.app().delete();
  }
}

checkFacebookAccounts().catch(console.error);
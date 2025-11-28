const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function checkAllCollections() {
  console.log('🔍 CHECKING ALL ACCOUNT COLLECTIONS');
  console.log('===================================\n');

  try {
    // Check facebook_accounts collection
    console.log('📊 CHECKING facebook_accounts COLLECTION:');
    console.log('==========================================');
    const facebookAccountsSnapshot = await db.collection('facebook_accounts').get();
    console.log(`Total accounts: ${facebookAccountsSnapshot.docs.length}`);

    let facebookActiveCount = 0;
    facebookAccountsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const name = data.name || data.displayName || 'No Name';
      const status = data.status || 'No Status';
      const browser = data.browser || data.browserType || 'No Browser';
      
      console.log(`${index + 1}. ${name} (${browser}) - Status: "${status}"`);
      
      if (status === 'active') facebookActiveCount++;
    });

    console.log(`Active accounts in facebook_accounts: ${facebookActiveCount}`);
    console.log('');

    // Check accounts collection
    console.log('📊 CHECKING accounts COLLECTION:');
    console.log('=================================');
    const accountsSnapshot = await db.collection('accounts').get();
    console.log(`Total accounts: ${accountsSnapshot.docs.length}`);

    let accountsActiveCount = 0;
    accountsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const name = data.name || data.displayName || 'No Name';
      const status = data.status || 'No Status';
      const browser = data.browser || data.browserType || 'No Browser';
      
      console.log(`${index + 1}. ${name} (${browser}) - Status: "${status}"`);
      
      if (status === 'active') accountsActiveCount++;
    });

    console.log(`Active accounts in accounts: ${accountsActiveCount}`);
    console.log('');

    // Summary
    console.log('📋 SUMMARY:');
    console.log('============');
    console.log(`facebook_accounts collection: ${facebookActiveCount} active accounts`);
    console.log(`accounts collection: ${accountsActiveCount} active accounts`);
    console.log(`Total across both collections: ${facebookActiveCount + accountsActiveCount}`);

    console.log('\n🎯 RECOMMENDATION:');
    console.log('==================');
    if (accountsActiveCount > facebookActiveCount) {
      console.log('❌ ISSUE FOUND: Daily posting service is loading from WRONG collection!');
      console.log(`✅ Should load from: accounts (${accountsActiveCount} accounts)`);
      console.log(`❌ Currently loading from: facebook_accounts (${facebookActiveCount} accounts)`);
      console.log('');
      console.log('🔧 FIX NEEDED: Update daily-posting-service.ts to use "accounts" collection');
    } else {
      console.log('✅ Collections seem consistent');
    }

  } catch (error) {
    console.error('❌ Error checking collections:', error);
  } finally {
    await admin.app().delete();
  }
}

checkAllCollections().catch(console.error);
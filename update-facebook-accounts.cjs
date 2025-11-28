const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../../../../Downloads/posting-organizer-crm-new-firebase-adminsdk-fbsvc-1c7ec88ab1.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function updateFacebookAccounts() {
  console.log('🔄 Starting to update Facebook accounts with correct IDs and browsers...\n');

  try {
    // Get all accounts from the 'accounts' collection
    const accountsSnapshot = await db.collection('accounts').get();
    console.log(`📋 Found ${accountsSnapshot.size} accounts in the accounts collection`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const doc of accountsSnapshot.docs) {
      const accountData = doc.data();
      console.log(`\n📝 Processing account: ${accountData.name || 'Unnamed'}`);

      // Find the corresponding facebook account by name or profile image
      const facebookAccountsQuery = await db.collection('facebook_accounts')
        .where('name', '==', accountData.name)
        .get();

      if (facebookAccountsQuery.empty) {
        console.log(`⚠️  No matching Facebook account found for: ${accountData.name}`);
        skippedCount++;
        continue;
      }

      // Update each matching Facebook account
      for (const fbDoc of facebookAccountsQuery.docs) {
        const fbAccountData = fbDoc.data();

        // Update with correct Facebook account ID and browser
        const updateData = {
          facebookAccountId: accountData.accountId,
          browser: accountData.browser,
          updatedAt: admin.firestore.Timestamp.now()
        };

        await db.collection('facebook_accounts').doc(fbDoc.id).update(updateData);
        console.log(`✅ Updated Facebook account: ${accountData.name} (${accountData.accountId}) - Browser: ${accountData.browser}`);
        updatedCount++;
      }
    }

    console.log(`\n🎉 Update completed!`);
    console.log(`📊 Updated: ${updatedCount} Facebook accounts`);
    console.log(`⏭️  Skipped: ${skippedCount} accounts (no match found)`);

  } catch (error) {
    console.error('❌ Error during update:', error);
  } finally {
    // Close the connection
    await admin.app().delete();
  }
}

updateFacebookAccounts().catch(console.error);
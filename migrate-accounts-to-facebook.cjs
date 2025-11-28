const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../../../../Downloads/posting-organizer-crm-new-firebase-adminsdk-fbsvc-1c7ec88ab1.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function migrateAccounts() {
  console.log('🔄 Starting migration of accounts to facebook_accounts...\n');

  try {
    // Get all accounts from the 'accounts' collection
    const accountsSnapshot = await db.collection('accounts').get();
    console.log(`📋 Found ${accountsSnapshot.size} accounts to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const doc of accountsSnapshot.docs) {
      const accountData = doc.data();
      console.log(`\n📝 Processing account: ${accountData.name || 'Unnamed'}`);

      // Transform the data to match FacebookAccount structure
      const facebookAccount = {
        name: accountData.name || '',
        facebookAccountId: accountData.accountId || '', // This is the Facebook account ID
        profileImage: accountData.profileImage || '',
        status: accountData.status || 'active',
        notes: accountData.notes || '',
        browser: accountData.browser || '',
        createdAt: accountData.createdAt,
        updatedAt: accountData.updatedAt
      };

      // Check if this account already exists in facebook_accounts
      const existingQuery = await db.collection('facebook_accounts')
        .where('facebookAccountId', '==', facebookAccount.facebookAccountId)
        .get();

      if (!existingQuery.empty) {
        console.log(`⏭️  Account ${facebookAccount.facebookAccountId} already exists, skipping`);
        skippedCount++;
        continue;
      }

      // Add to facebook_accounts collection
      await db.collection('facebook_accounts').add(facebookAccount);
      console.log(`✅ Migrated account: ${facebookAccount.name} (${facebookAccount.facebookAccountId})`);
      migratedCount++;
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Migrated: ${migratedCount} accounts`);
    console.log(`⏭️  Skipped: ${skippedCount} accounts (already existed)`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    // Close the connection
    await admin.app().delete();
  }
}

migrateAccounts().catch(console.error);
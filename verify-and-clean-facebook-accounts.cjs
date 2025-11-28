const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../../../../Downloads/posting-organizer-crm-new-firebase-adminsdk-fbsvc-1c7ec88ab1.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function verifyAndCleanFacebookAccounts() {
  console.log('🔍 Verifying and cleaning Facebook accounts...\n');

  try {
    // Get all accounts from the 'accounts' collection (source of truth)
    const accountsSnapshot = await db.collection('accounts').get();
    console.log(`📋 Found ${accountsSnapshot.size} accounts in the accounts collection`);

    // Get all facebook accounts
    const facebookAccountsSnapshot = await db.collection('facebook_accounts').get();
    console.log(`📋 Found ${facebookAccountsSnapshot.size} Facebook accounts in the facebook_accounts collection\n`);

    // Create a map of accountId to account data from source collection
    const sourceAccountsMap = new Map();
    accountsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      sourceAccountsMap.set(data.accountId, {
        name: data.name,
        browser: data.browser,
        accountId: data.accountId,
        isActive: data.isActive || false
      });
    });

    console.log('🔄 Source accounts from "accounts" collection:');
    sourceAccountsMap.forEach((data, accountId) => {
      console.log(`  ${data.name}: ${accountId} (${data.browser})`);
    });
    console.log('');

    // Check current Facebook accounts and identify issues
    const facebookAccountsMap = new Map();
    const duplicates = [];
    const missingAccounts = [];
    const accountsToUpdate = [];

    facebookAccountsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const fbAccountId = data.facebookAccountId;

      if (facebookAccountsMap.has(fbAccountId)) {
        duplicates.push({ id: doc.id, fbAccountId, name: data.name || 'Unnamed' });
      } else {
        facebookAccountsMap.set(fbAccountId, { id: doc.id, data });
      }

      // Check if this account exists in source
      const sourceAccount = sourceAccountsMap.get(fbAccountId);
      if (!sourceAccount) {
        console.log(`⚠️  Facebook account ${fbAccountId} (${data.name || 'Unnamed'}) not found in source accounts collection`);
      } else {
        // Check if data matches
        const needsUpdate = (
          data.browser !== sourceAccount.browser ||
          data.facebookAccountId !== sourceAccount.accountId ||
          data.name !== sourceAccount.name
        );
        if (needsUpdate) {
          accountsToUpdate.push({
            id: doc.id,
            current: data,
            correct: sourceAccount
          });
        }
      }
    });

    // Find missing accounts
    sourceAccountsMap.forEach((sourceData, accountId) => {
      if (!facebookAccountsMap.has(accountId)) {
        missingAccounts.push(sourceData);
      }
    });

    console.log('\n🔍 Analysis Results:');
    console.log(`📊 Duplicates found: ${duplicates.length}`);
    console.log(`📊 Accounts needing updates: ${accountsToUpdate.length}`);
    console.log(`📊 Missing accounts to create: ${missingAccounts.length}`);

    if (duplicates.length > 0) {
      console.log('\n🚨 Duplicates:');
      duplicates.forEach(dup => {
        console.log(`  - ${dup.name} (ID: ${dup.id}, FB Account: ${dup.fbAccountId})`);
      });
    }

    if (accountsToUpdate.length > 0) {
      console.log('\n🔄 Accounts needing updates:');
      accountsToUpdate.forEach(update => {
        console.log(`  - ${update.current.name || 'Unnamed'}: ${update.current.facebookAccountId}`);
        console.log(`    Current: browser=${update.current.browser}, name=${update.current.name}`);
        console.log(`    Correct: browser=${update.correct.browser}, name=${update.correct.name}`);
      });
    }

    if (missingAccounts.length > 0) {
      console.log('\n➕ Missing accounts to create:');
      missingAccounts.forEach(account => {
        console.log(`  - ${account.name}: ${account.accountId} (${account.browser})`);
      });
    }

    // Ask user for confirmation before making changes
    console.log('\n⚠️  Ready to clean up. This will:');
    console.log(`   - Delete ${duplicates.length} duplicate accounts`);
    console.log(`   - Update ${accountsToUpdate.length} accounts with correct data`);
    console.log(`   - Create ${missingAccounts.length} missing accounts`);

    // CLEANUP CODE - Uncomment to execute
    console.log('\n🧹 Starting cleanup...');

    // Delete duplicates
    for (const dup of duplicates) {
      await db.collection('facebook_accounts').doc(dup.id).delete();
      console.log(`🗑️  Deleted duplicate: ${dup.name}`);
    }

    // Update incorrect accounts
    for (const update of accountsToUpdate) {
      const correctData = {
        name: update.correct.name,
        browser: update.correct.browser,
        facebookAccountId: update.correct.accountId,
        isActive: update.correct.isActive,
        updatedAt: admin.firestore.Timestamp.now()
      };
      await db.collection('facebook_accounts').doc(update.id).update(correctData);
      console.log(`✅ Updated: ${update.correct.name}`);
    }

    // Create missing accounts
    for (const account of missingAccounts) {
      const newAccount = {
        name: account.name,
        browser: account.browser,
        facebookAccountId: account.accountId,
        isActive: account.isActive,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      };
      await db.collection('facebook_accounts').add(newAccount);
      console.log(`➕ Created: ${account.name}`);
    }

    console.log('\n🎉 Cleanup completed!');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    // Close the connection
    await admin.app().delete();
  }
}

verifyAndCleanFacebookAccounts().catch(console.error);
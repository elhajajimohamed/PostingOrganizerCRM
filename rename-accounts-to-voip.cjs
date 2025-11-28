// Script to migrate Facebook accounts from "accounts" to "accountsVOIP"
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function migrateAccountsToVoip() {
  console.log('🔄 Migrating Facebook accounts from "accounts" to "accountsVOIP"...\n');

  try {
    // Step 1: Check what's in the accounts collection
    console.log('📊 Step 1: Checking "accounts" collection...');
    const accountsCollection = db.collection('accounts');
    const accountsSnapshot = await accountsCollection.get();
    
    console.log(`📊 Found ${accountsSnapshot.size} documents in "accounts" collection`);
    
    if (accountsSnapshot.size === 0) {
      console.log('⚠️ "accounts" collection is empty.');
    } else {
      console.log('📄 Documents found:');
      accountsSnapshot.forEach(doc => {
        const data = doc.data();
        const type = data.type || 'unknown';
        console.log(`   - ${data.name || 'Unnamed'} (Type: ${type}, ID: ${doc.id})`);
      });
    }

    // Step 2: Filter Facebook accounts (if any)
    const facebookAccounts = [];
    accountsSnapshot.forEach(doc => {
      const data = doc.data();
      // Check if this looks like a Facebook account
      if (data.type === 'facebook' || data.facebookAccountId || data.browser || data.profileImage) {
        facebookAccounts.push({ id: doc.id, ...data });
        console.log(`   ✅ Facebook account found: ${data.name || 'Unnamed'}`);
      }
    });

    if (facebookAccounts.length === 0) {
      console.log('ℹ️ No Facebook accounts found in "accounts" collection.');
      console.log('💡 Facebook accounts are likely already in "accountsVOIP" collection.');
    } else {
      console.log(`📋 Step 2: Found ${facebookAccounts.length} Facebook accounts to migrate`);
      
      // Step 3: Create the target collection and migrate Facebook accounts
      console.log('📁 Step 3: Creating "accountsVOIP" collection...');
      const voipCollection = db.collection('accountsVOIP');
      
      console.log('📋 Step 4: Migrating Facebook accounts...');
      const batch = db.batch();
      
      facebookAccounts.forEach(account => {
        const newDocRef = voipCollection.doc(account.id);
        batch.set(newDocRef, {
          ...account,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          originalCollection: 'accounts'
        });
        console.log(`   ✅ Migrated: ${account.name || 'Unnamed'} (${account.id})`);
      });
      
      // Commit the batch
      await batch.commit();
      console.log(`🎉 Successfully migrated ${facebookAccounts.length} Facebook accounts to "accountsVOIP"`);
    }

    // Step 4: Verify the target collection
    console.log('\n🔍 Step 5: Verifying "accountsVOIP" collection...');
    const voipSnapshot = await db.collection('accountsVOIP').get();
    console.log(`✅ "accountsVOIP" collection has ${voipSnapshot.size} documents`);

    // Step 5: Handle the original collection
    console.log('\n🗑️ Step 6: Handling original "accounts" collection...');
    const shouldDelete = false; // Set to true if you want to delete the original
    
    if (shouldDelete) {
      console.log('🗑️ Deleting Facebook accounts from original "accounts" collection...');
      const deleteBatch = db.batch();
      facebookAccounts.forEach(account => {
        deleteBatch.delete(accountsCollection.doc(account.id));
      });
      await deleteBatch.commit();
      console.log('✅ Facebook accounts removed from original "accounts" collection');
    } else {
      console.log('ℹ️ Keeping original "accounts" collection as backup');
      console.log('   (To delete Facebook accounts from it, set shouldDelete = true in the script)');
    }

    // Step 6: Final verification
    console.log('\n📊 FINAL STATUS:');
    const allCollections = await db.listCollections();
    const hasAccounts = allCollections.some(col => col.id === 'accounts');
    const hasAccountsVoip = allCollections.some(col => col.id === 'accountsVOIP');
    
    console.log(`   "accounts" collection: ${hasAccounts ? '✅ EXISTS' : '❌ DELETED'}`);
    console.log(`   "accountsVOIP" collection: ${hasAccountsVoip ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (hasAccountsVoip) {
      const voipCount = await db.collection('accountsVOIP').get();
      console.log(`   "accountsVOIP" documents: ${voipCount.size}`);
    }

    console.log('\n🎉 Account migration process completed!');
    if (facebookAccounts.length > 0) {
      console.log(`🚀 ${facebookAccounts.length} Facebook accounts moved to "accountsVOIP"!`);
    } else {
      console.log('💡 No Facebook accounts needed migration - already in correct collection');
    }

  } catch (error) {
    console.error('❌ Error during account migration:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the migration
migrateAccountsToVoip().catch(console.error);
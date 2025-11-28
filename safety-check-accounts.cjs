// Final safety check for "accounts" collection removal
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function finalSafetyCheck() {
  console.log('🔍 FINAL SAFETY CHECK: Analyzing "accounts" collection before removal...\n');

  try {
    // Check what's in the accounts collection
    const accountsCollection = db.collection('accounts');
    const accountsSnapshot = await accountsCollection.get();
    
    console.log(`📊 "accounts" collection contains ${accountsSnapshot.size} documents`);
    
    if (accountsSnapshot.size > 0) {
      console.log('📄 Documents breakdown:');
      
      let facebookAccounts = 0;
      let otherAccounts = 0;
      
      accountsSnapshot.forEach(doc => {
        const data = doc.data();
        const type = data.type || 'unknown';
        const name = data.name || 'Unnamed';
        
        // Check if this is a Facebook account that we already migrated
        if (data.type === 'facebook' || data.facebookAccountId || data.browser || data.profileImage) {
          facebookAccounts++;
          console.log(`   🟡 Facebook account (already migrated): ${name} (${doc.id})`);
        } else {
          otherAccounts++;
          console.log(`   ⚪ Other account: ${name} (Type: ${type}, ${doc.id})`);
        }
      });
      
      console.log(`\n📈 Summary:`);
      console.log(`   🟡 Facebook accounts (should be migrated): ${facebookAccounts}`);
      console.log(`   ⚪ Other account types: ${otherAccounts}`);
      
      if (facebookAccounts > 0) {
        console.log('\n⚠️  WARNING: Found Facebook accounts that should have been migrated!');
        console.log('💡 Recommendation: Check if migration script missed any accounts');
      } else {
        console.log('\n✅ No Facebook accounts found - safe to remove collection');
      }
      
      if (otherAccounts > 0) {
        console.log('\n⚠️  Found non-Facebook accounts:');
        console.log('💡 These might be for other parts of the system and should not be removed');
        console.log('📋 Recommendation: Investigate what these accounts are for');
      }
    } else {
      console.log('✅ "accounts" collection is empty - safe to remove');
    }

    // Check if "accountsVOIP" has our data
    console.log('\n🔍 Verifying "accountsVOIP" collection:');
    const voipSnapshot = await db.collection('accountsVOIP').get();
    console.log(`✅ "accountsVOIP" contains ${voipSnapshot.size} documents`);
    
    if (voipSnapshot.size > 0) {
      console.log('📊 Sample accounts in accountsVOIP:');
      let count = 0;
      voipSnapshot.forEach(doc => {
        if (count < 3) { // Show first 3
          const data = doc.data();
          console.log(`   ✅ ${data.name || 'Unnamed'} (${doc.id})`);
          count++;
        }
      });
      if (voipSnapshot.size > 3) {
        console.log(`   ... and ${voipSnapshot.size - 3} more accounts`);
      }
    }

    // Final recommendation
    console.log('\n🎯 FINAL RECOMMENDATION:');
    if (accountsSnapshot.size === 0) {
      console.log('✅ Safe to remove "accounts" collection (it\'s empty)');
    } else if (facebookAccounts === 0 && otherAccounts === 0) {
      console.log('✅ Safe to remove "accounts" collection (only migrated Facebook accounts)');
    } else {
      console.log('⚠️  Review the accounts above before removing "accounts" collection');
    }
    
    console.log('\n📋 Collections status:');
    const allCollections = await db.listCollections();
    const hasAccounts = allCollections.some(col => col.id === 'accounts');
    const hasAccountsVoip = allCollections.some(col => col.id === 'accountsVOIP');
    
    console.log(`   "accounts" collection: ${hasAccounts ? 'EXISTS' : 'DELETED'}`);
    console.log(`   "accountsVOIP" collection: ${hasAccountsVoip ? 'EXISTS' : 'MISSING'}`);

  } catch (error) {
    console.error('❌ Error during safety check:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the safety check
finalSafetyCheck().catch(console.error);
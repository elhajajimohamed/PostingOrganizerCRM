const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function fixAccountStatuses() {
  console.log('🔧 FIXING ACCOUNT STATUSES');
  console.log('============================\n');

  try {
    // Get all accounts
    const snapshot = await db.collection('facebook_accounts').get();
    
    let updatedCount = 0;
    let alreadyActiveCount = 0;
    
    console.log('🔍 Processing accounts...\n');

    const updatePromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const accountName = data.name || data.displayName || 'Unknown';
      const currentStatus = data.status || 'No Status';
      const browser = data.browser || data.browserType || 'Unknown Browser';
      const accountId = doc.id;

      console.log(`📋 Account: ${accountName} (${browser})`);
      console.log(`   Current Status: "${currentStatus}"`);

      if (currentStatus === 'active') {
        console.log(`   ✅ Already active - no change needed\n`);
        alreadyActiveCount++;
        return;
      }

      // Update the account status to 'active'
      const updateData = {
        status: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      try {
        await db.collection('facebook_accounts').doc(accountId).update(updateData);
        console.log(`   ✅ UPDATED to "active"\n`);
        updatedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to update: ${error.message}\n`);
      }
    });

    await Promise.all(updatePromises);

    console.log('🎉 STATUS UPDATE COMPLETE');
    console.log('==========================');
    console.log(`✅ Accounts already active: ${alreadyActiveCount}`);
    console.log(`🔄 Accounts updated to active: ${updatedCount}`);
    console.log(`📊 Total processed: ${alreadyActiveCount + updatedCount}`);

    // Verify the fix
    console.log('\n🔍 VERIFICATION: Testing query after fix...');
    const activeQuery = await db.collection('facebook_accounts').where('status', '==', 'active').get();
    console.log(`✅ Query result: ${activeQuery.docs.length} accounts now have "active" status`);

    activeQuery.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. ${data.name} (${data.browser || data.browserType})`);
    });

    console.log('\n🎯 NEXT STEPS:');
    console.log('===============');
    console.log('1. ✅ Account statuses are now fixed');
    console.log('2. 🚀 Run "Generate Daily Tasks" again');
    console.log('3. 📊 Now ALL 9 accounts should be used (instead of just 5)');
    console.log('4. 🎉 Better browser distribution should be achieved');

  } catch (error) {
    console.error('❌ Error fixing account statuses:', error);
  } finally {
    await admin.app().delete();
  }
}

fixAccountStatuses().catch(console.error);
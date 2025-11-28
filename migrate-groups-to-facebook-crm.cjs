const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../../../../Downloads/posting-organizer-crm-new-firebase-adminsdk-fbsvc-1c7ec88ab1.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function migrateGroupsToFacebookCRM() {
  console.log('🔄 Starting migration of groups to Facebook CRM...\n');

  try {
    // Get all groups from the 'groups' collection
    const groupsSnapshot = await db.collection('groups').get();
    console.log(`📋 Found ${groupsSnapshot.size} groups in the groups collection`);

    // Get all Facebook accounts to map facebookAccountId
    const facebookAccountsSnapshot = await db.collection('facebook_accounts').get();
    console.log(`📋 Found ${facebookAccountsSnapshot.size} Facebook accounts`);

    // Create a map of facebookAccountId to account data
    const accountMap = new Map();
    facebookAccountsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.facebookAccountId) {
        accountMap.set(data.facebookAccountId, {
          id: doc.id,
          name: data.name,
          facebookAccountId: data.facebookAccountId
        });
      }
    });

    console.log(`📊 Mapped ${accountMap.size} Facebook accounts for group assignment\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let noAccountCount = 0;

    // Process each group
    for (const groupDoc of groupsSnapshot.docs) {
      const groupData = groupDoc.data();

      // Skip if group already has facebookAccountId set
      if (groupData.facebookAccountId) {
        console.log(`⏭️  Skipping ${groupData.name} - already has account assigned`);
        skippedCount++;
        continue;
      }

      // For now, assign all groups to the first available account
      // In a real scenario, you'd want to distribute them based on some logic
      const firstAccount = Array.from(accountMap.values())[0];

      if (!firstAccount) {
        console.log(`⚠️  No Facebook accounts available for group: ${groupData.name}`);
        noAccountCount++;
        continue;
      }

      // Update the group with the Facebook account ID
      const updateData = {
        facebookAccountId: firstAccount.facebookAccountId,
        updatedAt: admin.firestore.Timestamp.now()
      };

      await db.collection('groups').doc(groupDoc.id).update(updateData);

      console.log(`✅ Migrated: ${groupData.name} -> Account: ${firstAccount.name} (${firstAccount.facebookAccountId})`);
      migratedCount++;
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Migrated: ${migratedCount} groups`);
    console.log(`⏭️  Skipped: ${skippedCount} groups (already assigned)`);
    console.log(`⚠️  No account available: ${noAccountCount} groups`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    // Close the connection
    await admin.app().delete();
  }
}

migrateGroupsToFacebookCRM().catch(console.error);
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function fixDuplicateGroups() {
  console.log('🔧 Fixing duplicate groups by assigning consistent IDs...\n');

  try {
    // Get all groups
    const groupsSnapshot = await db.collection('groups').get();
    const groups = [];

    groupsSnapshot.forEach(doc => {
      const data = doc.data();
      groups.push({
        id: doc.id,
        name: data.name || 'Unnamed',
        url: data.url || '',
        memberCount: data.memberCount || 0,
        createdAt: data.createdAt,
        browserType: data.browserType || 'Unknown',
        ...data
      });
    });

    console.log(`📊 Found ${groups.length} total groups\n`);

    // Group by name and URL (since same URL = same group)
    const groupsByUrl = {};
    groups.forEach(group => {
      const key = group.url; // Use URL as the unique identifier
      if (!groupsByUrl[key]) {
        groupsByUrl[key] = [];
      }
      groupsByUrl[key].push(group);
    });

    console.log('🔍 Processing groups by URL...\n');

    let totalProcessed = 0;
    let totalDuplicatesRemoved = 0;

    // Process each URL group
    for (const [url, urlGroups] of Object.entries(groupsByUrl)) {
      const groupList = urlGroups;

      if (groupList.length <= 1) {
        // No duplicates for this URL
        continue;
      }

      console.log(`📝 Processing URL: ${url}`);
      console.log(`   Found ${groupList.length} groups with this URL`);

      // Sort by creation date (keep the oldest)
      groupList.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return aTime - bTime; // Oldest first
      });

      // Keep the first (oldest) group, delete the rest
      const keepGroup = groupList[0];
      const deleteGroups = groupList.slice(1);

      console.log(`   ✅ Keeping: ${keepGroup.name} (ID: ${keepGroup.id})`);
      console.log(`   🗑️ Deleting ${deleteGroups.length} duplicates:`);

      for (const delGroup of deleteGroups) {
        console.log(`      - ${delGroup.name} (ID: ${delGroup.id})`);

        try {
          await db.collection('groups').doc(delGroup.id).delete();
          console.log(`        ✅ Deleted successfully`);
          totalDuplicatesRemoved++;
        } catch (error) {
          console.log(`        ❌ Failed to delete: ${error.message}`);
        }
      }

      totalProcessed++;
      console.log('');
    }

    console.log('🎉 DUPLICATE GROUPS FIX COMPLETED\n');
    console.log('📊 SUMMARY:');
    console.log(`   Total URLs processed: ${totalProcessed}`);
    console.log(`   Total duplicate groups removed: ${totalDuplicatesRemoved}`);
    console.log(`   Remaining groups: ${groups.length - totalDuplicatesRemoved}`);

  } catch (error) {
    console.error('❌ Error fixing duplicate groups:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the fix
fixDuplicateGroups().catch(console.error);
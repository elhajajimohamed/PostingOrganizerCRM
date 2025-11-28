const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../../../../Downloads/posting-organizer-crm-new-firebase-adminsdk-fbsvc-1c7ec88ab1.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function clearAllGroups() {
  try {
    console.log('🗑️ Clearing all groups from accounts...\n');
    
    // Get all groups
    console.log('📋 Fetching all groups...');
    const groupsSnapshot = await db.collection('groups').get();
    const totalGroups = groupsSnapshot.size;
    console.log(`Found ${totalGroups} groups to clear`);
    
    if (totalGroups === 0) {
      console.log('✅ No groups found to clear');
      return;
    }
    
    let clearedCount = 0;
    const batch = db.batch();
    
    // Process groups in batches
    groupsSnapshot.forEach((doc, index) => {
      // Clear the accountId from the group
      batch.update(doc.ref, {
        accountId: null,
        assigned_accounts: [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Commit batch in chunks of 400 (Firestore limit)
      if (index % 400 === 0 && index > 0) {
        console.log(`💾 Committing batch ${Math.floor(index / 400)}...`);
        batch.commit();
      }
    });
    
    // Commit remaining operations
    console.log('💾 Committing final batch...');
    await batch.commit();
    clearedCount = totalGroups;
    
    console.log(`\n✅ Successfully cleared ${clearedCount} groups from accounts`);
    console.log('📊 All groups now have no account associations');
    
  } catch (error) {
    console.error('❌ Error clearing groups:', error);
  } finally {
    await admin.app().delete();
  }
}

// Alternative: Delete all groups completely
async function deleteAllGroups() {
  try {
    console.log('🗑️ DELETING all groups from database...\n');
    console.log('⚠️  WARNING: This will permanently delete ALL groups!');
    
    const groupsSnapshot = await db.collection('groups').get();
    const totalGroups = groupsSnapshot.size;
    
    console.log(`Found ${totalGroups} groups to delete`);
    
    if (totalGroups === 0) {
      console.log('✅ No groups found to delete');
      return;
    }
    
    let deletedCount = 0;
    
    // Delete in batches
    for (let i = 0; i < totalGroups; i += 400) {
      const batch = db.batch();
      const batchGroups = groupsSnapshot.docs.slice(i, i + 400);
      
      batchGroups.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      console.log(`💾 Deleting batch ${Math.floor(i / 400) + 1}...`);
      await batch.commit();
      deletedCount += batchGroups.length;
    }
    
    console.log(`\n✅ Successfully deleted ${deletedCount} groups`);
    console.log('📊 All groups have been permanently removed');
    
  } catch (error) {
    console.error('❌ Error deleting groups:', error);
  } finally {
    await admin.app().delete();
  }
}

// Main execution
const action = process.argv[2] || 'clear'; // 'clear' or 'delete'

if (action === 'delete') {
  console.log('Executing DELETE operation...');
  deleteAllGroups();
} else {
  console.log('Executing CLEAR operation...');
  clearAllGroups();
}
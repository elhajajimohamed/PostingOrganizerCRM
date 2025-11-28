const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://posting-organizer-crm-new.firebaseapp.com'
  });
}

const db = admin.firestore();

async function cleanupInventoroDuplicates() {
  try {
    const callCenterId = 'QmwmwHeOPyviuqSTO6rF';
    console.log('🧹 [CLEANUP] Starting cleanup for INVENTORO call center:', callCenterId);

    // Get all contacts
    const contactsRef = db.collection('callCenters').doc(callCenterId).collection('contacts');
    const contactsSnapshot = await contactsRef.get();

    console.log(`📊 [CLEANUP] Found ${contactsSnapshot.size} total contacts`);

    if (contactsSnapshot.size <= 1) {
      console.log('ℹ️ [CLEANUP] No duplicates to clean up');
      return;
    }

    // Group contacts by their data (excluding ID and timestamps)
    const contactGroups = {};
    contactsSnapshot.forEach((doc) => {
      const data = doc.data();
      // Create a key based on the actual contact data (excluding ID and timestamps)
      const key = JSON.stringify({
        name: data.name,
        position: data.position,
        phone: data.phone,
        email: data.email,
        notes: data.notes,
        phone_info: data.phone_info
      });

      if (!contactGroups[key]) {
        contactGroups[key] = [];
      }
      contactGroups[key].push({
        id: doc.id,
        ref: doc.ref,
        data: data
      });
    });

    console.log(`📋 [CLEANUP] Found ${Object.keys(contactGroups).length} unique contact groups`);

    let totalDeleted = 0;
    const batch = db.batch();

    // For each group, keep the first contact and delete the rest
    for (const [key, contacts] of Object.entries(contactGroups)) {
      if (contacts.length > 1) {
        console.log(`🗑️ [CLEANUP] Processing group with ${contacts.length} duplicates`);

        // Sort by creation time (if available) or just keep the first one
        contacts.sort((a, b) => {
          const aTime = a.data.createdAt || a.data.lastContact || '0';
          const bTime = b.data.createdAt || b.data.lastContact || '0';
          return aTime.localeCompare(bTime);
        });

        // Keep the first (oldest) contact, delete the rest
        const contactsToDelete = contacts.slice(1);

        console.log(`💾 [CLEANUP] Keeping contact: ${contacts[0].id}`);
        console.log(`🗑️ [CLEANUP] Deleting ${contactsToDelete.length} duplicates:`, contactsToDelete.map(c => c.id));

        // Add deletions to batch
        contactsToDelete.forEach(contact => {
          batch.delete(contact.ref);
        });

        totalDeleted += contactsToDelete.length;
      }
    }

    if (totalDeleted > 0) {
      console.log(`🔄 [CLEANUP] Committing batch deletion of ${totalDeleted} duplicate contacts...`);
      await batch.commit();
      console.log(`✅ [CLEANUP] Successfully deleted ${totalDeleted} duplicate contacts`);
    } else {
      console.log('ℹ️ [CLEANUP] No duplicates found to delete');
    }

    // Verify the cleanup
    const finalSnapshot = await contactsRef.get();
    console.log(`📊 [CLEANUP] Final contact count: ${finalSnapshot.size}`);

  } catch (error) {
    console.error('❌ [CLEANUP] Error during cleanup:', error);
  }
}

cleanupInventoroDuplicates();
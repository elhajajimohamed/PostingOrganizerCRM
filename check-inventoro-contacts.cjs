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

async function checkInventoroContacts() {
  try {
    const callCenterId = 'QmwmwHeOPyviuqSTO6rF';
    console.log('🔍 [DEBUG] Checking contacts for INVENTORO call center:', callCenterId);

    // Get contacts
    const contactsRef = db.collection('callCenters').doc(callCenterId).collection('contacts');
    const contactsSnapshot = await contactsRef.get();

    console.log('📊 [DEBUG] Number of contacts:', contactsSnapshot.size);

    if (contactsSnapshot.size === 0) {
      console.log('❌ [DEBUG] No contacts found');
      return;
    }

    // Group contacts by data to find duplicates
    const contactGroups = {};
    let duplicateCount = 0;

    contactsSnapshot.forEach((doc, index) => {
      const data = doc.data();
      const key = `${data.name || ''}|${data.phone || ''}|${data.email || ''}|${data.position || ''}`;

      if (!contactGroups[key]) {
        contactGroups[key] = [];
      }
      contactGroups[key].push({
        id: doc.id,
        data: data,
        index: index + 1
      });
    });

    console.log('📋 [DEBUG] Contact groups:');
    Object.keys(contactGroups).forEach(key => {
      const group = contactGroups[key];
      console.log(`  Group "${key}": ${group.length} contacts`);
      if (group.length > 1) {
        duplicateCount += group.length;
        console.log('    DUPLICATES FOUND:');
        group.forEach(contact => {
          console.log(`      Contact ${contact.index} (ID: ${contact.id}):`, {
            name: contact.data.name,
            phone: contact.data.phone,
            email: contact.data.email,
            position: contact.data.position,
            notes: contact.data.notes,
            lastContact: contact.data.lastContact
          });
        });
      } else {
        const contact = group[0];
        console.log(`      Contact ${contact.index} (ID: ${contact.id}):`, {
          name: contact.data.name,
          phone: contact.data.phone,
          email: contact.data.email,
          position: contact.data.position,
          notes: contact.data.notes,
          lastContact: contact.data.lastContact
        });
      }
    });

    console.log(`📊 [DEBUG] Total duplicates: ${duplicateCount}`);

  } catch (error) {
    console.error('❌ [DEBUG] Error:', error);
  }
}

checkInventoroContacts();
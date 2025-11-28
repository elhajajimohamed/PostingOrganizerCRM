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

async function debugInventoroDestinations() {
  try {
    console.log('🔍 [DEBUG] Searching for INVENTORO call center...');

    // Search for call center by name
    const callCentersRef = db.collection('callCenters');
    const query = callCentersRef.where('name', '==', 'INVENTORO');
    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('❌ [DEBUG] No call center found with name "INVENTORO"');
      return;
    }

    console.log(`✅ [DEBUG] Found ${snapshot.docs.length} call center(s) with name "INVENTORO"`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`📋 [DEBUG] Call center ID: ${doc.id}`);
      console.log(`📋 [DEBUG] Name: ${data.name}`);
      console.log(`📋 [DEBUG] Destinations:`, data.destinations);
      console.log(`📋 [DEBUG] Destinations type:`, typeof data.destinations);
      console.log(`📋 [DEBUG] Destinations isArray:`, Array.isArray(data.destinations));
      console.log(`📋 [DEBUG] Full destinations value:`, JSON.stringify(data.destinations));
      console.log(`📋 [DEBUG] UpdatedAt:`, data.updatedAt);
      console.log('---');
    }

  } catch (error) {
    console.error('❌ [DEBUG] Error:', error);
  }
}

debugInventoroDestinations();
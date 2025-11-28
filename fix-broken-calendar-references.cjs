const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, getDocs, doc: docRef, getDoc, updateDoc, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw',
  authDomain: 'posting-organizer-crm-new.firebaseapp.com',
  projectId: 'posting-organizer-crm-new',
  storageBucket: 'posting-organizer-crm-new.firebasestorage.app',
  messagingSenderId: '593772237603',
  appId: '1:593772237603:web:9559b82b91f3353cb2f296'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixBrokenCalendarReferences() {
  try {
    console.log('🔧 Starting to fix broken calendar event references...\n');

    // First, get all call centers to create a name-to-id mapping
    console.log('📊 Loading all call centers for name-to-ID mapping...');
    const callCentersRef = collection(db, 'callCenters');
    const callCentersQuery = query(callCentersRef, orderBy('createdAt', 'desc'));
    const callCentersSnapshot = await getDocs(callCentersQuery);

    const nameToIdMap = new Map();
    const idToNameMap = new Map();

    callCentersSnapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name || '';
      const id = doc.id;

      // Store both exact name match and lowercase for case-insensitive matching
      nameToIdMap.set(name.toLowerCase(), id);
      nameToIdMap.set(name, id);
      idToNameMap.set(id, name);
    });

    console.log(`✅ Loaded ${callCentersSnapshot.size} call centers for mapping\n`);

    // Now get all calendar events
    console.log('📅 Loading all calendar events...');
    const calendarRef = collection(db, 'calendarEvents');
    const calendarQuery = query(calendarRef, orderBy('date', 'asc'));
    const calendarSnapshot = await getDocs(calendarQuery);

    console.log(`📊 Found ${calendarSnapshot.size} calendar events\n`);

    const brokenEvents = [];
    const batch = writeBatch(db);
    let fixedCount = 0;

    for (const doc of calendarSnapshot.docs) {
      const data = doc.data();
      const callCenterId = data.callCenterId;
      const callCenterName = data.callCenterName;

      if (callCenterId) {
        // Check if the call center exists
        const callCenterDoc = await getDoc(docRef(db, 'callCenters', callCenterId));
        if (!callCenterDoc.exists()) {
          // Call center doesn't exist, try to find correct one by name
          brokenEvents.push({
            id: doc.id,
            title: data.title,
            callCenterId: callCenterId,
            callCenterName: callCenterName,
            date: data.date
          });

          if (callCenterName) {
            // Try to find the correct call center ID by name
            const correctId = nameToIdMap.get(callCenterName.toLowerCase()) || nameToIdMap.get(callCenterName);

            if (correctId) {
              console.log(`🔧 Fixing event "${data.title}": ${callCenterId} -> ${correctId} (${callCenterName})`);
              batch.update(doc.ref, {
                callCenterId: correctId,
                updatedAt: new Date().toISOString()
              });
              fixedCount++;
            } else {
              console.log(`❌ Could not find correct ID for event "${data.title}" with name "${callCenterName}"`);
            }
          } else {
            console.log(`❌ Event "${data.title}" has no callCenterName to match`);
          }
        }
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`❌ Found ${brokenEvents.length} broken calendar event references`);
    console.log(`🔧 Fixed ${fixedCount} calendar events`);

    if (fixedCount > 0) {
      console.log('💾 Committing batch updates...');
      await batch.commit();
      console.log('✅ Batch updates committed successfully');
    }

    console.log('\n📋 BROKEN EVENTS DETAILS:');
    brokenEvents.forEach(event => {
      console.log(`  - ${event.title} (${event.id}): "${event.callCenterName}" (${event.callCenterId})`);
    });

    return {
      brokenCount: brokenEvents.length,
      fixedCount: fixedCount,
      brokenEvents
    };

  } catch (error) {
    console.error('❌ Error fixing broken calendar references:', error);
  }
}

fixBrokenCalendarReferences();
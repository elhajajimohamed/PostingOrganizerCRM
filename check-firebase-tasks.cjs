const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, getDocs, doc: docRef, getDoc } = require('firebase/firestore');

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

async function checkFirebaseTasks() {
  try {
    console.log('🔍 Checking Firebase tasks for call center references...\n');

    // Check if there's a tasks collection
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, orderBy('date', 'asc'));
    const tasksSnapshot = await getDocs(tasksQuery);

    console.log(`📋 Found ${tasksSnapshot.size} Firebase tasks\n`);

    let tasksWithCallCenterRefs = 0;
    let brokenRefs = 0;

    for (const doc of tasksSnapshot.docs) {
      const data = doc.data();
      const notes = data.notes;

      if (notes) {
        try {
          // Try to parse notes as JSON
          const parsedNotes = JSON.parse(notes);
          if (parsedNotes.callCenterId) {
            tasksWithCallCenterRefs++;
            const callCenterId = parsedNotes.callCenterId;

            // Check if the call center exists
            const callCenterDoc = await getDoc(docRef(db, 'callCenters', callCenterId));
            if (!callCenterDoc.exists()) {
              brokenRefs++;
              console.log(`❌ Broken reference in task "${parsedNotes.title || 'Task'}" (${doc.id}): ${callCenterId}`);
            }
          }
        } catch (error) {
          // Notes is not JSON, skip
        }
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`📋 Tasks with call center references: ${tasksWithCallCenterRefs}`);
    console.log(`❌ Broken references: ${brokenRefs}`);

  } catch (error) {
    console.error('❌ Error checking Firebase tasks:', error);
  }
}

checkFirebaseTasks();
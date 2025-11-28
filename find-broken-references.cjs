const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, getDocs, doc, getDoc } = require('firebase/firestore');

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

async function findBrokenReferences() {
  try {
    console.log('🔍 Finding calendar events and Firebase tasks with broken call center references...\n');

    // Get all calendar events
    const calendarRef = collection(db, 'calendarEvents');
    const calendarQuery = query(calendarRef, orderBy('date', 'asc'));
    const calendarSnapshot = await getDocs(calendarQuery);

    console.log(`📅 Found ${calendarSnapshot.size} calendar events\n`);

    const brokenCalendarEvents = [];
    const validCalendarEvents = [];

    for (const doc of calendarSnapshot.docs) {
      const data = doc.data();
      const callCenterId = data.callCenterId;

      if (callCenterId) {
        // Check if the call center exists
        try {
          const callCenterDoc = await getDoc(doc(db, 'callCenters', callCenterId));
          if (!callCenterDoc.exists()) {
            brokenCalendarEvents.push({
              id: doc.id,
              title: data.title,
              callCenterId: callCenterId,
              callCenterName: data.callCenterName,
              date: data.date
            });
          } else {
            validCalendarEvents.push({
              id: doc.id,
              callCenterId: callCenterId,
              callCenterName: data.callCenterName
            });
          }
        } catch (error) {
          brokenCalendarEvents.push({
            id: doc.id,
            title: data.title,
            callCenterId: callCenterId,
            callCenterName: data.callCenterName,
            date: data.date,
            error: error.message
          });
        }
      }
    }

    console.log(`❌ Found ${brokenCalendarEvents.length} calendar events with broken call center references:`);
    brokenCalendarEvents.forEach(event => {
      console.log(`  - ${event.title} (${event.id}): ${event.callCenterName} (${event.callCenterId})`);
    });

    console.log(`\n✅ Found ${validCalendarEvents.length} calendar events with valid references`);

    // Now check Firebase tasks
    console.log('\n🔍 Checking Firebase tasks...\n');

    // We need to get tasks from the TaskService, but since we can't import it easily,
    // let's check if there's a tasks collection
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, orderBy('date', 'asc'));
    const tasksSnapshot = await getDocs(tasksQuery);

    console.log(`📋 Found ${tasksSnapshot.size} Firebase tasks\n`);

    const brokenTasks = [];
    const validTasks = [];

    for (const doc of tasksSnapshot.docs) {
      const data = doc.data();
      // Tasks might have callCenterId in notes or somewhere else
      // Let's check the notes field for JSON data
      if (data.notes) {
        try {
          const parsedNotes = JSON.parse(data.notes);
          if (parsedNotes.callCenterId) {
            const callCenterId = parsedNotes.callCenterId;
            try {
              const callCenterDoc = await getDoc(doc(db, 'callCenters', callCenterId));
              if (!callCenterDoc.exists()) {
                brokenTasks.push({
                  id: doc.id,
                  title: parsedNotes.title || 'Task',
                  callCenterId: callCenterId,
                  date: data.date?.toDate?.()?.toISOString() || data.date
                });
              } else {
                validTasks.push({
                  id: doc.id,
                  callCenterId: callCenterId
                });
              }
            } catch (error) {
              brokenTasks.push({
                id: doc.id,
                title: parsedNotes.title || 'Task',
                callCenterId: callCenterId,
                date: data.date?.toDate?.()?.toISOString() || data.date,
                error: error.message
              });
            }
          }
        } catch (error) {
          // Notes is not JSON, skip
        }
      }
    }

    console.log(`❌ Found ${brokenTasks.length} Firebase tasks with broken call center references:`);
    brokenTasks.forEach(task => {
      console.log(`  - ${task.title} (${task.id}): ${task.callCenterId}`);
    });

    console.log(`\n✅ Found ${validTasks.length} Firebase tasks with valid references`);

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`  Broken calendar events: ${brokenCalendarEvents.length}`);
    console.log(`  Broken Firebase tasks: ${brokenTasks.length}`);
    console.log(`  Total broken references: ${brokenCalendarEvents.length + brokenTasks.length}`);

    return {
      brokenCalendarEvents,
      brokenTasks
    };

  } catch (error) {
    console.error('❌ Error finding broken references:', error);
  }
}

findBrokenReferences();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, getDocs } = require('firebase/firestore');

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

async function checkFirebaseCallLogs() {
  try {
    console.log('🔍 Checking Firebase call logs for Ghandi Connect (PuSLQt63UK1F1TnpcyIV)...\n');

    // Check the main callHistory subcollection
    const callLogsRef = collection(db, 'callCenters', 'PuSLQt63UK1F1TnpcyIV', 'callHistory');
    const q = query(callLogsRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);

    console.log(`📊 Found ${querySnapshot.size} call log(s) in callHistory subcollection:\n`);

    querySnapshot.forEach((doc, index) => {
      const data = doc.data();
      const timestamp = data.date;
      const dateObj = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);

      console.log(`--- Call Log ${index + 1} ---`);
      console.log('Document ID:', doc.id);
      console.log('Raw Firebase Timestamp:', timestamp);
      console.log('Date Object:', dateObj);
      console.log('ISO String (UTC):', dateObj.toISOString());
      console.log('Local Time (Morocco):', dateObj.toLocaleString('en-US', {
        timeZone: 'Africa/Casablanca',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
      console.log('Outcome:', data.outcome);
      console.log('Duration:', data.duration, 'seconds');
      console.log('Notes:', data.notes);
      console.log('Follow-up:', data.followUp || 'none');
      console.log('');
    });

    if (querySnapshot.size === 0) {
      console.log('❌ No call logs found in callHistory subcollection');

      // Check if there are any other collections that might contain call logs
      console.log('\n🔍 Checking for other possible call log collections...\n');

      // Check dailyCallSessions collection
      const dailySessionsRef = collection(db, 'dailyCallSessions');
      const dailyQuery = query(dailySessionsRef, orderBy('date', 'desc'), limit(5));
      const dailySnapshot = await getDocs(dailyQuery);

      console.log(`📊 Found ${dailySnapshot.size} daily call sessions:\n`);
      dailySnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`--- Daily Session ${index + 1} ---`);
        console.log('Document ID:', doc.id);
        console.log('Date:', data.date);
        console.log('Selected Call Centers:', data.selectedCallCenterIds?.length || 0);
        console.log('Already Called:', data.alreadyCalledIds?.length || 0);
        console.log('');
      });

      // Check if there are any top-level collections that might contain call logs
      const allCollections = ['callCenters', 'dailyCallSessions', 'calendarEvents', 'suggestions'];
      for (const collName of allCollections) {
        try {
          const collRef = collection(db, collName);
          const collQuery = query(collRef, limit(1));
          const collSnapshot = await getDocs(collQuery);
          console.log(`📊 Collection '${collName}' has ${collSnapshot.size} documents`);
        } catch (error) {
          console.log(`❌ Error checking collection '${collName}':`, error.message);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking Firebase:', error);
  }
}

checkFirebaseCallLogs();
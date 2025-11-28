import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw",
  authDomain: "posting-organizer-crm-new.firebaseapp.com",
  projectId: "posting-organizer-crm-new",
  storageBucket: "posting-organizer-crm-new.firebasestorage.app",
  messagingSenderId: "593772237603",
  appId: "1:593772237603:web:9559b82b91f3353cb2f296"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findHelpyCall() {
  try {
    console.log('🔍 Finding HelpyCall in Firebase...');

    // Query for HelpyCall by name
    const q = query(collection(db, 'callCenters'), where('name', '==', 'HelpyCall'));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      console.log('✅ Found HelpyCall document:');
      console.log('Firebase Document ID:', doc.id);
      console.log('Data:', doc.data());
      return doc.id;
    } else {
      console.log('❌ HelpyCall not found in database');
      return null;
    }

  } catch (error) {
    console.error('❌ Error finding HelpyCall:', error);
    return null;
  }
}

// Run the search
findHelpyCall().then((docId) => {
  if (docId) {
    console.log('🎯 Use this Firebase document ID to update HelpyCall:', docId);
  }
  process.exit(0);
}).catch(error => {
  console.error('💥 Search failed:', error);
  process.exit(1);
});
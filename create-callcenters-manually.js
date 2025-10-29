import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Firebase configuration from .env.local
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

async function createCallCentersCollection() {
  console.log('🚀 Creating callCenters collection manually...');

  try {
    // Create a sample call center document
    const callCenterData = {
      name: 'Sample Call Center',
      country: 'Morocco',
      city: 'Casablanca',
      positions: 10,
      status: 'New',
      value: 0,
      currency: 'USD',
      phones: ['+212-XXX-XXXXXX'],
      emails: ['contact@sample.com'],
      website: 'https://sample.com',
      tags: ['sample'],
      notes: 'Sample call center for collection initialization',
      _collection_init: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    console.log('📝 Adding sample call center document...');
    const docRef = await addDoc(collection(db, 'callCenters'), callCenterData);

    console.log(`✅ callCenters collection created with document ID: ${docRef.id}`);
    console.log('🎉 callCenters collection is now available in Firebase!');

    return true;
  } catch (error) {
    console.error('❌ Error creating callCenters collection:', error);
    return false;
  }
}

// Run the function
createCallCentersCollection().then(success => {
  if (success) {
    console.log('\n🏁 callCenters collection creation completed successfully!');
    process.exit(0);
  } else {
    console.log('\n💥 Failed to create callCenters collection!');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
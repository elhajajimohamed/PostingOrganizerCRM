import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// You'll need to set up your Firebase project and download the service account key
// For now, this is a template - replace with your actual Firebase config

// const serviceAccount = require('./path/to/serviceAccountKey.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://your-project.firebaseio.com'
// });

// For now, we'll use the existing Firebase client SDK
// Import the existing Firebase configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
  try {
    console.log('🚀 Starting callcenters collection creation...');

    // Sample data based on the provided examples
    const callCentersData = [
      {
        id: "5vOgYqQSrD3mVP8YKOu3",
        name: "CAMTEL",
        country: "Cameroon",
        city: "Yaoundé",
        positions: 7,
        status: "New",
        value: 0,
        currency: "USD",
        phones: ["2 22 23 40 65"],
        phone_infos: [],
        emails: [],
        website: "http://camtel.cm/",
        address: "Bd du 20 mai, Yaoundé, Cameroon",
        source: "google",
        type: "",
        tags: ["google-lead", "potential-call-center"],
        markets: [],
        competitors: [],
        socialMedia: [],
        foundDate: "2025-10-25T16:29:14.752Z",
        lastContacted: null,
        notes: "Lead found via Google Places search. Rating: 3.8/5 (237 reviews). Maps URL: undefined",
        createdAt: "2025-10-25T16:29:14.752Z",
        updatedAt: "2025-10-25T16:29:14.752Z"
      },
      {
        id: "0aK23skhluy1fm1FsnTB",
        name: "CAMTEL - blue",
        country: "Cameroon",
        city: "Yaoundé",
        positions: 7,
        status: "New",
        value: 0,
        currency: "USD",
        phones: ["2 22 23 40 65"],
        phone_infos: [],
        emails: [],
        website: "https://www.camtel.cm/",
        address: "VGWC+WGV, Yaoundé, Cameroon",
        source: "google",
        type: "",
        tags: ["google-lead", "potential-call-center"],
        markets: [],
        competitors: [],
        socialMedia: [],
        foundDate: "2025-10-25T16:29:14.150Z",
        lastContacted: null,
        notes: "Lead found via Google Places search. Rating: 3.6/5 (106 reviews). Maps URL: undefined",
        createdAt: "2025-10-25T16:29:14.150Z",
        updatedAt: "2025-10-25T16:29:14.150Z"
      },
      {
        id: "7qVlj5EMwDHME3JxiEhc",
        name: "FTGROUP",
        country: "Cameroon",
        city: "Douala",
        positions: 7,
        status: "New",
        value: 0,
        currency: "USD",
        phones: ["6 94 67 96 20"],
        phone_infos: [],
        emails: [],
        website: "https://ftgroupsarl.com/",
        address: "MAKEPE BLOC L, Douala, Cameroon",
        source: "google",
        type: "",
        tags: ["google-lead", "potential-call-center"],
        markets: [],
        competitors: [],
        socialMedia: [],
        foundDate: "2025-10-25T16:29:12.958Z",
        lastContacted: null,
        notes: "Lead found via Google Places search. Rating: 5/5 (7 reviews). Maps URL: undefined",
        createdAt: "2025-10-25T16:29:12.958Z",
        updatedAt: "2025-10-25T16:29:12.958Z"
      }
    ];

    console.log(`📝 Adding ${callCentersData.length} call center documents to 'callcenters' collection...`);

    // Create a batch write to add multiple documents efficiently
    const batch = db.batch();
    let addedCount = 0;

    for (const callCenter of callCentersData) {
      const docRef = db.collection('callCenters').doc(callCenter.id);
      batch.set(docRef, {
        ...callCenter,
        // Convert date strings to Firestore Timestamps
        foundDate: new Date(callCenter.foundDate),
        createdAt: new Date(callCenter.createdAt),
        updatedAt: new Date(callCenter.updatedAt),
        lastContacted: callCenter.lastContacted ? new Date(callCenter.lastContacted) : null
      });
      addedCount++;
    }

    // Commit the batch
    await batch.commit();

    console.log(`✅ Successfully added ${addedCount} documents to 'callcenters' collection`);

    // Verify the collection was created by reading back some data
    console.log('🔍 Verifying collection creation...');
    const snapshot = await db.collection('callCenters').limit(3).get();

    if (!snapshot.empty) {
      console.log(`✅ Collection 'callCenters' created successfully with ${snapshot.size} documents`);
      snapshot.forEach(doc => {
        console.log(`📄 Document ID: ${doc.id}, Name: ${doc.data().name}`);
      });
    } else {
      console.log('❌ Collection appears to be empty');
    }

  } catch (error) {
    console.error('❌ Error creating callcenters collection:', error);
    throw error;
  }
}

// Alternative method using the existing service (if Firebase Admin is not set up)
async function createCollectionUsingExistingService() {
  try {
    console.log('🚀 Creating callCenters collection using existing service...');

    // This would use your existing ExternalCRMService
    // You'll need to import and initialize it properly
    const { ExternalCRMService } = await import('./src/lib/services/external-crm-service.ts');

    const sampleData = [
      {
        name: "CAMTEL",
        country: "Cameroon",
        city: "Yaoundé",
        positions: 7,
        status: "New",
        value: 0,
        currency: "USD",
        phones: ["2 22 23 40 65"],
        phone_infos: [],
        emails: [],
        website: "http://camtel.cm/",
        address: "Bd du 20 mai, Yaoundé, Cameroon",
        source: "google",
        type: "",
        tags: ["google-lead", "potential-call-center"],
        markets: [],
        competitors: [],
        socialMedia: [],
        foundDate: "2025-10-25T16:29:14.752Z",
        lastContacted: null,
        notes: "Lead found via Google Places search. Rating: 3.8/5 (237 reviews). Maps URL: undefined",
        updatedAt: new Date().toISOString()
      },
      {
        name: "FTGROUP",
        country: "Cameroon",
        city: "Douala",
        positions: 7,
        status: "New",
        value: 0,
        currency: "USD",
        phones: ["6 94 67 96 20"],
        phone_infos: [],
        emails: [],
        website: "https://ftgroupsarl.com/",
        address: "MAKEPE BLOC L, Douala, Cameroon",
        source: "google",
        type: "",
        tags: ["google-lead", "potential-call-center"],
        markets: [],
        competitors: [],
        socialMedia: [],
        foundDate: "2025-10-25T16:29:12.958Z",
        lastContacted: null,
        notes: "Lead found via Google Places search. Rating: 5/5 (7 reviews). Maps URL: undefined",
        updatedAt: new Date().toISOString()
      }
      // Add more sample data as needed
    ];

    let createdCount = 0;
    for (const data of sampleData) {
      try {
        await ExternalCRMService.createCallCenter(data);
        createdCount++;
        console.log(`✅ Created call center: ${data.name}`);
      } catch (error) {
        console.error(`❌ Failed to create call center ${data.name}:`, error);
      }
    }

    console.log(`✅ Successfully created ${createdCount} call centers in the 'callCenters' collection`);

  } catch (error) {
    console.error('❌ Error using existing service:', error);
    throw error;
  }
}

// Export functions for use in other scripts
export {
  createCallCentersCollection,
  createCollectionUsingExistingService
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Uncomment the method you want to use:

  // Method 1: Using Firebase Admin SDK (requires service account setup)
  // createCallCentersCollection().then(() => {
  //   console.log('🎉 Callcenters collection creation completed!');
  //   process.exit(0);
  // }).catch(error => {
  //   console.error('💥 Failed to create collection:', error);
  //   process.exit(1);
  // });

  // Method 2: Using existing service (recommended if Firebase is already configured)
  createCollectionUsingExistingService().then(() => {
    console.log('🎉 Callcenters collection creation completed!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Failed to create collection:', error);
    process.exit(1);
  });
}
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

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

async function fixHelpyCall() {
  try {
    console.log('🔧 Fixing HelpyCall phone detection...');

    // HelpyCall document ID
    const docId = 'mhc62r2rw2cw047tzqc';

    // Phone detection results
    const phoneInfos = [
      {
        original: '+212632-717138',
        phone_norm: '+212632717138',
        country_code: '212',
        nsn: '632717138',
        is_mobile: true,
        whatsapp_confidence: 0.98,
        mobile_detection_reason: 'Prefix and length match'
      },
      {
        original: '+212632717138',
        phone_norm: '+212632717138',
        country_code: '212',
        nsn: '632717138',
        is_mobile: true,
        whatsapp_confidence: 0.98,
        mobile_detection_reason: 'Prefix and length match'
      }
    ];

    // Update the document
    const docRef = doc(db, 'callCenters', docId);
    await updateDoc(docRef, {
      phone_infos: phoneInfos
    });

    console.log('✅ Successfully updated HelpyCall with phone detection data');
    console.log('📱 WhatsApp button should now be enabled for HelpyCall');

  } catch (error) {
    console.error('❌ Error fixing HelpyCall:', error);
  }
}

// Run the fix
fixHelpyCall().then(() => {
  console.log('🎉 Fix completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fix failed:', error);
  process.exit(1);
});
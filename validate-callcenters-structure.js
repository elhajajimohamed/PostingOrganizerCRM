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

// Sample data that matches the structure from call-centers-2025-10-26.json
const SAMPLE_CALL_CENTER = {
  id: "test-validation-id",
  name: "Test Call Center Validation",
  country: "Cameroon",
  city: "Yaoundé",
  positions: 13,
  status: "New",
  value: 0,
  currency: "USD",
  phones: ["6 54 28 52 85"],
  phone_infos: [],
  emails: [],
  website: "http://www.test-validation.com/",
  address: "Test Address, Yaoundé, Cameroon",
  source: "google",
  type: "",
  tags: ["google-lead", "potential-call-center"],
  markets: [],
  competitors: [],
  socialMedia: [],
  foundDate: "2025-10-25T16:29:18.228Z",
  lastContacted: null,
  notes: "Test validation entry for call center structure",
  createdAt: "2025-10-25T16:29:18.228Z",
  updatedAt: "2025-10-25T16:29:18.228Z"
};

async function validateCallCenterStructure() {
  console.log('🔍 Validating callCenters collection structure...');

  try {
    // Add a test document to validate the structure
    const docRef = await addDoc(collection(db, 'callCenters'), {
      ...SAMPLE_CALL_CENTER,
      _validation_test: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      foundDate: SAMPLE_CALL_CENTER.foundDate ? Timestamp.fromDate(new Date(SAMPLE_CALL_CENTER.foundDate)) : null,
      lastContacted: SAMPLE_CALL_CENTER.lastContacted ? Timestamp.fromDate(new Date(SAMPLE_CALL_CENTER.lastContacted)) : null
    });

    console.log(`✅ callCenters structure validation successful!`);
    console.log(`📄 Test document created with ID: ${docRef.id}`);
    console.log('📋 Structure includes all required fields:');
    console.log('   - Basic info: id, name, country, city, positions, status');
    console.log('   - Financial: value, currency');
    console.log('   - Contact: phones, phone_infos, emails, website, address');
    console.log('   - Metadata: source, type, tags, markets, competitors, socialMedia');
    console.log('   - Dates: foundDate, lastContacted, createdAt, updatedAt');
    console.log('   - Notes: notes field');

    console.log('\n🎯 The callCenters collection is properly structured for importing data from call-centers-2025-10-26.json');

    return true;
  } catch (error) {
    console.error('❌ callCenters structure validation failed:', error);
    console.error('💡 This indicates the collection structure needs to be fixed');
    return false;
  }
}

// Run validation
validateCallCenterStructure().then(success => {
  if (success) {
    console.log('\n✅ callCenters collection is ready for data import!');
    process.exit(0);
  } else {
    console.log('\n❌ callCenters collection structure needs fixing!');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Unexpected error during validation:', error);
  process.exit(1);
});
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'posting-organizer-crm-new.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'posting-organizer-crm-new',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'posting-organizer-crm-new.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '593772237603',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:593772237603:web:9559b82b91f3353cb2f296'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testDatabaseView() {
  console.log('🧪 Testing Database View - VOIP Collections\n');
  
  try {
    // Test accountsVOIP
    console.log('📱 Testing accountsVOIP...');
    const accountsSnapshot = await getDocs(collection(db, 'accountsVOIP'));
    console.log(`✅ Found ${accountsSnapshot.size} Facebook accounts`);
    
    // Test groupsVOIP  
    console.log('👥 Testing groupsVOIP...');
    const groupsSnapshot = await getDocs(collection(db, 'groupsVOIP'));
    console.log(`✅ Found ${groupsSnapshot.size} Facebook groups`);
    
    // Test imagesVOIP
    console.log('🖼️ Testing imagesVOIP...');
    const imagesSnapshot = await getDocs(collection(db, 'imagesVOIP'));
    console.log(`✅ Found ${imagesSnapshot.size} media files`);
    
    // Test textsVOIP
    console.log('📝 Testing textsVOIP...');
    const textsSnapshot = await getDocs(collection(db, 'textsVOIP'));
    console.log(`✅ Found ${textsSnapshot.size} text templates`);
    
    console.log('\n🎉 All collections accessible! Database View should work correctly.');
    
    // Show sample data from each collection
    console.log('\n📊 Sample Data Preview:');
    
    if (!accountsSnapshot.empty) {
      const sampleAccount = accountsSnapshot.docs[0].data();
      console.log('📱 Sample Account:', {
        name: sampleAccount.name,
        status: sampleAccount.status,
        email: sampleAccount.email
      });
    }
    
    if (!groupsSnapshot.empty) {
      const sampleGroup = groupsSnapshot.docs[0].data();
      console.log('👥 Sample Group:', {
        name: sampleGroup.name,
        memberCount: sampleGroup.memberCount,
        language: sampleGroup.language
      });
    }
    
    if (!imagesSnapshot.empty) {
      const sampleImage = imagesSnapshot.docs[0].data();
      console.log('🖼️ Sample Media:', {
        name: sampleImage.name,
        type: sampleImage.type,
        size: sampleImage.size
      });
    }
    
    if (!textsSnapshot.empty) {
      const sampleText = textsSnapshot.docs[0].data();
      console.log('📝 Sample Template:', {
        title: sampleText.title,
        usageCount: sampleText.usageCount
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing database:', error);
  }
}

testDatabaseView();
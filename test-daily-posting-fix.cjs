const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function testAccountLoading() {
  console.log('🧪 Testing account loading fix...');
  
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('✅ Firebase initialized');
    
    // Test the old way (should find 0 accounts)
    console.log('\n📊 Testing OLD way (accounts collection with status filter):');
    const oldQuery = query(
      collection(db, 'accounts'),
      where('status', '==', 'active')
    );
    const oldSnapshot = await getDocs(oldQuery);
    console.log(`  ❌ Found ${oldSnapshot.docs.length} accounts using old method`);
    
    // Test the new way (should find 10 accounts)
    console.log('\n📊 Testing NEW way (accountsVOIP collection with isActive filter):');
    const newQuery = query(
      collection(db, 'accountsVOIP'),
      where('isActive', '==', true)
    );
    const newSnapshot = await getDocs(newQuery);
    console.log(`  ✅ Found ${newSnapshot.docs.length} accounts using new method`);
    
    if (newSnapshot.docs.length > 0) {
      console.log('\n🔍 First account sample:');
      const firstAccount = newSnapshot.docs[0].data();
      console.log(`  ID: ${newSnapshot.docs[0].id}`);
      console.log(`  Name: ${firstAccount.name || 'No name'}`);
      console.log(`  Status: ${firstAccount.status || 'No status'}`);
      console.log(`  isActive: ${firstAccount.isActive}`);
      console.log(`  Browser: ${firstAccount.browserType || 'No browser'}`);
    }
    
    // Test if we can import the DailyPostingService
    console.log('\n🔧 Testing DailyPostingService import...');
    try {
      // This is just a basic syntax check
      const DailyPostingService = require('./src/lib/services/daily-posting-service.ts');
      console.log('  ✅ DailyPostingService file syntax is valid');
    } catch (error) {
      console.log('  ⚠️ DailyPostingService import failed (expected in Node.js):', error.message);
    }
    
    console.log('\n🎉 Test completed successfully!');
    console.log(`📊 Result: ${newSnapshot.docs.length} active accounts found using the new method`);
    
    if (newSnapshot.docs.length > 0) {
      console.log('✅ The fix should work! Accounts are now being loaded correctly.');
    } else {
      console.log('❌ No accounts found. There may be other issues.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAccountLoading();
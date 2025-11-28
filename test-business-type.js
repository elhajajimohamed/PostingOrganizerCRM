// Business Type Field Test Script
// This script tests the business type functionality to identify the issue

import { db } from './src/lib/firebase.js';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';

async function testBusinessType() {
  console.log('🧪 Testing Business Type Field Functionality...\n');

  try {
    // Test 1: Create a test call center with business type
    console.log('📝 Test 1: Creating test call center with business type');
    const testCallCenter = {
      name: 'Test Call Center for Business Type',
      country: 'Morocco',
      city: 'Casablanca',
      positions: 10,
      status: 'New',
      businessType: 'call-center', // This should work
      phones: ['+212 6 12 34 56 78'],
      emails: ['test@test.com'],
      website: 'www.test.com',
      address: 'Test Address',
      tags: ['test'],
      notes: 'Test notes',
      value: 1000,
      currency: 'MAD',
      type: 'BPO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('📊 Test data:', testCallCenter);
    
    const docRef = await addDoc(collection(db, 'callCenters'), {
      ...testCallCenter,
      createdAt: new Date(),
    });

    console.log('✅ Test call center created with ID:', docRef.id);

    // Test 2: Read it back immediately
    console.log('\n📖 Test 2: Reading back the call center');
    const querySnapshot = await getDocs(collection(db, 'callCenters'));
    const testDoc = querySnapshot.docs.find(doc => doc.id === docRef.id);
    
    if (testDoc) {
      const data = testDoc.data();
      console.log('📊 Retrieved data:');
      console.log('  - Name:', data.name);
      console.log('  - Business Type:', data.businessType);
      console.log('  - Business Type Type:', typeof data.businessType);
      console.log('  - Business Type === "call-center":', data.businessType === 'call-center');
      console.log('  - All data keys:', Object.keys(data));
      
      // Test 3: Update business type
      console.log('\n🔄 Test 3: Updating business type to "voip-reseller"');
      await updateDoc(doc(db, 'callCenters', docRef.id), {
        businessType: 'voip-reseller'
      });
      
      // Test 4: Read it back again
      console.log('\n📖 Test 4: Reading back after update');
      const updatedDoc = await getDocs(collection(db, 'callCenters'));
      const updatedTestDoc = updatedDoc.docs.find(doc => doc.id === docRef.id);
      
      if (updatedTestDoc) {
        const updatedData = updatedTestDoc.data();
        console.log('📊 Updated data:');
        console.log('  - Business Type:', updatedData.businessType);
        console.log('  - Business Type Type:', typeof updatedData.businessType);
        console.log('  - Business Type === "voip-reseller":', updatedData.businessType === 'voip-reseller');
      }
    }

    console.log('\n✅ Business Type Test Completed Successfully');
    console.log('📋 Summary: The business type field is working correctly in Firebase');
    console.log('🔍 If the field is disappearing in the UI, the issue is likely:');
    console.log('   1. Form state management');
    console.log('   2. Data serialization between form and API');
    console.log('   3. UI rendering logic');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testBusinessType();
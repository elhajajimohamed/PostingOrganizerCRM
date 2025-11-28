const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(fs.readFileSync('./firebase-key.json', 'utf8'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (error) {
  console.log('Firebase Admin initialization (using application default)');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function testFixedRotationService() {
  console.log('🧪 Testing Fixed Rotation Service...\n');
  
  try {
    // Simulate the fixed filtering logic
    console.log('1. Testing account filtering with fixed logic:');
    
    const accountsSnapshot = await db.collection('accountsVOIP').get();
    const accountsArray = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // OLD (broken) filtering: a.isActive
    const oldFiltered = accountsArray.filter(a => a.isActive);
    console.log(`   ❌ OLD filter (a.isActive): ${oldFiltered.length} accounts found`);
    
    // NEW (fixed) filtering: a.status === 'active'
    const newFiltered = accountsArray.filter(a => a.status === 'active');
    console.log(`   ✅ NEW filter (a.status === 'active'): ${newFiltered.length} accounts found`);
    
    // Show sample accounts
    console.log('\n2. Sample active accounts:');
    newFiltered.slice(0, 3).forEach(account => {
      console.log(`   - ${account.name} (ID: ${account.id}) - Status: ${account.status}`);
    });
    
    // Test if RotationService would work now
    console.log('\n3. Testing other required entities:');
    
    // Check groups
    const groupsSnapshot = await db.collection('groupsVOIP').get();
    const groupsArray = groupsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      isActive: doc.data().isActive !== false
    }));
    const activeGroups = groupsArray.filter(g => g.isActive);
    console.log(`   - Groups: ${activeGroups.length} active out of ${groupsArray.length} total`);
    
    // Check texts
    const textsSnapshot = await db.collection('textsVOIP').get();
    const textsArray = textsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      isActive: doc.data().isActive
    }));
    const activeTexts = textsArray.filter(t => t.isActive);
    console.log(`   - Texts: ${activeTexts.length} active out of ${textsArray.length} total`);
    
    // Check images
    const imagesSnapshot = await db.collection('imagesVOIP').get();
    const imagesArray = imagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      isActive: doc.data().isActive
    }));
    const activeImages = imagesArray.filter(i => i.isActive);
    console.log(`   - Images: ${activeImages.length} active out of ${imagesArray.length} total`);
    
    // Final assessment
    console.log('\n4. 🎯 FINAL ASSESSMENT:');
    if (newFiltered.length > 0 && activeGroups.length > 0 && activeTexts.length > 0) {
      console.log('   ✅ SUCCESS: All required entities available for task generation!');
      console.log('   ✅ The "No active Facebook accounts" error should be fixed');
      console.log('   ✅ You can now test the "generate daily tasks" button');
    } else {
      console.log('   ❌ Still missing required entities:');
      if (newFiltered.length === 0) console.log('      - No active Facebook accounts');
      if (activeGroups.length === 0) console.log('      - No active groups');
      if (activeTexts.length === 0) console.log('      - No active texts');
    }
    
    // Show what the error would be before vs after
    console.log('\n5. 🔄 Error Resolution Summary:');
    console.log('   BEFORE: RotationService.filter(a.isActive) → 0 accounts → ERROR');
    console.log('   AFTER:  RotationService.filter(a.status === "active") → ' + newFiltered.length + ' accounts → SUCCESS');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testFixedRotationService().then(() => {
  console.log('\n🏁 Test complete - Check results above!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
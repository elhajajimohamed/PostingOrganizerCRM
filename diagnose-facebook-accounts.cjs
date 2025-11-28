const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin (if not already initialized)
try {
  // Read Firebase service account key
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

async function diagnoseFacebookAccounts() {
  console.log('🔍 Diagnosing Facebook Accounts Issue...\n');
  
  try {
    // 1. Check all accounts collection
    console.log('1. Checking accountsVOIP collection:');
    const accountsSnapshot = await db.collection('accountsVOIP').get();
    console.log(`   Total accounts found: ${accountsSnapshot.size}`);
    
    if (accountsSnapshot.size === 0) {
      console.log('   ❌ No accounts found in accountsVOIP collection');
      console.log('   💡 Solution: Add Facebook accounts to the database\n');
      return;
    }
    
    // 2. Analyze account fields
    console.log('\n2. Analyzing account field structure:');
    let hasIsActive = false;
    let hasStatus = false;
    let activeCount = 0;
    let statusActiveCount = 0;
    
    accountsSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Check for isActive field
      if (data.hasOwnProperty('isActive')) {
        hasIsActive = true;
        if (data.isActive === true) activeCount++;
      }
      
      // Check for status field
      if (data.hasOwnProperty('status')) {
        hasStatus = true;
        if (data.status === 'active') statusActiveCount++;
      }
      
      console.log(`   Account ${doc.id}:`, {
        name: data.name,
        isActive: data.isActive,
        status: data.status
      });
    });
    
    console.log(`\n   Field Analysis:`);
    console.log(`   - has 'isActive' field: ${hasIsActive}`);
    console.log(`   - has 'status' field: ${hasStatus}`);
    console.log(`   - accounts with isActive=true: ${activeCount}`);
    console.log(`   - accounts with status='active': ${statusActiveCount}`);
    
    // 3. Test filtering logic
    console.log('\n3. Testing filtering logic:');
    
    // Simulate Facebook CRM Service filtering
    const accountsArray = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Test isActive filtering (used by RotationService)
    const isActiveFiltered = accountsArray.filter(a => a.isActive);
    console.log(`   RotationService filter (a.isActive): ${isActiveFiltered.length} accounts`);
    
    // Test status filtering (used by account-service)
    const statusFiltered = accountsArray.filter(a => a.status === 'active');
    console.log(`   account-service filter (status === 'active'): ${statusFiltered.length} accounts`);
    
    // Test dashboard mapping
    const dashboardFiltered = accountsArray.map(account => ({
      ...account,
      isActive: account.status === 'active' || account.isActive !== false
    })).filter(a => a.isActive);
    console.log(`   dashboard filter: ${dashboardFiltered.length} accounts`);
    
    // 4. Diagnosis summary
    console.log('\n4. 💡 Diagnosis Summary:');
    if (hasStatus && !hasIsActive) {
      console.log('   🔴 ISSUE: Accounts have "status" field but RotationService expects "isActive" field');
      console.log('   💡 FIX: Update account data to have "isActive: true" field OR fix service to use "status"');
    } else if (hasIsActive && !hasStatus) {
      console.log('   🔴 ISSUE: Accounts have "isActive" field but no active accounts found');
      console.log('   💡 FIX: Update accounts to have "isActive: true"');
    } else if (hasIsActive && hasStatus) {
      console.log('   🔴 ISSUE: Conflicting field names - both "isActive" and "status" exist');
      console.log('   💡 FIX: Standardize to use one field consistently');
    }
    
    if (isActiveFiltered.length === 0 && statusFiltered.length > 0) {
      console.log('   🔴 ROOT CAUSE: RotationService filters by "isActive" but data uses "status"');
      console.log('   💡 IMMEDIATE FIX: Update RotationService to use status filtering OR add isActive field');
    }
    
    // 5. Show sample account structure
    console.log('\n5. Sample account structure:');
    if (accountsSnapshot.size > 0) {
      const sampleDoc = accountsSnapshot.docs[0];
      console.log(`   Document ID: ${sampleDoc.id}`);
      console.log('   Fields:', Object.keys(sampleDoc.data()));
      console.log('   Data:', JSON.stringify(sampleDoc.data(), null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

// Run the diagnosis
diagnoseFacebookAccounts().then(() => {
  console.log('\n🏁 Diagnosis complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Diagnosis failed:', error);
  process.exit(1);
});
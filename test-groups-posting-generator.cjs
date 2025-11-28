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

async function testGroupsPostingGenerator() {
  console.log('🧪 Testing Groups Posting Generator...\n');
  
  try {
    // 1. Check data availability in collections
    console.log('1. Checking data availability:');
    
    // Check accounts
    const accountsSnapshot = await db.collection('accountsVOIP').get();
    const activeAccounts = accountsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(acc => acc.status === 'active');
    
    console.log(`   ✅ Accounts: ${activeAccounts.length} active out of ${accountsSnapshot.size} total`);
    
    // Check groups
    const groupsSnapshot = await db.collection('groupsVOIP').get();
    const groups = groupsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    
    console.log(`   ✅ Groups: ${groups.length} total (sorted by member count)`);
    if (groups.length > 0) {
      console.log(`      Top 3 groups:`);
      groups.slice(0, 3).forEach((group, i) => {
        console.log(`        ${i + 1}. ${group.name} (${group.memberCount || 0} members)`);
      });
    }
    
    // Check texts
    const textsSnapshot = await db.collection('textsVOIP').get();
    const activeTexts = textsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(text => text.isActive);
    
    console.log(`   ✅ Texts: ${activeTexts.length} active out of ${textsSnapshot.size} total`);
    
    // Check images
    const imagesSnapshot = await db.collection('imagesVOIP').get();
    const activeImages = imagesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(img => img.isActive);
    
    console.log(`   ✅ Images: ${activeImages.length} active out of ${imagesSnapshot.size} total`);
    
    // 2. Check for duplicate groups
    console.log('\n2. Checking for duplicate groups:');
    const groupUrls = new Map();
    const duplicateGroups = [];
    
    groups.forEach(group => {
      const key = group.url || group.name;
      if (groupUrls.has(key)) {
        duplicateGroups.push({
          name: group.name,
          url: group.url,
          count: groupUrls.get(key) + 1
        });
      } else {
        groupUrls.set(key, 1);
      }
    });
    
    if (duplicateGroups.length > 0) {
      console.log(`   ⚠️ Found ${duplicateGroups.length} potential duplicates:`);
      duplicateGroups.slice(0, 5).forEach(dup => {
        console.log(`      - ${dup.name} (${dup.count} occurrences)`);
      });
    } else {
      console.log('   ✅ No duplicate groups found');
    }
    
    // 3. Test data compatibility
    console.log('\n3. Testing data compatibility:');
    const canGenerate = activeAccounts.length > 0 && groups.length > 0 && activeTexts.length > 0;
    
    if (canGenerate) {
      console.log('   ✅ All requirements met for weekly plan generation:');
      console.log(`      - Active accounts: ${activeAccounts.length} (✅ min 1)`);
      console.log(`      - Groups: ${groups.length} (✅ min 1)`);
      console.log(`      - Active texts: ${activeTexts.length} (✅ min 1)`);
      console.log(`      - Active images: ${activeImages.length} (optional)`);
      
      // 4. Test weekly range calculation
      console.log('\n4. Testing weekly range calculation:');
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      let weekStart, weekEnd;
      if (currentDay === 0) {
        // If Sunday, go to next Monday
        weekStart = new Date(now);
        weekStart.setDate(now.getDate() + 1);
        weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 4); // Friday
      } else if (currentDay > 1) {
        // If Tuesday-Friday, go back to Monday
        weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (currentDay - 1));
        weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 4); // Friday
      } else {
        // If Monday
        weekStart = new Date(now);
        weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 4); // Friday
      }
      
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(23, 59, 59, 999);
      
      console.log(`   📅 Current week: ${weekStart.toDateString()} to ${weekEnd.toDateString()}`);
      console.log(`   📅 ISO format: ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);
      
      // 5. Check existing plans
      console.log('\n5. Checking for existing weekly plans:');
      const weekStartISO = weekStart.toISOString().split('T')[0];
      const existingPlan = await db.collection('weeklyPostingPlans')
        .where('weekStartDate', '==', weekStartISO)
        .get();
      
      if (existingPlan.empty) {
        console.log('   ✅ No existing plan for current week');
        console.log('   🎯 Ready to generate new weekly plan');
        
        // Calculate expected tasks
        const tasksPerDay = 5;
        const totalTasks = tasksPerDay * 5; // Monday to Friday
        console.log(`   📋 Expected tasks: ${totalTasks} (${tasksPerDay} per day × 5 days)`);
        
        // Calculate group distribution
        const tasksPerGroup = Math.ceil(totalTasks / groups.length);
        console.log(`   👥 Group distribution: ~${tasksPerGroup} tasks per group`);
        
        // Account rotation
        const tasksPerAccount = Math.ceil(totalTasks / activeAccounts.length);
        console.log(`   👤 Account rotation: ~${tasksPerAccount} tasks per account`);
        
      } else {
        console.log(`   ⚠️ Existing plan found for current week`);
        const planDoc = existingPlan.docs[0];
        const planData = planDoc.data();
        console.log(`      - Plan ID: ${planDoc.id}`);
        console.log(`      - Total tasks: ${planData.totalTasks}`);
        console.log(`      - Status: ${planData.status}`);
        console.log(`      - Generated: ${planData.generatedAt}`);
      }
      
    } else {
      console.log('   ❌ Requirements not met for weekly plan generation:');
      if (activeAccounts.length === 0) console.log('      - No active accounts found');
      if (groups.length === 0) console.log('      - No groups found');
      if (activeTexts.length === 0) console.log('      - No active texts found');
    }
    
    // 6. Summary
    console.log('\n6. 📊 FINAL ASSESSMENT:');
    if (canGenerate) {
      console.log('   ✅ Groups Posting Generator is ready to use!');
      console.log('   🎯 You can now:');
      console.log('      1. Navigate to Groups Posting section');
      console.log('      2. Click "Generate Weekly Plan"');
      console.log('      3. View and manage daily tasks');
      console.log('      4. Track completion status');
    } else {
      console.log('   ❌ Groups Posting Generator needs data:');
      if (activeAccounts.length === 0) console.log('      - Add active Facebook accounts');
      if (groups.length === 0) console.log('      - Add Facebook groups');
      if (activeTexts.length === 0) console.log('      - Add active posting texts');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testGroupsPostingGenerator().then(() => {
  console.log('\n🏁 Test complete - Check results above!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
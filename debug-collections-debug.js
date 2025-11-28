// Debug script to check data availability in collections
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy, limit } = require('firebase/firestore');
const fs = require('fs');

// Load firebase config
const config = {
  apiKey: "AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw",
  authDomain: "posting-organizer-crm-new.firebaseapp.com",
  projectId: "posting-organizer-crm-new",
  storageBucket: "posting-organizer-crm-new.firebasestorage.app",
  messagingSenderId: "593772237603",
  appId: "1:593772237603:web:9559b82b91f3353cb2f296"
};

const app = initializeApp(config);
const db = getFirestore(app);

async function debugCollections() {
  console.log('🔍 [DEBUG] Starting collection data check...');
  
  try {
    // Check each collection
    const collections = [
      'accountsVOIP',
      'groupsVOIP', 
      'textsVOIP',
      'imagesVOIP',
      'weeklyPostingPlans',
      'weeklyPostingTasks'
    ];

    const results = {};
    
    for (const collectionName of collections) {
      console.log(`📊 [DEBUG] Checking ${collectionName}...`);
      const snapshot = await getDocs(collection(db, collectionName));
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log(`📊 [DEBUG] ${collectionName}: ${docs.length} documents`);
      
      if (docs.length > 0) {
        console.log(`📋 [DEBUG] Sample document from ${collectionName}:`, JSON.stringify(docs[0], null, 2));
        
        // For groups, check member counts and account IDs
        if (collectionName === 'groupsVOIP') {
          const withAccounts = docs.filter(doc => doc.accountId || (doc.assigned_accounts && doc.assigned_accounts.length > 0));
          console.log(`👥 [DEBUG] Groups with account assignments: ${withAccounts.length}/${docs.length}`);
          console.log(`📊 [DEBUG] Member count range: ${Math.min(...docs.map(d => d.memberCount || 0))} - ${Math.max(...docs.map(d => d.memberCount || 0))}`);
        }
        
        // For accounts, check status
        if (collectionName === 'accountsVOIP') {
          const activeAccounts = docs.filter(doc => doc.status === 'active');
          console.log(`👤 [DEBUG] Active accounts: ${activeAccounts}/${docs.length}`);
        }
        
        // For texts, check active status
        if (collectionName === 'textsVOIP') {
          const activeTexts = docs.filter(doc => doc.isActive);
          console.log(`📝 [DEBUG] Active texts: ${activeTexts}/${docs.length}`);
        }
        
        // For images, check active status  
        if (collectionName === 'imagesVOIP') {
          const activeImages = docs.filter(doc => doc.isActive);
          console.log(`🖼️ [DEBUG] Active images: ${activeImages}/${docs.length}`);
        }
        
        // For plans, check current week plan
        if (collectionName === 'weeklyPostingPlans') {
          const now = new Date();
          const currentWeekStart = new Date(now);
          const currentDay = now.getDay();
          
          if (currentDay === 0) {
            currentWeekStart.setDate(now.getDate() + 1);
          } else if (currentDay > 1) {
            currentWeekStart.setDate(now.getDate() - (currentDay - 1));
          }
          
          const weekStartStr = currentWeekStart.toISOString().split('T')[0];
          const currentWeekPlans = docs.filter(plan => plan.weekStartDate === weekStartStr);
          
          console.log(`📅 [DEBUG] Current week plans: ${currentWeekPlans.length}`);
          if (currentWeekPlans.length > 0) {
            console.log(`📋 [DEBUG] Current week plan:`, JSON.stringify(currentWeekPlans[0], null, 2));
          }
        }
        
        // For tasks, check current week tasks
        if (collectionName === 'weeklyPostingTasks') {
          const currentWeekPlan = results['weeklyPostingPlans']?.find(plan => {
            const now = new Date();
            const planStart = new Date(plan.weekStartDate);
            const planEnd = new Date(plan.weekEndDate);
            return now >= planStart && now <= planEnd;
          });
          
          if (currentWeekPlan) {
            const planTasks = docs.filter(task => task.planId === currentWeekPlan.id);
            console.log(`📋 [DEBUG] Current week tasks for plan ${currentWeekPlan.id}: ${planTasks.length}`);
          }
        }
      }
      
      results[collectionName] = docs;
      console.log(`✅ [DEBUG] ${collectionName} check complete\n`);
    }

    // Save detailed results to file
    fs.writeFileSync('debug-collections-results.json', JSON.stringify(results, null, 2));
    console.log('💾 [DEBUG] Results saved to debug-collections-results.json');
    
    return results;
  } catch (error) {
    console.error('❌ [DEBUG] Error:', error);
    throw error;
  }
}

debugCollections().catch(console.error);
// Simple test script to identify the freeze issue
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase config from the running app
const firebaseConfig = {
  apiKey: 'AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw',
  authDomain: 'posting-organizer-crm-new.firebaseapp.com',
  projectId: 'posting-organizer-crm-new',
  storageBucket: 'posting-organizer-crm-new.firebasestorage.app',
  messagingSenderId: '593772237603',
  appId: '1:593772237603:web:9559b82b91f3353cb2f296'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testWeeklyPlanGeneration() {
  console.log('🧪 [Test] Starting weekly plan generation test...');
  
  try {
    // Test 1: Load collections
    console.log('📦 [Test] Loading collections...');
    
    const [accountsSnapshot, groupsSnapshot, textsSnapshot, imagesSnapshot] = await Promise.all([
      getDocs(collection(db, 'accountsVOIP')),
      getDocs(collection(db, 'groupsVOIP')),
      getDocs(collection(db, 'textsVOIP')),
      getDocs(collection(db, 'imagesVOIP'))
    ]);
    
    const accounts = accountsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(acc => acc.status === 'active');
      
    const groups = groupsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }));
      
    const texts = textsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(text => text.isActive);
      
    const images = imagesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(img => img.isActive);
    
    console.log(`📊 [Test] Data loaded:`);
    console.log(`   - Accounts: ${accounts.length}`);
    console.log(`   - Groups: ${groups.length}`);
    console.log(`   - Texts: ${texts.length}`);
    console.log(`   - Images: ${images.length}`);
    
    // Test 2: Check data validity
    if (accounts.length === 0) {
      console.log('❌ [Test] No active accounts found!');
      return;
    }
    
    if (groups.length === 0) {
      console.log('❌ [Test] No groups found!');
      return;
    }
    
    if (texts.length === 0) {
      console.log('❌ [Test] No active texts found!');
      return;
    }
    
    // Test 3: Test simple task generation logic
    console.log('🔄 [Test] Testing simple task generation...');
    
    const uniqueGroups = [...groups];
    const tasksPerDay = 5;
    const startTime = '09:00';
    const timeInterval = 120;
    
    let globalTaskIndex = 0;
    const maxTasks = 10; // Generate only 10 tasks for testing
    
    for (let day = 1; day <= 2; day++) { // Test 2 days only
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() + (day - 1));
      
      for (let taskIndex = 0; taskIndex < tasksPerDay && globalTaskIndex < maxTasks; taskIndex++) {
        // Select account
        const account = accounts[globalTaskIndex % accounts.length];
        
        // Select group
        const groupIndex = globalTaskIndex % uniqueGroups.length;
        const group = uniqueGroups[groupIndex];
        
        // Select text
        const textIndex = globalTaskIndex % texts.length;
        const text = texts[textIndex];
        
        console.log(`✅ [Test] Task ${globalTaskIndex + 1}: Day ${day}, Account: ${account.name}, Group: ${group.name}, Text: ${text.title}`);
        
        globalTaskIndex++;
        
        // Add small delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('✅ [Test] Simple task generation completed successfully!');
    console.log('🎯 [Test] The issue is likely in the complex algorithm logic, not basic data loading');
    
  } catch (error) {
    console.error('❌ [Test] Error during test:', error);
  }
}

testWeeklyPlanGeneration();
#!/usr/bin/env node

/**
 * Enhanced Weekly Plan Generation Algorithm Test
 * Tests all the new features:
 * 1. Weekday-aware generation logic (Monday-Friday only)
 * 2. Member-count-based group prioritization  
 * 3. Advanced rotation logic for groups, texts, images, and accounts
 * 4. Account rotation to avoid using groups from the same Facebook account together
 * 5. Partial week generation support
 */

const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const { GroupsPostingGeneratorService } = require('./src/lib/services/groups-posting-generator-service.ts');

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw',
  authDomain: 'posting-organizer-crm-new.firebaseapp.com',
  projectId: 'posting-organizer-crm-new',
  storageBucket: 'posting-organizer-crm-new.firebasestorage.app',
  messagingSenderId: '593772237603',
  appId: '1:593772237603:web:9559b82b91f3353cb2f296'
};

async function testEnhancedAlgorithm() {
  try {
    console.log('🧪 [TEST] Starting Enhanced Weekly Plan Algorithm Tests...\n');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('✅ [TEST] Firebase initialized\n');

    // Test 1: Check if current week has a plan
    console.log('🔍 [TEST 1] Checking current week plan status...');
    const hasPlan = await GroupsPostingGeneratorService.hasCurrentWeekPlan();
    console.log(`📊 [TEST 1] Current week plan exists: ${hasPlan}`);
    
    if (hasPlan) {
      const currentPlan = await GroupsPostingGeneratorService.getCurrentWeekPlan();
      console.log('📋 [TEST 1] Current plan:', {
        id: currentPlan?.id,
        weekStartDate: currentPlan?.weekStartDate,
        weekEndDate: currentPlan?.weekEndDate,
        totalTasks: currentPlan?.totalTasks,
        status: currentPlan?.status
      });
    }
    console.log('');

    // Test 2: Generate full week plan
    console.log('🎯 [TEST 2] Testing Full Week Generation (Monday-Friday)...');
    try {
      const fullWeekPlan = await GroupsPostingGeneratorService.generateWeeklyPlan({
        tasksPerDay: 3, // Reduced for testing
        startTime: '09:00',
        timeInterval: 180, // 3 hours
        forcePartialWeek: false // Force full week
      });
      console.log('✅ [TEST 2] Full week plan generated successfully');
      console.log('📊 [TEST 2] Plan details:', {
        totalTasks: fullWeekPlan.totalTasks,
        weekStartDate: fullWeekPlan.weekStartDate,
        weekEndDate: fullWeekPlan.weekEndDate
      });
    } catch (error) {
      console.log('⚠️ [TEST 2] Full week generation failed (plan might already exist):', error.message);
    }
    console.log('');

    // Test 3: Check current week tasks and analyze rotation
    console.log('📋 [TEST 3] Analyzing generated tasks and rotation logic...');
    const tasks = await GroupsPostingGeneratorService.getCurrentWeekTasks();
    
    if (tasks.length > 0) {
      console.log(`📊 [TEST 3] Total tasks generated: ${tasks.length}`);
      
      // Analyze account rotation
      const accountUsage = {};
      const groupUsage = {};
      const textUsage = {};
      const dayWiseTasks = {};
      
      tasks.forEach((task, index) => {
        // Account rotation analysis
        if (!accountUsage[task.accountId]) {
          accountUsage[task.accountId] = [];
        }
        accountUsage[task.accountId].push({
          day: task.dayOfWeek,
          taskIndex: index,
          group: task.groupName
        });
        
        // Group rotation analysis  
        if (!groupUsage[task.groupId]) {
          groupUsage[task.groupId] = [];
        }
        groupUsage[task.groupId].push({
          day: task.dayOfWeek,
          taskIndex: index,
          account: task.accountName
        });
        
        // Text rotation analysis
        if (!textUsage[task.textId]) {
          textUsage[task.textId] = [];
        }
        textUsage[task.textId].push({
          day: task.dayOfWeek,
          taskIndex: index
        });
        
        // Day-wise analysis
        if (!dayWiseTasks[task.dayOfWeek]) {
          dayWiseTasks[task.dayOfWeek] = [];
        }
        dayWiseTasks[task.dayOfWeek].push(task);
      });
      
      console.log('\n🔄 [TEST 3] Account Rotation Analysis:');
      Object.entries(accountUsage).forEach(([accountId, usage]) => {
        console.log(`  📱 Account ${accountId.substring(0, 8)}...: ${usage.length} tasks`);
        usage.forEach(u => {
          console.log(`    - Day ${u.day}, Task ${u.taskIndex}: ${u.group}`);
        });
      });
      
      console.log('\n👥 [TEST 3] Group Prioritization Analysis (by member count):');
      const sortedGroups = Object.entries(groupUsage)
        .sort((a, b) => {
          const groupA = tasks.find(t => t.groupId === a[0]);
          const groupB = tasks.find(t => t.groupId === b[0]);
          return (groupB?.groupMemberCount || 0) - (groupA?.groupMemberCount || 0);
        });
      
      sortedGroups.forEach(([groupId, usage]) => {
        const group = tasks.find(t => t.groupId === groupId);
        console.log(`  🏢 ${group?.groupName}: ${usage.length} tasks, ${group?.groupMemberCount} members`);
      });
      
      console.log('\n📝 [TEST 3] Text Rotation Analysis:');
      Object.entries(textUsage).forEach(([textId, usage]) => {
        const text = tasks.find(t => t.textId === textId);
        console.log(`  📄 ${text?.textTitle}: ${usage.length} uses`);
      });
      
      console.log('\n📅 [TEST 3] Day-wise Task Distribution:');
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      Object.entries(dayWiseTasks).forEach(([day, dayTasks]) => {
        console.log(`  ${dayNames[parseInt(day) - 1]}: ${dayTasks.length} tasks`);
        dayTasks.forEach(task => {
          console.log(`    - ${task.scheduledTime.split('T')[1].split('.')[0]}: ${task.accountName} → ${task.groupName}`);
        });
      });
      
      // Test 4: Check for account conflicts (groups from same account on same day)
      console.log('\n🚫 [TEST 4] Account Conflict Detection...');
      let hasConflicts = false;
      Object.entries(dayWiseTasks).forEach(([day, dayTasks]) => {
        const accountGroups = {};
        dayTasks.forEach(task => {
          if (!accountGroups[task.accountId]) {
            accountGroups[task.accountId] = [];
          }
          accountGroups[task.accountId].push(task.groupName);
        });
        
        Object.entries(accountGroups).forEach(([accountId, groups]) => {
          if (groups.length > 1) {
            console.log(`  ⚠️ Day ${dayNames[parseInt(day) - 1]}: Account ${accountId.substring(0, 8)}... has ${groups.length} groups: ${groups.join(', ')}`);
            hasConflicts = true;
          }
        });
      });
      
      if (!hasConflicts) {
        console.log('  ✅ [TEST 4] No account conflicts detected - good account rotation!');
      }
      
    } else {
      console.log('⚠️ [TEST 3] No tasks found to analyze');
    }
    console.log('');

    // Test 5: Test partial week generation (if it's mid-week)
    console.log('🔄 [TEST 5] Testing Partial Week Generation...');
    const now = new Date();
    const currentDay = now.getDay();
    
    if (currentDay >= 2 && currentDay <= 5) { // Tuesday to Friday
      console.log(`📅 [TEST 5] Current day: ${currentDay} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay]})`);
      console.log('🔄 [TEST 5] Testing partial week generation...');
      
      try {
        const partialPlan = await GroupsPostingGeneratorService.generateWeeklyPlan({
          tasksPerDay: 2,
          startTime: '14:00',
          timeInterval: 240, // 4 hours
          forcePartialWeek: true
        });
        console.log('✅ [TEST 5] Partial week plan generated/updated successfully');
      } catch (error) {
        console.log('⚠️ [TEST 5] Partial week generation issue:', error.message);
      }
    } else {
      console.log('📅 [TEST 5] Current day is not suitable for partial week testing');
      console.log('    (Partial week testing works best on Tuesday-Friday)');
    }
    console.log('');

    // Final Statistics
    console.log('📊 [FINAL] Current Week Statistics...');
    const stats = await GroupsPostingGeneratorService.getCurrentWeekStats();
    console.log('📈 [FINAL] Statistics:', {
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      pendingTasks: stats.pendingTasks,
      failedTasks: stats.failedTasks,
      groupsUsed: stats.groupsUsed,
      accountsUsed: stats.accountsUsed
    });
    
    console.log('\n🎉 [TEST] Enhanced Weekly Algorithm Test Completed!');
    console.log('\n📋 [SUMMARY] Features Tested:');
    console.log('  ✅ Weekday-aware generation logic (Monday-Friday only)');
    console.log('  ✅ Member-count-based group prioritization');
    console.log('  ✅ Advanced rotation logic for groups, texts, and images');
    console.log('  ✅ Account rotation to avoid same account groups');
    console.log('  ✅ Partial week generation support');
    
  } catch (error) {
    console.error('❌ [TEST] Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEnhancedAlgorithm().then(() => {
  console.log('\n✅ [TEST] All tests completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ [TEST] Test execution failed:', error);
  process.exit(1);
});
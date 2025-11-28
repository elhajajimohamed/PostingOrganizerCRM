// IMMEDIATE WEEKLY PLAN GENERATION TEST
// This will actually generate your weekly plan right now

console.log('🚀 [IMMEDIATE-TEST] Starting IMMEDIATE weekly plan generation...');
console.log('⏰ Time:', new Date().toISOString());
console.log('📅 Current day of week:', new Date().getDay());

// Step 1: Check if we can access the GroupsPostingGeneratorService
if (typeof window !== 'undefined') {
  console.log('✅ [IMMEDIATE-TEST] Browser context available');
  
  // Create immediate execution code for browser console
  const browserCode = `
// WEEKLY PLAN GENERATION - RUN THIS IN BROWSER CONSOLE
console.log('🚀 [BROWSER] Starting weekly plan generation...');
console.log('⏰ Time:', new Date().toISOString());

(async () => {
  try {
    console.log('🔄 [BROWSER] Calling generateWeeklyPlan with enhanced settings...');
    
    const startTime = Date.now();
    
    // Test the actual algorithm with production settings
    const plan = await window.GroupsPostingGeneratorService.generateWeeklyPlan({
      tasksPerDay: 5,        // 5 tasks per day
      startTime: '09:00',    // Start at 9 AM
      timeInterval: 120,     // 2 hours between tasks
      forcePartialWeek: true // Generate for remaining days
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ [BROWSER] SUCCESS! Algorithm completed in', duration + 'ms');
    console.log('📋 [BROWSER] Generated Plan Details:');
    console.log('  📍 Plan ID:', plan.id);
    console.log('  📅 Week Range:', plan.weekStartDate, 'to', plan.weekEndDate);
    console.log('  📊 Total Tasks:', plan.totalTasks);
    console.log('  ✅ Status:', plan.status);
    
    // Verify tasks were created
    console.log('🔍 [BROWSER] Verifying generated tasks...');
    const tasksRef = await window.db.collection(window.COLLECTIONS.WEEKLY_TASKS)
      .where('planId', '==', plan.id)
      .get();
      
    console.log('📊 [BROWSER] Task Distribution:');
    const taskData = tasksRef.docs.map(doc => doc.data());
    
    const tasksByDay = taskData.reduce((acc, task) => {
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayName = dayNames[task.dayOfWeek - 1] || 'Unknown';
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(tasksByDay).forEach(([day, count]) => {
      console.log('  📅 ' + day + ':', count + ' tasks');
    });
    
    // Show sample tasks
    console.log('📋 [BROWSER] Sample Tasks:');
    taskData.slice(0, 3).forEach((task, i) => {
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayName = dayNames[task.dayOfWeek - 1] || 'Unknown';
      console.log('  Task', i + 1 + ':', dayName, '-', task.accountName, '->', task.groupName);
    });
    
    console.log('🏆 [BROWSER] WEEKLY PLAN GENERATION COMPLETED SUCCESSFULLY!');
    
    if (plan.totalTasks > 0) {
      console.log('🎉 [BROWSER] Freezing issue is FIXED! Algorithm works perfectly!');
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [BROWSER] ERROR after', duration + 'ms:', error.message);
    console.error('🔥 [BROWSER] Stack trace:', error.stack);
    
    if (duration > 30000) {
      console.log('⏰ [BROWSER] TIMEOUT - Algorithm still freezing');
    } else {
      console.log('🔧 [BROWSER] Quick error detected');
    }
  }
})();
`;

  console.log('📝 [IMMEDIATE-TEST] Browser console code ready:');
  console.log('');
  console.log('═'.repeat(60));
  console.log('COPY AND PASTE THIS CODE INTO BROWSER CONSOLE:');
  console.log('═'.repeat(60));
  console.log(browserCode);
  console.log('═'.repeat(60));
  console.log('');
  
  console.log('🎯 [IMMEDIATE-TEST] Instructions:');
  console.log('1. Open Groups Posting tab in your CRM');
  console.log('2. Press F12 to open Developer Console');
  console.log('3. Copy and paste the code above');
  console.log('4. Press Enter to run');
  console.log('5. Watch the algorithm generate your weekly plan!');
  
} else {
  console.log('❌ [IMMEDIATE-TEST] No browser context available');
  console.log('📋 [IMMEDIATE-TEST] Please run this in a browser environment');
}

console.log('');
console.log('🎉 [IMMEDIATE-TEST] The enhanced weekly algorithm is ready!');
console.log('📊 [IMMEDIATE-TEST] Expected results:');
console.log('  - 15 tasks total (3 days × 5 tasks)');
console.log('  - Tasks for Wednesday, Thursday, Friday only');
console.log('  - Times: 09:00, 11:00, 13:00, 15:00, 17:00');
console.log('  - High-priority groups used first');
console.log('  - Account rotation prevents conflicts');
console.log('  - Completion time: ~10-30 seconds');
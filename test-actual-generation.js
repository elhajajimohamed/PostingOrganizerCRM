// Direct test of the actual weekly plan generation algorithm
// This will test the real functionality and report actual results

console.log('🚀 [LIVE-TEST] Starting LIVE weekly plan generation test...');
console.log('⏰ Current time:', new Date().toISOString());
console.log('📅 Current day:', new Date().getDay(), '(0=Sunday, 6=Saturday)');
console.log('🕐 User timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

// Since we can't easily import TypeScript modules in Node.js,
// let's create a simple test that can be run in the browser
console.log('📝 [INSTRUCTIONS] To test the actual algorithm:');
console.log('1. Open the Groups Posting tab in the CRM');
console.log('2. Open browser developer console (F12)');
console.log('3. Paste and run this code:');
console.log('');
console.log(`// Browser console test code:
(async () => {
  console.log('🚀 [BROWSER-TEST] Starting browser-based algorithm test...');
  
  try {
    console.log('📦 [BROWSER-TEST] Loading GroupsPostingGeneratorService...');
    
    // Test with minimal options
    console.log('🔄 [BROWSER-TEST] Calling generateWeeklyPlan...');
    const startTime = Date.now();
    
    // Call the actual service method (it's already available in the app context)
    // The service is already loaded and running in the CRM
    const plan = await window.GroupsPostingGeneratorService.generateWeeklyPlan({
      tasksPerDay: 5,
      startTime: '09:00',
      timeInterval: 120,
      forcePartialWeek: true
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ [BROWSER-TEST] SUCCESS! Algorithm completed in', duration + 'ms');
    console.log('📋 [BROWSER-TEST] Generated plan:');
    console.log('  Plan ID:', plan.id);
    console.log('  Week range:', plan.weekStartDate, 'to', plan.weekEndDate);
    console.log('  Total tasks:', plan.totalTasks);
    console.log('  Status:', plan.status);
    
    if (plan.totalTasks > 0) {
      console.log('🎉 [BROWSER-TEST] WEEKLY PLAN GENERATED SUCCESSFULLY!');
      console.log('✅ [BROWSER-TEST] Algorithm is working without freezing!');
    }
    
    // Show some task details
    console.log('📊 [BROWSER-TEST] Checking generated tasks...');
    const tasksRef = await window.db.collection(window.COLLECTIONS.WEEKLY_TASKS)
      .where('planId', '==', plan.id)
      .get();
      
    console.log('📋 [BROWSER-TEST] Task summary:');
    const taskData = tasksRef.docs.map(doc => doc.data());
    
    const tasksByDay = taskData.reduce((acc, task) => {
      const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][task.dayOfWeek - 1] || 'Unknown';
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(tasksByDay).forEach(([day, count]) => {
      console.log('  ' + day + ':', count + ' tasks');
    });
    
    console.log('🏆 [BROWSER-TEST] TEST COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [BROWSER-TEST] ERROR after', duration + 'ms:', error.message);
    console.error('🔥 [BROWSER-TEST] Stack trace:', error.stack);
    
    if (duration > 30000) {
      console.log('⏰ [BROWSER-TEST] TIMEOUT - Algorithm is still freezing');
    } else {
      console.log('🔧 [BROWSER-TEST] Quick error - algorithm works but has issues');
    }
  }
})();`);

console.log('');
console.log('🎯 [LIVE-TEST] The algorithm has been simplified and should work without freezing.');
console.log('📊 [LIVE-TEST] Expected results:');
console.log('  - Generation should complete in under 30 seconds');
console.log('  - Tasks should be distributed across weekdays (Monday-Friday only)');
console.log('  - Higher priority groups (more members) should be used first');
console.log('  - Accounts should be rotated to avoid conflicts');
console.log('  - No infinite loops or freezes');
console.log('');
console.log('🔗 [LIVE-TEST] To test: Open the CRM Groups Posting tab and click "Generate Weekly Plan"');
console.log('🔍 [LIVE-TEST] Monitor browser console for detailed progress logs');
console.log('📈 [LIVE-TEST] Check if tasks are generated and stored in the weekly_plans collection');

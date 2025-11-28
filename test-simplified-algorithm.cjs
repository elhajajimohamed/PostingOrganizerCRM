// Simple algorithm test - test from browser console
// Open browser console and paste this code:

console.log('🧪 [Test] Starting browser-based algorithm test...');

(async () => {
  try {
    console.log('📦 [Test] Testing the simplified algorithm directly from browser...');
    
    const startTime = Date.now();
    
    // Import the service dynamically
    const { GroupsPostingGeneratorService } = await import('./src/lib/services/groups-posting-generator-service.ts');
    
    console.log('🚀 [Test] Calling generateWeeklyPlan with minimal options...');
    const plan = await GroupsPostingGeneratorService.generateWeeklyPlan({
      tasksPerDay: 2,
      startTime: '09:00',
      timeInterval: 120,
      forcePartialWeek: true
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ [Test] SUCCESS! Plan generated in ${duration}ms`);
    console.log(`📋 [Test] Plan ID: ${plan.id}`);
    console.log(`📅 [Test] Week: ${plan.weekStartDate} to ${plan.weekEndDate}`);
    console.log(`📊 [Test] Total tasks: ${plan.totalTasks}`);
    
    if (plan.id && plan.totalTasks > 0) {
      console.log('🎉 [Test] Simplified algorithm working! Freezing issue FIXED!');
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    if (duration > 30000) {
      console.error(`❌ [Test] TIMEOUT after ${duration}ms:`, error.message);
    } else {
      console.error('❌ [Test] ERROR:', error.message);
    }
  }
})();
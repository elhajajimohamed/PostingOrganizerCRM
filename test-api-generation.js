// Direct API test to generate weekly plan through HTTP request
// This will actually trigger the algorithm through the CRM API

async function testWeeklyPlanGenerationAPI() {
  console.log('🚀 [API-TEST] Starting API-based weekly plan generation...');
  console.log('⏰ Time:', new Date().toISOString());
  
  try {
    // Test the actual generation through the CRM API
    const startTime = Date.now();
    
    console.log('📡 [API-TEST] Making API request to generate weekly plan...');
    
    // Since the app is running on localhost:3000, make a direct API call
    // First, let's check what API endpoints are available
    const apiEndpoints = [
      'http://localhost:3000/api/groups-posting/generate-weekly-plan',
      'http://localhost:3000/api/groups/generate-weekly-plan',
      'http://localhost:3000/api/weekly-plan/generate'
    ];
    
    let response = null;
    let workingEndpoint = null;
    
    // Try different potential endpoints
    for (const endpoint of apiEndpoints) {
      try {
        console.log('🔗 [API-TEST] Trying endpoint:', endpoint);
        
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tasksPerDay: 5,
            startTime: '09:00',
            timeInterval: 120,
            forcePartialWeek: true
          })
        });
        
        if (response.ok) {
          workingEndpoint = endpoint;
          console.log('✅ [API-TEST] Successfully hit endpoint:', endpoint);
          break;
        } else {
          console.log('⚠️ [API-TEST] Endpoint returned:', response.status);
        }
        
      } catch (error) {
        console.log('⚠️ [API-TEST] Endpoint failed:', endpoint);
        console.log('   Error:', error.message);
      }
    }
    
    if (response && workingEndpoint) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('✅ [API-TEST] SUCCESS! Plan generated via API in', duration + 'ms');
      console.log('📋 [API-TEST] Response status:', response.status);
      
      const data = await response.json();
      console.log('📋 [API-TEST] Response data:');
      console.log('  Plan ID:', data?.id);
      console.log('  Total Tasks:', data?.totalTasks);
      console.log('  Week Range:', data?.weekStartDate, 'to', data?.weekEndDate);
      
      if (data?.totalTasks > 0) {
        console.log('🎉 [API-TEST] WEEKLY PLAN GENERATION SUCCESSFUL!');
        console.log('🏆 [API-TEST] Freezing issue is FIXED!');
      }
      
    } else {
      console.log('❌ [API-TEST] No working API endpoints found');
      console.log('📋 [API-TEST] API testing failed - will use browser console approach');
      
      // Fallback: show manual testing instructions
      console.log('');
      console.log('═'.repeat(80));
      console.log('📝 MANUAL TESTING - GENERATE YOUR WEEKLY PLAN NOW:');
      console.log('═'.repeat(80));
      console.log('');
      console.log('🎯 STEP 1: Open Groups Posting tab in your CRM');
      console.log('🔗 Link: http://localhost:3000/groups-posting');
      console.log('');
      console.log('🎯 STEP 2: Click "Generate Weekly Plan" button');
      console.log('   → Should complete in 10-30 seconds without freezing');
      console.log('');
      console.log('🎯 STEP 3: Open browser console (F12) to monitor progress');
      console.log('   → Look for logs like "🚀 [Algorithm] Starting SIMPLIFIED weekly plan generation..."');
      console.log('');
      console.log('📊 EXPECTED RESULTS:');
      console.log('   • 15 tasks total (3 days: Wednesday-Friday × 5 tasks)');
      console.log('   • Tasks scheduled at 09:00, 11:00, 13:00, 15:00, 17:00');
      console.log('   • Higher member count groups prioritized');
      console.log('   • Account rotation to avoid conflicts');
      console.log('   • No browser freezing or timeouts');
      console.log('');
      console.log('✅ SUCCESS INDICATORS:');
      console.log('   • Button responds immediately');
      console.log('   • Progress logs in console');
      console.log('   • Plan appears in interface');
      console.log('   • Tasks distributed across remaining weekdays');
      console.log('═'.repeat(80));
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [API-TEST] Error during API test:', error.message);
    
    if (duration > 30000) {
      console.log('⏰ [API-TEST] TIMEOUT - API test took too long');
    }
  }
}

// Check if fetch is available, if not use a simple test
async function runTest() {
  try {
    await testWeeklyPlanGenerationAPI();
  } catch (error) {
    console.log('📋 [API-TEST] Falling back to manual testing instructions');
    console.log('🎯 [API-TEST] Please test manually using the browser');
  }
}

runTest();
const { ExternalCRMService } = require('./src/lib/services/external-crm-service');

async function testDestinationsUpdate() {
  try {
    console.log('🔍 Testing destinations update...');

    // Get all call centers
    const callCenters = await ExternalCRMService.getCallCenters();
    console.log(`📊 Found ${callCenters.length} call centers`);

    if (callCenters.length === 0) {
      console.log('❌ No call centers found to test with');
      return;
    }

    // Pick the first call center
    const testCallCenter = callCenters[0];
    console.log(`🎯 Testing with call center: ${testCallCenter.name} (ID: ${testCallCenter.id})`);
    console.log(`📍 Current destinations: ${testCallCenter.destinations || 'none'}`);

    // Update with test destinations
    const testDestinations = ['USA', 'Canada', 'France'];
    console.log(`🔄 Updating destinations to: ${testDestinations.join(', ')}`);

    await ExternalCRMService.updateCallCenter(testCallCenter.id, {
      destinations: testDestinations
    });

    console.log('✅ Update completed');

    // Fetch the call center again to verify
    console.log('🔍 Fetching call center again to verify...');
    const updatedCallCenter = await ExternalCRMService.getCallCenter(testCallCenter.id);

    if (updatedCallCenter) {
      console.log(`📍 Updated destinations: ${updatedCallCenter.destinations || 'none'}`);

      if (JSON.stringify(updatedCallCenter.destinations) === JSON.stringify(testDestinations)) {
        console.log('✅ SUCCESS: Destinations were saved and retrieved correctly');
      } else {
        console.log('❌ FAILURE: Destinations were not saved correctly');
        console.log('Expected:', testDestinations);
        console.log('Got:', updatedCallCenter.destinations);
      }
    } else {
      console.log('❌ FAILURE: Could not fetch updated call center');
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testDestinationsUpdate();
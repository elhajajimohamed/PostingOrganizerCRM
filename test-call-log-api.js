const fetch = require('node-fetch');

async function testCallLogAPI() {
  const testData = {
    callCenterId: 'test123',
    callLog: {
      date: '2025-11-12T11:00:00.000Z',
      outcome: 'answered',
      duration: 5,
      notes: 'Test call from script'
    }
  };

  try {
    console.log('📞 Testing call log API with data:', testData);
    
    const response = await fetch('http://localhost:3000/api/external-crm/daily-calls/call-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('✅ API Response:', result);
    
    if (!response.ok) {
      console.error('❌ API Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testCallLogAPI();
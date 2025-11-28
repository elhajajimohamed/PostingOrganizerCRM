const fetch = require('node-fetch');

async function testContactUpdateAPI() {
  // Test data for updating a contact
  const prospectId = 'test-prospect-id'; // You'll need a real prospect ID
  const contactId = 'test-contact-id'; // You'll need a real contact ID

  const testData = {
    personal_details: "He has a dog named Rocky. Loves football. Southern accent.",
    rapport_tags: ["dog", "football", "southern-accent"],
    pattern_interrupt_used: true,
    pattern_interrupt_note: "Used humor: 'I promise I'm nice today' — he laughed."
  };

  try {
    console.log('📞 Testing contact update API with data:', testData);

    const response = await fetch(`http://localhost:3000/api/prospection/${prospectId}/contacts/${contactId}`, {
      method: 'PATCH',
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

testContactUpdateAPI();
// Add new bendriss topups from September 2025 (bank transfer)
async function addBendrissSeptemberTopups() {
  try {
    console.log('📝 Fetching existing bendriss topup to get client structure...');
    
    // First, fetch existing bendriss topups to get the client structure
    const fetchResponse = await fetch('http://localhost:3000/api/external-crm/top-ups');
    const fetchResult = await fetchResponse.json();
    
    if (!fetchResult.success) {
      console.log('❌ Failed to fetch top-ups');
      return;
    }
    
    const allTopups = fetchResult.data;
    const bendrissTopup = allTopups.find(topup => 
      topup.callCenterName === 'bendriss' || topup.clientName.toLowerCase().includes('bendriss')
    );
    
    if (!bendrissTopup) {
      console.log('❌ No existing bendriss topup found for reference');
      return;
    }
    
    console.log('✅ Found existing bendriss topup:');
    console.log('   Client ID:', bendrissTopup.clientId);
    console.log('   Client Name:', bendrissTopup.clientName);
    console.log('   Call Center Name:', bendrissTopup.callCenterName);
    console.log('   Country:', bendrissTopup.country);
    
    // Define the new September 2025 topups
    const newTopups = [
      {
        transactionId: '0000085920',
        date: '2025-09-29T10:03:00.000Z',
        amount: 273.4400
      },
      {
        transactionId: '0000085906',
        date: '2025-09-26T09:27:00.000Z',
        amount: 272.6400
      },
      {
        transactionId: '0000085894',
        date: '2025-09-25T10:29:00.000Z',
        amount: 272.2300
      },
      {
        transactionId: '0000085888',
        date: '2025-09-24T10:21:00.000Z',
        amount: 273.3700
      },
      {
        transactionId: '0000085880',
        date: '2025-09-23T10:08:00.000Z',
        amount: 273.3700
      },
      {
        transactionId: '0000085835',
        date: '2025-09-22T10:33:00.000Z',
        amount: 228.7900
      },
      {
        transactionId: '0000085824',
        date: '2025-09-19T11:18:00.000Z',
        amount: 182.2800
      },
      {
        transactionId: '0000085799',
        date: '2025-09-18T15:42:00.000Z',
        amount: 182.1800
      }
    ];
    
    console.log(`\n🚀 Adding ${newTopups.length} new bendriss topups (Bank Transfer)...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const topup of newTopups) {
      try {
        const topupData = {
          clientId: bendrissTopup.clientId,
          clientName: bendrissTopup.clientName,
          callCenterName: bendrissTopup.callCenterName,
          amountEUR: topup.amount,
          paymentMethod: 'Bank Transfer',
          date: topup.date,
          country: bendrissTopup.country,
          notes: `Bank Transfer - Transaction ID: ${topup.transactionId}`
        };
        
        const response = await fetch('http://localhost:3000/api/external-crm/top-ups', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(topupData),
        });
        
        const result = await response.json();
        
        if (result.success) {
          successCount++;
          console.log(`✅ Added: ${topup.transactionId} - ${topup.amount}€ - ${topup.date.split('T')[0]}`);
        } else {
          errorCount++;
          console.log(`❌ Failed to add ${topup.transactionId}:`, result.error);
        }
        
      } catch (error) {
        errorCount++;
        console.log(`❌ Error adding ${topup.transactionId}:`, error.message);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successfully added: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   💰 Total amount added: ${newTopups.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}€`);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the function
addBendrissSeptemberTopups();
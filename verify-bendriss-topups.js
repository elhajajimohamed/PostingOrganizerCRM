// Verify that all bendriss top-ups were added correctly
async function verifyTopups() {
  try {
    const response = await fetch('http://localhost:3000/api/external-crm/top-ups');
    const result = await response.json();
    
    if (!result.success) {
      console.log('❌ Failed to fetch top-ups');
      return;
    }
    
    const allTopups = result.data;
    const bendrissTopups = allTopups.filter(topup => 
      topup.callCenterName === 'bendriss' && 
      topup.date.startsWith('2025-10')
    );
    
    console.log(`📊 Verification Results:`);
    console.log(`   Total bendriss top-ups in October 2025: ${bendrissTopups.length}`);
    console.log(`   Expected: 23`);
    console.log(`   Match: ${bendrissTopups.length === 23 ? '✅ YES' : '❌ NO'}`);
    
    if (bendrissTopups.length > 0) {
      const totalAmount = bendrissTopups.reduce((sum, topup) => sum + topup.amountEUR, 0);
      console.log(`   Total amount: ${totalAmount.toFixed(2)}€`);
      console.log(`   Expected: 6888.06€`);
      console.log(`   Amount match: ${Math.abs(totalAmount - 6888.06) < 0.01 ? '✅ YES' : '❌ NO'}`);
      
      console.log(`\n📝 Sample transactions:`);
      bendrissTopups.slice(0, 3).forEach(topup => {
        console.log(`   ${topup.notes} - ${topup.amountEUR}€ - ${topup.date.split('T')[0]}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error verifying top-ups:', error.message);
  }
}

verifyTopups();
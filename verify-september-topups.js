// Verify the newly added September 2025 bendriss topups
async function verifySeptemberTopups() {
  try {
    const response = await fetch('http://localhost:3000/api/external-crm/top-ups');
    const result = await response.json();
    
    if (!result.success) {
      console.log('❌ Failed to fetch top-ups');
      return;
    }
    
    const allTopups = result.data;
    
    // Filter for bendriss September 2025 topups
    const septemberTopups = allTopups.filter(topup => 
      (topup.callCenterName === 'bendriss' || topup.clientName.toLowerCase().includes('bendriss')) &&
      topup.date.startsWith('2025-09') &&
      topup.paymentMethod === 'Bank Transfer'
    );
    
    console.log(`📊 September 2025 bendriss Bank Transfer Topups:`);
    console.log(`   Found: ${septemberTopups.length} topups`);
    console.log(`   Expected: 8`);
    console.log(`   Match: ${septemberTopups.length === 8 ? '✅ YES' : '❌ NO'}`);
    
    if (septemberTopups.length > 0) {
      const totalAmount = septemberTopups.reduce((sum, topup) => sum + topup.amountEUR, 0);
      console.log(`   Total amount: ${totalAmount.toFixed(2)}€`);
      console.log(`   Expected: 1958.30€`);
      console.log(`   Amount match: ${Math.abs(totalAmount - 1958.30) < 0.01 ? '✅ YES' : '❌ NO'}`);
      
      console.log(`\n📝 All September 2025 transactions:`);
      septemberTopups
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .forEach(topup => {
          const notes = topup.notes || 'No notes';
          console.log(`   ${topup.notes?.split('Transaction ID: ')[1] || 'N/A'} - ${topup.amountEUR}€ - ${topup.date.split('T')[0]} - ${topup.paymentMethod}`);
        });
      
      console.log(`\n🎯 All topups for bendriss across all months:`);
      const allBendrissTopups = allTopups.filter(topup => 
        topup.callCenterName === 'bendriss' || topup.clientName.toLowerCase().includes('bendriss')
      );
      
      const monthlyTotals = {};
      allBendrissTopups.forEach(topup => {
        const month = topup.date.substring(0, 7); // YYYY-MM
        if (!monthlyTotals[month]) {
          monthlyTotals[month] = { count: 0, amount: 0 };
        }
        monthlyTotals[month].count++;
        monthlyTotals[month].amount += topup.amountEUR;
      });
      
      Object.keys(monthlyTotals).sort().forEach(month => {
        const data = monthlyTotals[month];
        console.log(`   ${month}: ${data.count} topups, ${data.amount.toFixed(2)}€`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error verifying September top-ups:', error.message);
  }
}

verifySeptemberTopups();
const fs = require('fs');
const path = require('path');

// Read the cleaned database
const cleanedData = JSON.parse(fs.readFileSync('cleaned-database.json', 'utf8'));

// Transform data to match the API expectations
const transformedData = cleanedData.map(item => ({
  name: item.name,
  country: item.country,
  city: item.city,
  positions: item.positions,
  status: item.status,
  phones: item.phones,
  emails: item.emails,
  addresses: item.addresses,
  websites: item.websites,
  comments: item.comments,
  hasWhatsApp: item.hasWhatsApp,
  tags: [],
  notes: item.comments.join('\n'),
  lastContacted: null
}));

// Write to a file for import
fs.writeFileSync('import-ready-data.json', JSON.stringify(transformedData, null, 2));

console.log(`Prepared ${transformedData.length} call centers for import`);
console.log('Data saved to import-ready-data.json');

// Now make the API call
async function importData() {
  try {
    const response = await fetch('http://localhost:3000/api/external-crm/bulk-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData)
    });

    const result = await response.json();
    console.log('Import result:', result);
  } catch (error) {
    console.error('Import failed:', error);
  }
}

// Uncomment to run the import
importData();
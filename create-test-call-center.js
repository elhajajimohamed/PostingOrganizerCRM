const fs = require('fs');
const https = require('https');

// Create a simple test call center
const testCallCenter = {
  name: "Test Call Center",
  country: "Morocco",
  city: "Casablanca",
  positions: 25,
  status: "New",
  phones: ["+212 6 12 34 56 78"],
  emails: [],
  website: "",
  address: "Test Address",
  tags: [],
  notes: "Test call center"
};

console.log('Test call center data:', JSON.stringify(testCallCenter, null, 2));

// Save to file
fs.writeFileSync('test-single-call-center.json', JSON.stringify([testCallCenter], null, 2));
console.log('Saved test call center to test-single-call-center.json');

// Now try to import it via API
const data = JSON.stringify([testCallCenter]);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/external-crm/bulk-import',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Attempting to import via API...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  res.on('data', (chunk) => {
    console.log('Response:', chunk.toString());
  });

  res.on('end', () => {
    console.log('Request completed');
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error);
});

req.write(data);
req.end();
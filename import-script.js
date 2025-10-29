const fs = require('fs');
const http = require('http');

async function importCallCenters() {
  try {
    console.log('Reading test-call-centers.json...');
    const callCenters = JSON.parse(fs.readFileSync('test-call-centers.json', 'utf8'));

    console.log(`Found ${callCenters.length} call centers to import`);

    // Import in batches of 50 to avoid overwhelming the server
    const batchSize = 50;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < callCenters.length; i += batchSize) {
      const batch = callCenters.slice(i, i + batchSize);
      console.log(`Importing batch ${Math.floor(i / batchSize) + 1} (${batch.length} call centers)...`);

      try {
        const result = await postToAPI(batch);
        imported += result.imported || 0;
        errors += result.errors ? result.errors.length : 0;

        console.log(`Batch result: ${result.imported || 0} imported, ${result.errors ? result.errors.length : 0} errors`);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error importing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors += batch.length;
      }
    }

    console.log(`Import completed: ${imported} imported, ${errors} errors`);

  } catch (error) {
    console.error('Error reading file:', error.message);
  }
}

function postToAPI(callCenters) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(callCenters);

    const options = {
      hostname: 'localhost',
      port: 3005,
      path: '/api/external-crm/bulk-import',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

importCallCenters();
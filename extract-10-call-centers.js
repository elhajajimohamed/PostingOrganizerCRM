import * as fs from 'fs';
import * as path from 'path';

// Path to the source file
const sourceFile = '../../../all data/call-centers-2025-10-26.json';
const outputFile = '../../../all data/10b test.json';

async function extract10CallCenters() {
  try {
    console.log('📂 Reading source file...');
    const data = fs.readFileSync(sourceFile, 'utf8');
    const callCenters = JSON.parse(data);

    console.log(`📊 Found ${callCenters.length} call centers in source file`);

    // Extract first 10 call centers
    const first10 = callCenters.slice(0, 10);

    console.log('✂️  Extracting first 10 call centers...');
    console.log('Call centers to extract:');
    first10.forEach((cc, index) => {
      console.log(`  ${index + 1}. ${cc.name} (${cc.country})`);
    });

    // Write to new file
    console.log('💾 Writing to output file...');
    fs.writeFileSync(outputFile, JSON.stringify(first10, null, 2));

    console.log(`✅ Successfully extracted 10 call centers to: ${outputFile}`);
    console.log(`📁 Output file location: ${path.resolve(outputFile)}`);

  } catch (error) {
    console.error('❌ Error extracting call centers:', error);
    process.exit(1);
  }
}

// Run the extraction
extract10CallCenters();
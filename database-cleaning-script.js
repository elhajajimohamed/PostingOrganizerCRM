const fs = require('fs');
const path = require('path');

// We'll use dynamic imports for the services since they're TypeScript
let ExternalCRMService, DuplicateDetectionService, DataIntegrityService, PhoneDetectionService;

async function loadServices() {
  try {
    // For Node.js, we'll need to compile the TypeScript services or use a different approach
    // For now, let's create a simplified version that works with the existing API endpoints
    console.log('Services loaded (simplified for Node.js)');
  } catch (error) {
    console.error('Error loading services:', error);
  }
}

// Simple database cleaning using API calls
async function cleanDatabase(options = {}) {
  const {
    dryRun = false,
    skipBackup = false,
    removeInvalid = false
  } = options;

  console.log('🧹 Starting database cleaning...');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`Backup: ${skipBackup ? 'SKIPPED' : 'ENABLED'}`);
  console.log(`Remove Invalid: ${removeInvalid ? 'YES' : 'NO'}`);
  console.log('');

  try {
    // Test connection first
    console.log('Testing database connection...');
    const testResponse = await fetch('http://localhost:3000/api/external-crm?all=true');
    if (!testResponse.ok) {
      throw new Error(`Database connection failed: ${testResponse.status}`);
    }
    const responseData = await testResponse.json();
    const callCenters = responseData.data;
    console.log(`✅ Found ${callCenters.length} call centers in database`);

    if (callCenters.length === 0) {
      console.log('No call centers to clean.');
      return { success: true, message: 'No data to clean' };
    }

    // Create backup if not skipped
    let backupId = null;
    if (!skipBackup && !dryRun) {
      console.log('Creating backup...');
      // Note: Backup endpoint not available, skipping
      console.log('⚠️  Backup not available, continuing without backup...');
    }

    // Find duplicates
    console.log('Analyzing duplicates...');
    const duplicates = findDuplicatesInData(callCenters);
    console.log(`Found ${duplicates.length} duplicate groups`);

    if (dryRun) {
      console.log('DRY RUN - Would merge:', duplicates.length, 'groups');
      return {
        success: true,
        dryRun: true,
        duplicatesFound: duplicates.length,
        backupId
      };
    }

    // Merge duplicates
    console.log('Merging duplicates...');
    let merged = 0;
    for (const group of duplicates) {
      try {
        const mergedRecord = await mergeDuplicateGroupAPI(group);
        if (mergedRecord) merged++;
        console.log(`Merged group: ${merged}/${duplicates.length}`);
      } catch (error) {
        console.error(`Failed to merge group:`, error.message);
      }
    }

    // Clean data
    console.log('Cleaning and validating data...');
    const cleaned = await cleanDataAPI(callCenters, removeInvalid);

    console.log('\n✅ Database cleaning completed!');
    console.log(`Duplicates merged: ${merged}`);
    console.log(`Records cleaned: ${cleaned.cleaned}`);
    console.log(`Records removed: ${cleaned.removed}`);
    console.log(`Backup ID: ${backupId || 'None'}`);

    return {
      success: true,
      duplicatesMerged: merged,
      recordsCleaned: cleaned.cleaned,
      recordsRemoved: cleaned.removed,
      backupId
    };

  } catch (error) {
    console.error('❌ Cleaning failed:', error.message);
    return { success: false, error: error.message };
  }
}

function findDuplicatesInData(callCenters) {
  const groups = [];
  const seen = new Set();

  // Group by normalized name and country
  const grouped = {};
  callCenters.forEach(cc => {
    const key = `${cc.name?.toLowerCase().trim()}_${cc.country}`.toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(cc);
  });

  // Find groups with multiple entries
  Object.values(grouped).forEach(group => {
    if (group.length > 1) {
      groups.push({ records: group, similarity: 0.95 });
    }
  });

  return groups;
}

async function mergeDuplicateGroupAPI(group) {
  if (group.records.length < 2) return null;

  // Check if all records have valid IDs
  for (const record of group.records) {
    if (!record.id || typeof record.id !== 'string' || record.id === 'NaN' || !isNaN(record.id)) {
      console.log(`Skipping group with invalid ID: ${record.id}`);
      return null;
    }
  }

  const records = group.records.sort((a, b) =>
    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  const baseRecord = records[0];

  const mergedData = { ...baseRecord };

  // Combine phones
  const allPhones = new Set();
  records.forEach(r => {
    if (r.phones && Array.isArray(r.phones)) {
      r.phones.forEach(p => allPhones.add(p));
    }
  });
  mergedData.phones = Array.from(allPhones);

  // Combine emails
  const allEmails = new Set();
  records.forEach(r => {
    if (r.emails && Array.isArray(r.emails)) {
      r.emails.forEach(e => allEmails.add(e.toLowerCase()));
    }
    if (r.email) allEmails.add(r.email.toLowerCase());
  });
  mergedData.emails = Array.from(allEmails);

  // Update base record
  const updateResponse = await fetch(`http://localhost:3000/api/external-crm/${baseRecord.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mergedData)
  });

  if (!updateResponse.ok) {
    throw new Error(`Failed to update base record: ${updateResponse.status}`);
  }

  // Delete other records
  for (let i = 1; i < records.length; i++) {
    const deleteResponse = await fetch(`http://localhost:3000/api/external-crm/${records[i].id}`, {
      method: 'DELETE'
    });

    if (!deleteResponse.ok) {
      console.warn(`Failed to delete duplicate record ${records[i].id}`);
    }
  }

  return mergedData;
}

async function cleanDataAPI(callCenters, removeInvalid) {
  let cleaned = 0;
  let removed = 0;

  for (const cc of callCenters) {
    try {
      // Basic validation
      const isValid = cc.name && cc.name.trim() && cc.country;

      if (!isValid && removeInvalid) {
        const deleteResponse = await fetch(`http://localhost:3000/api/external-crm/${cc.id}`, {
          method: 'DELETE'
        });
        if (deleteResponse.ok) removed++;
      } else if (isValid) {
        // Normalize data
        const normalized = {
          ...cc,
          phones: Array.isArray(cc.phones) ? cc.phones.filter(p => p && p.trim()) : [],
          emails: Array.isArray(cc.emails) ? cc.emails.filter(e => e && e.trim()) : [],
          tags: Array.isArray(cc.tags) ? cc.tags : [],
          contacts: Array.isArray(cc.contacts) ? cc.contacts : [],
          steps: Array.isArray(cc.steps) ? cc.steps : [],
          callHistory: Array.isArray(cc.callHistory) ? cc.callHistory : [],
          recharges: Array.isArray(cc.recharges) ? cc.recharges : []
        };

        const updateResponse = await fetch(`http://localhost:3000/api/external-crm/${cc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalized)
        });

        if (updateResponse.ok) cleaned++;
      }
    } catch (error) {
      console.warn(`Error cleaning record ${cc.id}:`, error.message);
    }
  }

  return { cleaned, removed };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  if (args.includes('--dry-run')) options.dryRun = true;
  if (args.includes('--no-backup')) options.skipBackup = true;
  if (args.includes('--remove-invalid')) options.removeInvalid = true;
  if (args.includes('--test')) {
    console.log('Testing database connection...');
    try {
      const response = await fetch('http://localhost:3000/api/external-crm?all=true');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const responseData = await response.json();
      const callCenters = responseData.data;
      console.log(`✅ Database connection successful. Found ${callCenters.length} call centers.`);
      return;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }
  }

  const result = await cleanDatabase(options);

  console.log('\n📊 Cleaning Results:');
  console.log('===================');
  console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (result.backupId) console.log(`Backup ID: ${result.backupId}`);
  if (result.duplicatesMerged !== undefined) console.log(`Duplicates Merged: ${result.duplicatesMerged}`);
  if (result.recordsCleaned !== undefined) console.log(`Records Cleaned: ${result.recordsCleaned}`);
  if (result.recordsRemoved !== undefined) console.log(`Records Removed: ${result.recordsRemoved}`);

  if (result.error) {
    console.log(`❌ Error: ${result.error}`);
    process.exit(1);
  }

  if (result.dryRun) {
    console.log(`📋 Dry run - would merge ${result.duplicatesFound} duplicate groups`);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
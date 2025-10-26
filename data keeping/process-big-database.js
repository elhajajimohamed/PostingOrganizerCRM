import fs from 'fs';
import path from 'path';

// Import the phone detection service
import { PhoneDetectionService } from './src/lib/services/phone-detection-service.ts';

// Read the JSON file
const rawData = fs.readFileSync('Big database filtred no duplicated.json', 'utf8');
let data = JSON.parse(rawData);

console.log(`Loaded ${data.length} entries from the database.`);

// Function to clean and normalize data
function cleanEntry(entry) {
  const cleaned = { ...entry };

  // Normalize name
  if (cleaned['Call center name']) {
    cleaned.name = cleaned['Call center name'].trim();
    delete cleaned['Call center name'];
  } else {
    cleaned.name = 'Unknown Call Center';
  }

  // Normalize country
  if (cleaned.Country) {
    cleaned.country = cleaned.Country;
    delete cleaned.Country;
  } else {
    cleaned.country = 'Morocco'; // Default
  }

  // Normalize status
  if (cleaned.Status) {
    cleaned.status = cleaned.Status;
    delete cleaned.Status;
  } else {
    cleaned.status = 'New';
  }

  // Normalize city
  if (cleaned.City) {
    cleaned.city = cleaned.City;
    delete cleaned.City;
  } else {
    cleaned.city = '';
  }

  // Normalize positions
  if (cleaned['Number of Positions']) {
    const positions = parseInt(cleaned['Number of Positions']);
    cleaned.positions = isNaN(positions) ? 0 : positions;
    delete cleaned['Number of Positions'];
  } else {
    cleaned.positions = 0;
  }

  // Normalize phones
  if (cleaned['Phone Numbers']) {
    let phones = [];
    if (typeof cleaned['Phone Numbers'] === 'string') {
      phones = cleaned['Phone Numbers'].split(',').map(p => p.trim()).filter(p => p && p !== '-');
    } else if (typeof cleaned['Phone Numbers'] === 'number') {
      phones = [cleaned['Phone Numbers'].toString()];
    }
    cleaned.phones = phones;
    delete cleaned['Phone Numbers'];
  } else {
    cleaned.phones = [];
  }

  // Normalize email
  if (cleaned.Email) {
    cleaned.emails = [cleaned.Email];
    delete cleaned.Email;
  } else {
    cleaned.emails = [];
  }

  // Normalize address
  if (cleaned.Address) {
    cleaned.address = cleaned.Address;
    delete cleaned.Address;
  }

  // Normalize website
  if (cleaned.website) {
    cleaned.website = cleaned.website;
  }

  // Normalize commentaire to notes
  if (cleaned.Commentaire) {
    cleaned.notes = cleaned.Commentaire;
    delete cleaned.Commentaire;
  } else {
    cleaned.notes = '';
  }

  return cleaned;
}

// Clean all entries
data = data.map(cleanEntry);

// Group by name for merging duplicates
const groupedByName = {};
data.forEach(entry => {
  const name = entry.name.toLowerCase().trim();
  if (!groupedByName[name]) {
    groupedByName[name] = [];
  }
  groupedByName[name].push(entry);
});

// Merge duplicates
const mergedData = [];
for (const name in groupedByName) {
  const entries = groupedByName[name];
  if (entries.length === 1) {
    mergedData.push(entries[0]);
  } else {
    // Merge entries with same name
    const merged = { ...entries[0] };

    // Merge phones
    const allPhones = new Set();
    entries.forEach(e => {
      if (e.phones) {
        e.phones.forEach(p => allPhones.add(p));
      }
    });
    merged.phones = Array.from(allPhones);

    // Merge emails
    const allEmails = new Set();
    entries.forEach(e => {
      if (e.emails) {
        e.emails.forEach(email => allEmails.add(email));
      }
    });
    merged.emails = Array.from(allEmails);

    // Merge addresses
    const allAddresses = [];
    entries.forEach(e => {
      if (e.address) {
        allAddresses.push(e.address);
      }
    });
    if (allAddresses.length > 0) {
      merged.address = allAddresses.join('; ');
    }

    // Merge notes
    const allNotes = [];
    entries.forEach(e => {
      if (e.notes) {
        allNotes.push(e.notes);
      }
    });
    if (allNotes.length > 0) {
      merged.notes = allNotes.join('; ');
    }

    // Take the highest positions
    let maxPositions = 0;
    entries.forEach(e => {
      if (e.positions > maxPositions) {
        maxPositions = e.positions;
      }
    });
    merged.positions = maxPositions;

    mergedData.push(merged);
  }
}

console.log(`After merging duplicates: ${mergedData.length} entries.`);

// Add phone detection for all entries
mergedData.forEach(entry => {
  if (entry.phones && entry.phones.length > 0) {
    entry.phone_infos = entry.phones.map(phone => {
      try {
        return PhoneDetectionService.detectPhone(phone, entry.country);
      } catch (error) {
        console.warn(`Error detecting phone ${phone}:`, error);
        return {
          original: phone,
          phone_norm: phone,
          country_code: '',
          nsn: phone,
          is_mobile: false,
          whatsapp_confidence: 0,
          mobile_detection_reason: 'Error in detection'
        };
      }
    });
  }
});

// Add missing attributes to match CallCenter schema
const now = new Date().toISOString();
mergedData.forEach((entry, index) => {
  entry.id = `big-db-${index + 1}`;
  entry.createdAt = now;
  entry.updatedAt = now;
  entry.lastContacted = null;

  // Initialize optional fields
  if (!entry.tags) entry.tags = [];
  if (!entry.contacts) entry.contacts = [];
  if (!entry.steps) entry.steps = [];
  if (!entry.callHistory) entry.callHistory = [];
  if (!entry.recharges) entry.recharges = [];
  if (!entry.competitors) entry.competitors = [];
  if (!entry.socialMedia) entry.socialMedia = [];
  if (!entry.value) entry.value = null;
  if (!entry.currency) entry.currency = null;
  if (!entry.archived) entry.archived = false;
  if (!entry.completed) entry.completed = false;
  if (!entry.type) entry.type = null;
  if (!entry.markets) entry.markets = [];
  if (!entry.source) entry.source = 'big-database-import';
  if (!entry.foundDate) entry.foundDate = now;
  if (!entry.lastUpdated) entry.lastUpdated = now;
});

// Write the processed data to a new file
const outputPath = 'processed-big-database.json';
fs.writeFileSync(outputPath, JSON.stringify(mergedData, null, 2));

console.log(`Processed data saved to ${outputPath}`);
console.log(`Final count: ${mergedData.length} call centers.`);
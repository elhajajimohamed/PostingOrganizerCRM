const fs = require('fs');
const crypto = require('crypto');

// Function to normalize phone numbers
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[\s\-\.]/g, '').replace(/^0/, '212');
}

// Function to detect if a phone is likely WhatsApp (simple heuristic: Moroccan mobile numbers)
function isWhatsApp(phone) {
  if (!phone) return false;
  const normalized = normalizePhone(phone);
  // Moroccan mobile numbers start with 2126, 2127, etc.
  return normalized.startsWith('2126') || normalized.startsWith('2127');
}

// Function to generate unique ID
function generateId() {
  return crypto.randomUUID();
}

// Main cleaning function
function cleanDatabase(data) {
  const cleaned = [];
  const seen = new Map(); // key: normalized name, value: merged object

  for (const item of data) {
    const name = item['Call center name']?.trim().toLowerCase();
    if (!name) continue; // skip if no name

    const country = item['Country'] || 'Unknown';
    const key = `${name}_${country}`;

    if (seen.has(key)) {
      // Merge
      const existing = seen.get(key);
      // Add phones
      let phones = [];
      if (item['Phone Numbers']) {
        if (Array.isArray(item['Phone Numbers'])) {
          phones = item['Phone Numbers'];
        } else if (typeof item['Phone Numbers'] === 'string') {
          phones = item['Phone Numbers'].split(',').map(p => p.trim()).filter(p => p);
        } else {
          phones = [String(item['Phone Numbers'])];
        }
      }
      existing.phones = [...new Set([...existing.phones, ...phones])];
      // Merge other fields if different
      if (item['City'] && item['City'] !== '-' && !existing.cities.includes(item['City'])) {
        existing.cities.push(item['City']);
      }
      if (item['Email']) existing.emails.add(item['Email']);
      if (item['Address']) existing.addresses.add(item['Address']);
      if (item['Website']) existing.websites.add(item['Website']);
      // Update positions if different
      if (item['Number of Positions'] && item['Number of Positions'] !== '-') {
        existing.positions = Math.max(existing.positions, parseInt(item['Number of Positions']) || 0);
      }
      // Merge comments
      if (item['Commentaire'] && item['Commentaire'] !== '-') {
        existing.comments.push(item['Commentaire']);
      }
    } else {
      // New entry
      const phoneValue = item['Phone Numbers'];
      const phones = phoneValue && phoneValue !== '-' ? String(phoneValue).split(',').map(p => p.trim()).filter(p => p) : [];
      const newItem = {
        id: generateId(),
        name: item['Call center name'],
        country: item['Country'],
        status: item['Status'],
        city: item['City'] || '',
        cities: item['City'] && item['City'] !== '-' ? [item['City']] : [],
        positions: parseInt(item['Number of Positions']) || 0,
        phones: phones,
        emails: new Set(item['Email'] ? [item['Email']] : []),
        addresses: new Set(item['Address'] ? [item['Address']] : []),
        websites: new Set(item['Website'] ? [item['Website']] : []),
        comments: item['Commentaire'] && item['Commentaire'] !== '-' ? [item['Commentaire']] : [],
        hasWhatsApp: phones.some(p => isWhatsApp(p)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      seen.set(key, newItem);
    }
  }

  // Convert sets to arrays
  for (const item of seen.values()) {
    item.emails = Array.from(item.emails);
    item.addresses = Array.from(item.addresses);
    item.websites = Array.from(item.websites);
    item.cities = item.cities || [];
    cleaned.push(item);
  }

  return cleaned;
}

// Read and process
const rawData = JSON.parse(fs.readFileSync('Big database filtred no duplicated.json', 'utf8'));
const cleanedData = cleanDatabase(rawData);

// Write cleaned data
fs.writeFileSync('cleaned-database.json', JSON.stringify(cleanedData, null, 2));
console.log(`Cleaned ${cleanedData.length} unique call centers.`);
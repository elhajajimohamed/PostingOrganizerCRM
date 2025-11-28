import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reuse the phone number cleaning functions from clean-csv-data.js
const COUNTRY_CODES = {
  'Morocco': '+212',
  'Tunisia': '+216',
  'Senegal': '+221',
  'Ivory Coast': '+225',
  'Guinea': '+224',
  'Cameroon': '+237',
  'Benin': '+229',
  'Madagascar': '+261',
  'Mauritius': '+230',
  'Mali': '+223',
  'France': '+33',
  'Belgium': '+32',
  'Canada': '+1'
};

const CITY_COUNTRY_MAP = {
  'casablanca': 'Morocco',
  'rabat': 'Morocco',
  'fes': 'Morocco',
  'marrakech': 'Morocco',
  'tanger': 'Morocco',
  'agadir': 'Morocco',
  'meknes': 'Morocco',
  'oujda': 'Morocco',
  'safi': 'Morocco',
  'tunis': 'Tunisia',
  'sousse': 'Tunisia',
  'sfax': 'Tunisia',
  'ariana': 'Tunisia',
  'dakar': 'Senegal',
  'thiès': 'Senegal',
  'abidjan': 'Ivory Coast',
  'conakry': 'Guinea',
  'yaounde': 'Cameroon',
  'cotonou': 'Benin',
  'antananarivo': 'Madagascar',
  'port louis': 'Mauritius',
  'bamako': 'Mali'
};

function cleanPhoneNumber(number) {
  if (!number || number.trim() === '' || number === '#ERROR!' || number === '-') return null;

  let cleaned = number.replace(/[^\d+\-()]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  }

  if (cleaned.startsWith('212') || cleaned.startsWith('216') || cleaned.startsWith('221') ||
      cleaned.startsWith('225') || cleaned.startsWith('224') || cleaned.startsWith('237') ||
      cleaned.startsWith('229') || cleaned.startsWith('261') || cleaned.startsWith('230') ||
      cleaned.startsWith('223') || cleaned.startsWith('33') || cleaned.startsWith('32') ||
      cleaned.startsWith('1')) {
    return '+' + cleaned;
  }

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
}

function detectCountryFromPhone(number) {
  if (!number) return null;

  const cleaned = number.replace(/[^\d]/g, '');

  if (cleaned.startsWith('212')) return 'Morocco';
  if (cleaned.startsWith('216')) return 'Tunisia';
  if (cleaned.startsWith('221')) return 'Senegal';
  if (cleaned.startsWith('225')) return 'Ivory Coast';
  if (cleaned.startsWith('224')) return 'Guinea';
  if (cleaned.startsWith('237')) return 'Cameroon';
  if (cleaned.startsWith('229')) return 'Benin';
  if (cleaned.startsWith('261')) return 'Madagascar';
  if (cleaned.startsWith('230')) return 'Mauritius';
  if (cleaned.startsWith('223')) return 'Mali';
  if (cleaned.startsWith('33')) return 'France';
  if (cleaned.startsWith('32')) return 'Belgium';
  if (cleaned.startsWith('1')) return 'Canada';

  return null;
}

function formatPhoneNumber(number, country, city) {
  if (!number || number === '#ERROR!' || number === '-') return null;

  const cleaned = cleanPhoneNumber(number);
  if (!cleaned) return null;

  if (cleaned.startsWith('+')) {
    const detectedCountry = detectCountryFromPhone(cleaned);
    if (detectedCountry && detectedCountry !== country) {
      if (city) {
        const cityLower = city.toLowerCase();
        const cityCountry = CITY_COUNTRY_MAP[cityLower];
        if (cityCountry && cityCountry !== detectedCountry) {
          const correctCode = COUNTRY_CODES[cityCountry];
          const digits = cleaned.replace(/[^\d]/g, '').replace(/^\d{1,3}/, '');
          return correctCode + digits;
        }
      }
    }
    return cleaned;
  }

  let targetCountry = country;
  if (city) {
    const cityLower = city.toLowerCase();
    const cityCountry = CITY_COUNTRY_MAP[cityLower];
    if (cityCountry && cityCountry !== country) {
      targetCountry = cityCountry;
    }
  }

  const countryCode = COUNTRY_CODES[targetCountry];
  if (!countryCode) return cleaned;

  const digits = cleaned.replace(/^0/, '');

  const expectedDigits = {
    '+212': 9, '+216': 8, '+221': 9, '+225': 8, '+224': 9, '+237': 9,
    '+229': 8, '+261': 9, '+230': 8, '+223': 8, '+33': 9, '+32': 9, '+1': 10
  };

  if (digits.length !== expectedDigits[countryCode]) {
    return countryCode + digits;
  }

  return countryCode + digits;
}

function normalizePhones(phoneStr, country, city) {
  if (!phoneStr || phoneStr.trim() === '' || phoneStr === '#ERROR!') return [];

  const phones = phoneStr.split(/[,;]/).map(p => p.trim()).filter(p => p && p !== '#ERROR!' && p !== '-');

  return phones.map(phone => formatPhoneNumber(phone, country, city)).filter(p => p !== null);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Function to map status
function mapStatus(status) {
  const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost', 'On-Hold'];
  return validStatuses.includes(status) ? status : 'New';
}

// Function to parse positions
function parsePositions(posStr) {
  const num = parseInt(posStr);
  return isNaN(num) ? 0 : num;
}

// Main processing
try {
  // Read existing cleaned data
  const existingData = JSON.parse(fs.readFileSync('cleaned-call-centers.json', 'utf8'));

  // Read tb2.json - handle malformed JSON by extracting first valid array
  const tb2Content = fs.readFileSync(path.join(__dirname, '../../../../Desktop/to be cleaned/tb2.json'), 'utf8');

  // Find the end of the first JSON array
  const lines = tb2Content.split('\n');
  let braceCount = 0;
  let firstArrayContent = '';
  let inFirstArray = false;

  for (const line of lines) {
    firstArrayContent += line + '\n';

    for (const char of line) {
      if (char === '[') {
        braceCount++;
        inFirstArray = true;
      } else if (char === ']') {
        braceCount--;
        if (braceCount === 0 && inFirstArray) {
          // Found the end of the first array
          break;
        }
      }
    }

    if (braceCount === 0 && inFirstArray) {
      break;
    }
  }

  const tb2Data = JSON.parse(firstArrayContent.trim());

  console.log(`Loaded ${existingData.length} existing call centers`);
  console.log(`Loaded ${tb2Data.length} tb2 entries`);

  // Create a map for deduplication
  const existingMap = new Map();
  existingData.forEach(center => {
    const key = `${center.name.toLowerCase().trim()}-${center.country}-${center.city.toLowerCase().trim()}`;
    existingMap.set(key, center);
  });

  // Process tb2 data
  const processedTb2 = [];
  tb2Data.forEach(entry => {
    const name = entry.name?.trim() || '';
    if (!name) return;

    const country = entry.country || 'Morocco';
    const city = entry.city?.trim() || '';
    const phone = entry.phone?.trim() || '';
    const website = entry.website?.trim() || '';
    const address = entry.address?.trim() || '';
    const positions = parsePositions(entry.positions) || 0;

    // Clean phone numbers
    const phones = normalizePhones(phone, country, city);

    // Create deduplication key
    const key = `${name.toLowerCase().trim()}-${country}-${city.toLowerCase().trim()}`;

    if (!existingMap.has(key)) {
      const callCenter = {
        id: generateId(),
        name,
        country,
        city,
        positions,
        status: 'New',
        phones,
        emails: [],
        website,
        tags: [],
        notes: `From tb2.json - Rating: ${entry.rating || 'N/A'}, Reviews: ${entry.reviews || 'N/A'}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastContacted: null,
        address
      };

      processedTb2.push(callCenter);
      existingMap.set(key, callCenter);
    }
  });

  console.log(`Processed ${processedTb2.length} new entries from tb2`);

  // Merge datasets
  const mergedData = [...existingData, ...processedTb2];

  // Write merged data
  fs.writeFileSync('merged-call-centers.json', JSON.stringify(mergedData, null, 2));

  console.log(`Final merged database: ${mergedData.length} call centers`);
  console.log('Merged data saved to merged-call-centers.json');

} catch (error) {
  console.error('Error processing data:', error);
}
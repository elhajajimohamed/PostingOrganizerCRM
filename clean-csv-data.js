import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Country code mapping
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

// City to country mapping for validation
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

// Function to clean phone number
function cleanPhoneNumber(number) {
  if (!number || number.trim() === '' || number === '#ERROR!' || number === '-') return null;

  // Remove all non-numeric characters except '+' and preserve leading zeros temporarily
  let cleaned = number.replace(/[^\d+\-()]/g, '');

  // Handle international formats
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Handle 00 prefix
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.substring(2);
  }

  // Handle numbers starting with country code without +
  if (cleaned.startsWith('212') || cleaned.startsWith('216') || cleaned.startsWith('221') ||
      cleaned.startsWith('225') || cleaned.startsWith('224') || cleaned.startsWith('237') ||
      cleaned.startsWith('229') || cleaned.startsWith('261') || cleaned.startsWith('230') ||
      cleaned.startsWith('223') || cleaned.startsWith('33') || cleaned.startsWith('32') ||
      cleaned.startsWith('1')) {
    return '+' + cleaned;
  }

  // Remove leading zero for domestic numbers
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
}

// Function to detect country from phone number
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

// Function to format phone number with country code
function formatPhoneNumber(number, country, city) {
  if (!number || number === '#ERROR!' || number === '-') return null;

  const cleaned = cleanPhoneNumber(number);
  if (!cleaned) return null;

  // If already has international format, validate and return
  if (cleaned.startsWith('+')) {
    const detectedCountry = detectCountryFromPhone(cleaned);
    if (detectedCountry && detectedCountry !== country) {
      // Check if city suggests different country
      if (city) {
        const cityLower = city.toLowerCase();
        const cityCountry = CITY_COUNTRY_MAP[cityLower];
        if (cityCountry && cityCountry !== detectedCountry) {
          // Use city-based country
          const correctCode = COUNTRY_CODES[cityCountry];
          const digits = cleaned.replace(/[^\d]/g, '').replace(/^\d{1,3}/, '');
          return correctCode + digits;
        }
      }
    }
    return cleaned;
  }

  // Add country code based on country or city
  let targetCountry = country;
  if (city) {
    const cityLower = city.toLowerCase();
    const cityCountry = CITY_COUNTRY_MAP[cityLower];
    if (cityCountry && cityCountry !== country) {
      targetCountry = cityCountry;
    }
  }

  const countryCode = COUNTRY_CODES[targetCountry];
  if (!countryCode) return cleaned; // Unknown country

  // Remove leading zero if present
  const digits = cleaned.replace(/^0/, '');

  // Validate digit count
  const expectedDigits = {
    '+212': 9, // Morocco
    '+216': 8, // Tunisia
    '+221': 9, // Senegal
    '+225': 8, // Ivory Coast
    '+224': 9, // Guinea
    '+237': 9, // Cameroon
    '+229': 8, // Benin
    '+261': 9, // Madagascar
    '+230': 8, // Mauritius
    '+223': 8, // Mali
    '+33': 9,  // France
    '+32': 9,  // Belgium
    '+1': 10   // Canada
  };

  if (digits.length !== expectedDigits[countryCode]) {
    // Invalid digit count, return as-is but with + prefix if possible
    return countryCode + digits;
  }

  return countryCode + digits;
}

// Function to normalize phone numbers
function normalizePhones(phoneStr, country, city) {
  if (!phoneStr || phoneStr.trim() === '' || phoneStr === '#ERROR!') return [];

  const phones = phoneStr.split(/[,;]/).map(p => p.trim()).filter(p => p && p !== '#ERROR!' && p !== '-');

  return phones.map(phone => formatPhoneNumber(phone, country, city)).filter(p => p !== null);
}

// Function to normalize emails
function normalizeEmails(emailStr) {
  if (!emailStr || emailStr.trim() === '') return [];
  return emailStr.split(/[,;]/).map(e => e.trim()).filter(e => e);
}

// Function to parse positions
function parsePositions(posStr) {
  const num = parseInt(posStr);
  return isNaN(num) ? 0 : num;
}

// Function to map status
function mapStatus(status) {
  const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed-Won', 'Closed-Lost', 'On-Hold'];
  return validStatuses.includes(status) ? status : 'New';
}

// Function to correct country based on city/address
function correctCountry(country, city, address) {
  const allowedCountries = ['Morocco', 'Tunisia', 'Senegal', 'Ivory Coast', 'Guinea', 'Cameroon'];

  // If country is already valid, return it
  if (allowedCountries.includes(country)) return country;

  // Corrections based on common misassignments
  const lowerCity = city.toLowerCase();
  const lowerAddress = address.toLowerCase();

  if (lowerCity.includes('casablanca') || lowerCity.includes('rabat') || lowerCity.includes('fes') || lowerCity.includes('marrakech') || lowerCity.includes('tanger') || lowerAddress.includes('morocco')) {
    return 'Morocco';
  }
  if (lowerCity.includes('tunis') || lowerAddress.includes('tunisia')) {
    return 'Tunisia';
  }
  if (lowerCity.includes('dakar') || lowerAddress.includes('senegal')) {
    return 'Senegal';
  }
  if (lowerCity.includes('abidjan') || lowerAddress.includes('ivory coast')) {
    return 'Ivory Coast';
  }
  if (lowerCity.includes('conakry') || lowerAddress.includes('guinea')) {
    return 'Guinea';
  }
  if (lowerCity.includes('yaounde') || lowerAddress.includes('cameroon')) {
    return 'Cameroon';
  }

  // Default to Morocco if unclear
  return 'Morocco';
}

// Function to handle multi-country entries
function handleMultiCountry(name, country, city, address, phones, emails, website, positions, status, notes) {
  const entries = [];

  // Check if address or city indicates multiple locations
  const locations = [];
  const addressParts = address.split(/[,;]/).map(p => p.trim());
  const cityParts = city.split(/[,;]/).map(p => p.trim());

  // Simple heuristic: if address has multiple countries or cities from different countries
  const countryIndicators = {
    'Morocco': ['casablanca', 'rabat', 'fes', 'marrakech', 'tanger', 'agadir', 'meknes', 'oujda', 'safi'],
    'Tunisia': ['tunis', 'sousse', 'sfax', 'monastir'],
    'Senegal': ['dakar', 'thiès'],
    'Ivory Coast': ['abidjan'],
    'Guinea': ['conakry'],
    'Cameroon': ['yaounde']
  };

  const detectedCountries = new Set();
  [...addressParts, ...cityParts].forEach(part => {
    const lowerPart = part.toLowerCase();
    for (const [ctry, cities] of Object.entries(countryIndicators)) {
      if (cities.some(c => lowerPart.includes(c))) {
        detectedCountries.add(ctry);
      }
    }
  });

  if (detectedCountries.size > 1) {
    // Multi-country: create one entry per country
    detectedCountries.forEach(ctry => {
      entries.push({
        name: `${name} (${ctry})`,
        country: ctry,
        city: cityParts[0] || 'Unknown', // Use first city
        positions,
        status,
        phones,
        emails,
        website,
        address,
        notes: `${notes} - Multi-country entry for ${ctry}`
      });
    });
  } else {
    // Single country
    entries.push({
      name,
      country,
      city: cityParts[0] || 'Unknown',
      positions,
      status,
      phones,
      emails,
      website,
      address,
      notes
    });
  }

  return entries;
}

// Main processing
const results = [];
const seen = new Set(); // For deduplication

fs.createReadStream(path.join(__dirname, '../../../../Desktop/to be cleaned/BIG Database no duplicated - Sheet1.csv'))
  .pipe(csv())
  .on('data', (data) => {
    const name = data['Call Center Name']?.trim() || '';
    let country = data['Country']?.trim() || '';
    const status = mapStatus(data['Status']?.trim() || '');
    const positions = parsePositions(data['Number of Positions'] || '0');
    const phones = normalizePhones(data['Phone Numbers']);
    const notes = data['Commentaire']?.trim() || '';
    const city = data['City']?.trim() || '';
    const address = data['Address']?.trim() || '';
    const emails = normalizeEmails(data['Email']);
    const website = data['Website']?.trim() || '';

    // Skip empty rows
    if (!name) return;

    // Correct country
    country = correctCountry(country, city, address);

    // Handle multi-country
    const entries = handleMultiCountry(name, country, city, address, phones, emails, website, positions, status, notes);

    entries.forEach(entry => {
      // Re-normalize phones with correct country and city
      entry.phones = normalizePhones(data['Phone Numbers'], entry.country, entry.city);

      const key = `${entry.name}-${entry.country}-${entry.city}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(entry);
      }
    });
  })
  .on('end', () => {
    // Transform to CallCenter format
    const callCenters = results.map(result => ({
      id: generateId(),
      name: result.name,
      country: result.country,
      city: result.city,
      positions: result.positions,
      status: result.status,
      phones: result.phones,
      emails: result.emails,
      website: result.website,
      tags: [],
      notes: result.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContacted: null,
      address: result.address
    }));

    // Write to JSON
    fs.writeFileSync('cleaned-call-centers.json', JSON.stringify(callCenters, null, 2));
    console.log(`Processed ${callCenters.length} call centers`);
  });
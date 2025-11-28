// Add Country Codes to Phone Numbers
import { readFileSync, writeFileSync } from 'fs';

const countryCodes = {
  'Morocco': '+212',
  'Tunisia': '+216', 
  'Algeria': '+213',
  'France': '+33',
  'Belgium': '+32',
  'Germany': '+49',
  'Italy': '+39',
  'Canada': '+1',
  'Spain': '+34',
  'Switzerland': '+41',
  'Luxembourg': '+352'
};

function formatPhoneNumber(phone, country) {
  if (!phone) return '';
  
  // Remove any existing spaces, dashes, and parentheses
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check if already has country code
  if (cleanPhone.startsWith('+')) {
    return phone; // Already has country code
  }
  
  // Get the appropriate country code
  const countryCode = countryCodes[country] || '';
  if (!countryCode) {
    return phone; // No country code available
  }
  
  // Handle special cases for local formatting
  if (country === 'Morocco') {
    // Remove leading 0 if present (e.g., 0709051334 -> 709051334)
    const localPart = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
    return `${countryCode}${localPart}`;
  } else if (country === 'Tunisia') {
    // Remove leading 0 if present (e.g., 50534665 -> 0534665)
    const localPart = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
    return `${countryCode}${localPart}`;
  } else if (country === 'France' || country === 'Belgium') {
    // Keep 0 for France/Belgique numbers
    return `${countryCode}${cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone}`;
  } else {
    // Default: add country code without leading 0
    const localPart = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
    return `${countryCode}${localPart}`;
  }
}

function updatePhoneNumbers() {
  // Read the clean prospects file
  const data = readFileSync('facebook-posts-prospects-clean-2025-11-11.json', 'utf8');
  const prospects = JSON.parse(data);
  
  console.log(`Processing ${prospects.length} prospects...`);
  
  // Update phone numbers
  const updatedProspects = prospects.map((prospect, index) => {
    const originalPhones = prospect.phones;
    
    if (originalPhones) {
      // Handle multiple phone numbers separated by semicolons
      const phoneNumbers = originalPhones.split(';').map(phone => phone.trim());
      const formattedPhones = phoneNumbers.map(phone => formatPhoneNumber(phone, prospect.country));
      prospect.phones = formattedPhones.join('; ');
      
      console.log(`Prospect ${index + 1}: ${prospect.name}`);
      console.log(`  Original: ${originalPhones}`);
      console.log(`  Updated:  ${prospect.phones}`);
      console.log('');
    }
    
    return prospect;
  });
  
  // Write updated file
  writeFileSync('facebook-posts-prospects-final-2025-11-11.json', JSON.stringify(updatedProspects, null, 2));
  
  console.log('✅ Successfully updated all phone numbers with country codes');
  console.log('📁 Output saved to: facebook-posts-prospects-final-2025-11-11.json');
}

updatePhoneNumbers();
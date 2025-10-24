const fs = require('fs');

const data = JSON.parse(fs.readFileSync('processed-big-database.json', 'utf8'));

console.log('Total entries in processed file:', data.length);

console.log('\nFirst 5 entries:');
data.slice(0, 5).forEach((d, i) => {
  console.log(`${i+1}. ${d.name} - ${d.country} - phones: ${d.phones?.length || 0}`);
});

console.log('\nValidation checks:');
const validEntries = data.filter(d => d.name && d.name.trim() && d.country);
console.log('Valid entries with name and country:', validEntries.length);

const withPhones = data.filter(d => d.phones && d.phones.length > 0);
console.log('Entries with phones:', withPhones.length);

const withPhoneInfos = data.filter(d => d.phone_infos && d.phone_infos.length > 0);
console.log('Entries with phone_infos:', withPhoneInfos.length);

const withMobile = data.filter(d => d.phone_infos && d.phone_infos.some(p => p.is_mobile));
console.log('Entries with mobile phones:', withMobile.length);

const withWhatsApp = data.filter(d => d.phone_infos && d.phone_infos.some(p => p.whatsapp_confidence >= 0.7));
console.log('Entries with WhatsApp confidence >= 0.7:', withWhatsApp.length);

// Check for potential import issues
const issues = [];
data.forEach((d, i) => {
  if (!d.name || !d.name.trim()) {
    issues.push(`Entry ${i}: Missing name`);
  }
  if (!d.country) {
    issues.push(`Entry ${i}: Missing country`);
  }
  if (d.id && typeof d.id !== 'string') {
    issues.push(`Entry ${i}: ID should be string, got ${typeof d.id}`);
  }
});

if (issues.length > 0) {
  console.log('\nImport issues found:');
  issues.slice(0, 10).forEach(issue => console.log(issue));
  if (issues.length > 10) {
    console.log(`... and ${issues.length - 10} more issues`);
  }
} else {
  console.log('\nNo import issues found in first pass');
}
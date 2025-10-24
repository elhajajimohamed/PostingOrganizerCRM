const fs = require('fs');

const data = JSON.parse(fs.readFileSync('processed-big-database.json', 'utf8'));

console.log('Total entries:', data.length);

const countries = {};
data.forEach(d => {
  countries[d.country] = (countries[d.country] || 0) + 1;
});

console.log('Country distribution:');
Object.entries(countries).sort((a,b) => b[1] - a[1]).forEach(([country, count]) => {
  console.log(`${country}: ${count}`);
});

const withPhones = data.filter(d => d.phones && d.phones.length > 0);
console.log('Entries with phones:', withPhones.length);

const withMobile = data.filter(d => d.phone_infos && d.phone_infos.some(p => p.is_mobile));
console.log('Entries with mobile phones:', withMobile.length);

const withWhatsApp = data.filter(d => d.phone_infos && d.phone_infos.some(p => p.whatsapp_confidence >= 0.7));
console.log('Entries with WhatsApp confidence >= 0.7:', withWhatsApp.length);

// Check schema compliance
const requiredFields = ['id', 'name', 'country', 'city', 'positions', 'status', 'phones', 'emails', 'notes', 'createdAt', 'updatedAt'];
const missingFields = {};
data.forEach((entry, index) => {
  requiredFields.forEach(field => {
    if (!(field in entry)) {
      if (!missingFields[field]) missingFields[field] = [];
      missingFields[field].push(index);
    }
  });
});

if (Object.keys(missingFields).length === 0) {
  console.log('All entries have required fields.');
} else {
  console.log('Missing fields:');
  Object.entries(missingFields).forEach(([field, indices]) => {
    console.log(`${field}: missing in ${indices.length} entries`);
  });
}
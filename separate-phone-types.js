import fs from 'fs';

// Phone number patterns for different countries
const PHONE_PATTERNS = {
  'Morocco': {
    mobile: [
      /^(\+212|212)?[6][0-9]{8}$/,  // Mobile: 6xxxxxxxx
      /^(\+212|212)?[7][0-9]{8}$/   // Mobile: 7xxxxxxxx
    ],
    fixed: [
      /^(\+212|212)?[5][0-9]{8}$/,  // Fixed: 5xxxxxxxx
      /^(\+212|212)?[8][0-9]{8}$/   // Fixed: 8xxxxxxxx
    ]
  },
  'Tunisia': {
    mobile: [
      /^(\+216|216)?[2-9][0-9]{7}$/  // Mobile: 2xxxxxxxx, 3xxxxxxxx, etc.
    ],
    fixed: [
      /^(\+216|216)?[7][0-9]{7}$/   // Fixed: 7xxxxxxxx
    ]
  },
  'Senegal': {
    mobile: [
      /^(\+221|221)?[7][0-9]{8}$/,  // Mobile: 7xxxxxxxxx
      /^(\+221|221)?[3][0-9]{8}$/   // Mobile: 3xxxxxxxxx
    ],
    fixed: [
      /^(\+221|221)?[3][0-9]{8}$/   // Fixed: 3xxxxxxxxx (some overlap with mobile)
    ]
  },
  'Ivory Coast': {
    mobile: [
      /^(\+225|225)?[0-9]{8}$/     // Mobile: xxxxxxxx (various prefixes)
    ],
    fixed: [
      /^(\+225|225)?[2][0-9]{7}$/   // Fixed: 2xxxxxxx
    ]
  },
  'Guinea': {
    mobile: [
      /^(\+224|224)?[6][0-9]{8}$/,  // Mobile: 6xxxxxxxxx
      /^(\+224|224)?[3][0-9]{8}$/   // Mobile: 3xxxxxxxxx
    ],
    fixed: [
      /^(\+224|224)?[3][0-9]{8}$/   // Fixed: 3xxxxxxxxx (some overlap)
    ]
  },
  'Cameroon': {
    mobile: [
      /^(\+237|237)?[6-9][0-9]{8}$/  // Mobile: 6xxxxxxxxx, 7xxxxxxxxx, etc.
    ],
    fixed: [
      /^(\+237|237)?[2][0-9]{8}$/   // Fixed: 2xxxxxxxxx
    ]
  },
  'Benin': {
    mobile: [
      /^(\+229|229)?[9][0-9]{7}$/,  // Mobile: 9xxxxxxxx
      /^(\+229|229)?[6][0-9]{7}$/   // Mobile: 6xxxxxxxx
    ],
    fixed: [
      /^(\+229|229)?[2][0-9]{7}$/   // Fixed: 2xxxxxxxx
    ]
  },
  'Madagascar': {
    mobile: [
      /^(\+261|261)?[3][0-9]{8}$/,  // Mobile: 3xxxxxxxxx
      /^(\+261|261)?[2][0-9]{8}$/   // Mobile: 2xxxxxxxxx
    ],
    fixed: [
      /^(\+261|261)?[2][0-9]{8}$/   // Fixed: 2xxxxxxxxx (some overlap)
    ]
  },
  'Mauritius': {
    mobile: [
      /^(\+230|230)?[5][0-9]{7}$/   // Mobile: 5xxxxxxx
    ],
    fixed: [
      /^(\+230|230)?[2-4][0-9]{6}$/ // Fixed: 2xxxxxx, 3xxxxxx, 4xxxxxx
    ]
  },
  'Mali': {
    mobile: [
      /^(\+223|223)?[6-9][0-9]{7}$/  // Mobile: 6xxxxxxxx, 7xxxxxxxx, etc.
    ],
    fixed: [
      /^(\+223|223)?[2][0-9]{7}$/   // Fixed: 2xxxxxxxx
    ]
  },
  'France': {
    mobile: [
      /^(\+33|33)?[6-7][0-9]{8}$/   // Mobile: 6xxxxxxxxx, 7xxxxxxxxx
    ],
    fixed: [
      /^(\+33|33)?[1-5][0-9]{8}$/   // Fixed: 1xxxxxxxxx through 5xxxxxxxxx
    ]
  },
  'Belgium': {
    mobile: [
      /^(\+32|32)?[4][0-9]{8}$/     // Mobile: 4xxxxxxxxx
    ],
    fixed: [
      /^(\+32|32)?[1-3][0-9]{7}$/   // Fixed: 1xxxxxxx, 2xxxxxxx, 3xxxxxxx
    ]
  },
  'Canada': {
    mobile: [
      /^(\+1|1)?[2-9][0-9]{9}$/     // Mobile: xxxxxxxxxx (area codes 2-9)
    ],
    fixed: [
      /^(\+1|1)?[2-9][0-9]{9}$/     // Fixed: xxxxxxxxxx (same pattern, context dependent)
    ]
  }
};

// Function to classify a phone number as mobile or fixed
function classifyPhoneNumber(phoneNumber, country) {
  if (!phoneNumber || !country) return { type: 'unknown', number: phoneNumber };

  const patterns = PHONE_PATTERNS[country];
  if (!patterns) return { type: 'unknown', number: phoneNumber };

  // Clean the phone number for pattern matching
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // Check mobile patterns first
  for (const pattern of patterns.mobile) {
    if (pattern.test(cleaned)) {
      return { type: 'mobile', number: phoneNumber };
    }
  }

  // Check fixed patterns
  for (const pattern of patterns.fixed) {
    if (pattern.test(cleaned)) {
      return { type: 'fixed', number: phoneNumber };
    }
  }

  return { type: 'unknown', number: phoneNumber };
}

// Function to separate phones into mobile and fixed arrays
function separatePhoneTypes(phones, country) {
  const mobile = [];
  const fixed = [];
  const unknown = [];

  phones.forEach(phone => {
    const classification = classifyPhoneNumber(phone, country);
    switch (classification.type) {
      case 'mobile':
        mobile.push(classification.number);
        break;
      case 'fixed':
        fixed.push(classification.number);
        break;
      default:
        unknown.push(classification.number);
    }
  });

  return { mobile, fixed, unknown };
}

// Main processing
try {
  const data = JSON.parse(fs.readFileSync('deduplicated-call-centers.json', 'utf8'));
  console.log(`Processing ${data.length} call centers for phone type separation...`);

  let totalMobile = 0;
  let totalFixed = 0;
  let totalUnknown = 0;

  const processed = data.map(center => {
    const { mobile, fixed, unknown } = separatePhoneTypes(center.phones || [], center.country);

    totalMobile += mobile.length;
    totalFixed += fixed.length;
    totalUnknown += unknown.length;

    return {
      ...center,
      mobilePhones: mobile,
      fixedPhones: fixed,
      unknownPhones: unknown,
      phones: [...mobile, ...fixed, ...unknown] // Keep original phones array for compatibility
    };
  });

  console.log(`Phone classification summary:`);
  console.log(`- Mobile phones: ${totalMobile}`);
  console.log(`- Fixed phones: ${totalFixed}`);
  console.log(`- Unknown phones: ${totalUnknown}`);

  // Write the updated data
  fs.writeFileSync('call-centers-with-phone-types.json', JSON.stringify(processed, null, 2));
  console.log('Phone types separated and saved to call-centers-with-phone-types.json');

  // Show sample of classification
  console.log('\nSample classifications:');
  const sample = processed.slice(0, 3);
  sample.forEach(center => {
    console.log(`\n${center.name} (${center.country}):`);
    console.log(`  Mobile: ${center.mobilePhones.length} phones`);
    console.log(`  Fixed: ${center.fixedPhones.length} phones`);
    console.log(`  Unknown: ${center.unknownPhones.length} phones`);
  });

} catch (error) {
  console.error('Error processing phone type separation:', error);
}
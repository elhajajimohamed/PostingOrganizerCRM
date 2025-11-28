const fs = require('fs');
const path = require('path');

// Path to the prospects file
const prospectsFilePath = path.join(__dirname, '../../../Downloads/prospection 25-11-2025.json');

// Valid business types from the guide
const validBusinessTypes = ['call-center', 'voip-reseller', 'data-vendor', 'workspace-rental', 'individual', 'freelance', 'client', 'provider', 'consulting'];

// Valid status values
const validStatuses = ['pending', 'contacted', 'qualified', 'not_interested', 'invalid', 'active', 'added_to_crm', 'archived', 'prospect'];

// Valid priority values
const validPriorities = ['low', 'medium', 'high'];

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  // Basic phone validation - should start with + or digits
  return typeof phone === 'string' && (phone.startsWith('+') || /^\d/.test(phone));
}

function cleanContact(contact) {
  const cleaned = {
    id: contact.id,
    name: contact.name,
    position: contact.position,
    phone: contact.phone,
    email: contact.email || '',
    notes: contact.notes || ''
  };

  // Remove extra fields that aren't in the guide
  return cleaned;
}

function cleanStep(step) {
  const cleaned = {
    id: step.id,
    title: step.title,
    description: step.description,
    date: step.date,
    completed: step.completed || false,
    priority: validPriorities.includes(step.priority) ? step.priority : 'medium'
  };

  return cleaned;
}

function validateAndCleanProspect(prospect, index) {
  const errors = [];
  const warnings = [];

  // Check required fields
  const requiredFields = ['name', 'country', 'city', 'businessType'];
  for (const field of requiredFields) {
    if (!prospect[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate businessType
  if (prospect.businessType && !validBusinessTypes.includes(prospect.businessType)) {
    warnings.push(`Invalid businessType: ${prospect.businessType}, defaulting to 'call-center'`);
    prospect.businessType = 'call-center';
  }

  // Validate status
  if (prospect.status && !validStatuses.includes(prospect.status)) {
    warnings.push(`Invalid status: ${prospect.status}, defaulting to 'active'`);
    prospect.status = 'active';
  }

  // Validate priority
  if (prospect.priority && !validPriorities.includes(prospect.priority)) {
    warnings.push(`Invalid priority: ${prospect.priority}, defaulting to 'medium'`);
    prospect.priority = 'medium';
  }

  // Validate phones
  if (prospect.phones && Array.isArray(prospect.phones)) {
    const validPhones = prospect.phones.filter(phone => {
      if (!validatePhone(phone)) {
        warnings.push(`Invalid phone format: ${phone}`);
        return false;
      }
      return true;
    });
    prospect.phones = validPhones;
  } else {
    prospect.phones = [];
  }

  // Validate emails
  if (prospect.emails && Array.isArray(prospect.emails)) {
    const validEmails = prospect.emails.filter(email => {
      if (!validateEmail(email)) {
        warnings.push(`Invalid email format: ${email}`);
        return false;
      }
      return true;
    });
    prospect.emails = validEmails;
  } else {
    prospect.emails = [];
  }

  // Clean contacts
  if (prospect.contacts && Array.isArray(prospect.contacts)) {
    prospect.contacts = prospect.contacts.map(cleanContact);
  } else {
    prospect.contacts = [];
  }

  // Clean steps
  if (prospect.steps && Array.isArray(prospect.steps)) {
    prospect.steps = prospect.steps.map(cleanStep);
  } else {
    prospect.steps = [];
  }

  // Ensure callHistory is array
  if (!Array.isArray(prospect.callHistory)) {
    prospect.callHistory = [];
  }

  // Set defaults for missing optional fields
  prospect.positions = prospect.positions || 0;
  prospect.website = prospect.website || '';
  prospect.address = prospect.address || '';
  prospect.source = prospect.source || '';
  prospect.tags = Array.isArray(prospect.tags) ? prospect.tags : [];
  prospect.notes = prospect.notes || '';
  prospect.status = prospect.status || 'active';
  prospect.priority = prospect.priority || 'medium';
  prospect.contactAttempts = prospect.contactAttempts || 0;
  prospect.destinations = Array.isArray(prospect.destinations) ? prospect.destinations : [];
  prospect.dnc = prospect.dnc || false;
  prospect.dnd = prospect.dnd || false;
  prospect.dp = prospect.dp || false;
  prospect.dncDescription = prospect.dncDescription || '';
  prospect.dndDescription = prospect.dndDescription || '';
  prospect.dpDescription = prospect.dpDescription || '';

  return { prospect, errors, warnings };
}

function main() {
  try {
    console.log('Reading prospects file...');
    const data = fs.readFileSync(prospectsFilePath, 'utf8');

    // Handle malformed JSON with multiple root arrays
    let prospectsData;
    try {
      prospectsData = JSON.parse(data);
    } catch (parseError) {
      console.log('JSON parsing failed, attempting to fix malformed structure...');
      // Fix the malformed JSON by wrapping multiple arrays in a single array
      const fixedData = '[' + data.replace(/\]\s*\[/g, '],[') + ']';
      prospectsData = JSON.parse(fixedData);
      console.log('Successfully fixed and parsed malformed JSON');
    }

    console.log(`Original structure: ${Array.isArray(prospectsData) ? 'Array' : typeof prospectsData}`);
    console.log(`Length: ${prospectsData.length}`);

    // Check if it's nested arrays
    if (Array.isArray(prospectsData) && prospectsData.length > 0 && Array.isArray(prospectsData[0])) {
      console.log('Detected nested array structure. Flattening...');
      const flattened = prospectsData.flat();
      console.log(`Flattened to ${flattened.length} prospects`);
    } else {
      console.log('Already flat array structure');
    }

    const allProspects = Array.isArray(prospectsData) && prospectsData.length > 0 && Array.isArray(prospectsData[0])
      ? prospectsData.flat()
      : prospectsData;

    console.log(`\nProcessing ${allProspects.length} prospects...`);

    const results = {
      total: allProspects.length,
      valid: 0,
      errors: 0,
      warnings: 0,
      cleaned: []
    };

    allProspects.forEach((prospect, index) => {
      const { prospect: cleaned, errors, warnings } = validateAndCleanProspect(prospect, index);

      results.cleaned.push(cleaned);

      if (errors.length > 0) {
        results.errors++;
        console.log(`\nProspect ${index + 1} (${prospect.name}):`);
        errors.forEach(error => console.log(`  ERROR: ${error}`));
      }

      if (warnings.length > 0) {
        results.warnings++;
        console.log(`\nProspect ${index + 1} (${prospect.name}):`);
        warnings.forEach(warning => console.log(`  WARNING: ${warning}`));
      }

      if (errors.length === 0) {
        results.valid++;
      }
    });

    console.log('\n=== SUMMARY ===');
    console.log(`Total prospects: ${results.total}`);
    console.log(`Valid prospects: ${results.valid}`);
    console.log(`Prospects with errors: ${results.errors}`);
    console.log(`Prospects with warnings: ${results.warnings}`);

    // Write the cleaned data back
    const outputPath = path.join(__dirname, '../../../Downloads/prospection-25-11-2025-fixed.json');
    fs.writeFileSync(outputPath, JSON.stringify(results.cleaned, null, 2));
    console.log(`\nFixed prospects saved to: ${outputPath}`);

    // Validate the output is valid JSON
    try {
      JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      console.log('Output JSON is valid');
    } catch (e) {
      console.error('Output JSON is invalid:', e.message);
    }

  } catch (error) {
    console.error('Error processing file:', error.message);
  }
}

main();
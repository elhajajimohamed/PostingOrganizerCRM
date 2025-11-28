import fs from 'fs';

// Function to normalize names for comparison
function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Function to calculate similarity between two names
function calculateSimilarity(name1, name2) {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  if (norm1 === norm2) return 1;

  // Check if one is contained in the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

  // Check for common variations
  const variations = [
    ['call center', 'callcentre', 'call-center'],
    ['telemarketing', 'tele-marketing'],
    ['contact center', 'contactcentre', 'contact-center'],
    ['communication', 'com'],
    ['services', 'service'],
    ['international', 'intl'],
    ['solutions', 'solution'],
    ['consulting', 'consult'],
    ['business', 'biz'],
    ['group', 'grp'],
    ['centre', 'center'],
    ['centre d\'appel', 'call center'],
    ['telecom', 'telecommunication']
  ];

  let similarity = 0;
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');

  // Count matching words
  const matchingWords = words1.filter(word => words2.includes(word)).length;
  const totalWords = Math.max(words1.length, words2.length);

  if (totalWords > 0) {
    similarity = matchingWords / totalWords;
  }

  // Apply variation bonuses
  for (const variation of variations) {
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (variation.includes(word1) && variation.includes(word2)) {
          similarity += 0.1;
        }
      }
    }
  }

  return Math.min(similarity, 1);
}

// Function to merge two call center entries
function mergeCallCenters(center1, center2) {
  const merged = { ...center1 };

  // Combine phone numbers (remove duplicates)
  const allPhones = [...center1.phones, ...center2.phones];
  merged.phones = [...new Set(allPhones)].filter(phone => phone && phone !== '#ERROR!' && phone !== '-');

  // Combine emails (remove duplicates)
  const allEmails = [...center1.emails, ...center2.emails];
  merged.emails = [...new Set(allEmails)].filter(email => email && email !== '#ERROR!' && email !== '-');

  // Combine addresses (prefer longer/more complete address)
  if (center2.address && center2.address.length > (center1.address?.length || 0)) {
    merged.address = center2.address;
  }

  // Combine websites (prefer non-empty)
  if (!center1.website && center2.website) {
    merged.website = center2.website;
  }

  // Combine positions (take maximum)
  merged.positions = Math.max(center1.positions || 0, center2.positions || 0);

  // Combine notes
  const notes1 = center1.notes || '';
  const notes2 = center2.notes || '';
  merged.notes = [notes1, notes2].filter(note => note.trim()).join(' | ');

  // Update timestamp
  merged.updatedAt = new Date().toISOString();

  return merged;
}

// Main deduplication process
try {
  const data = JSON.parse(fs.readFileSync('merged-call-centers.json', 'utf8'));
  console.log(`Starting with ${data.length} call centers`);

  const processed = [];
  const mergedIndices = new Set();

  for (let i = 0; i < data.length; i++) {
    if (mergedIndices.has(i)) continue;

    const current = data[i];
    const duplicates = [];

    // Find duplicates for this entry
    for (let j = i + 1; j < data.length; j++) {
      if (mergedIndices.has(j)) continue;

      const other = data[j];

      // Must be in same country and city (or very close cities)
      if (current.country !== other.country) continue;

      const city1 = current.city?.toLowerCase().trim() || '';
      const city2 = other.city?.toLowerCase().trim() || '';

      // Allow some city variations
      const sameCity = city1 === city2 ||
        (city1.includes(city2) && city2.length > 3) ||
        (city2.includes(city1) && city1.length > 3) ||
        (city1 === 'casablanca' && city2 === 'casa') ||
        (city2 === 'casablanca' && city1 === 'casa');

      if (!sameCity) continue;

      // Check name similarity
      const similarity = calculateSimilarity(current.name, other.name);
      if (similarity >= 0.8) { // 80% similarity threshold
        duplicates.push(j);
        console.log(`Found duplicate: "${current.name}" ↔ "${other.name}" (similarity: ${(similarity * 100).toFixed(1)}%)`);
      }
    }

    // Merge duplicates
    let mergedCenter = current;
    for (const dupIndex of duplicates) {
      mergedCenter = mergeCallCenters(mergedCenter, data[dupIndex]);
      mergedIndices.add(dupIndex);
    }

    processed.push(mergedCenter);
  }

  console.log(`After deduplication: ${processed.length} call centers (${data.length - processed.length} duplicates merged)`);

  // Write deduplicated data
  fs.writeFileSync('deduplicated-call-centers.json', JSON.stringify(processed, null, 2));
  console.log('Deduplicated data saved to deduplicated-call-centers.json');

} catch (error) {
  console.error('Error processing deduplication:', error);
}
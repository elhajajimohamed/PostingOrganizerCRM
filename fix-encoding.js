import * as fs from 'fs';

function fixEncodingIssues() {
  try {
    console.log('🔧 Starting to fix encoding issues in call-centers-part-1.json...');

    // Read the file
    const data = fs.readFileSync('../../../to be devided/split-files/call-centers-part-1.json', 'utf8');
    let callCenters = JSON.parse(data);

    console.log(`📊 Processing ${callCenters.length} call centers...`);

    let fixedCount = 0;

    // Fix encoding issues
    callCenters = callCenters.map(center => {
      let needsFix = false;
      const fixed = { ...center };

      // Fix common encoding issues - UTF-8 decoding problems
      const encodingMap = {
        // Common broken sequences
        'YaoundAc': 'Yaoundé',
        'FranAaise': 'Française',
        'PrAcsident': 'Président',
        'bAtiment': 'bâtiment',
        'MontAce': 'Montée',
        // Fix incomplete Yaoundé patterns
        'Yaound': 'Yaoundé',
        'Yaounde': 'Yaoundé',
        // Individual character replacements
        '\u00C3\u00A9': 'é', // Ã© -> é
        '\u00C3\u00A0': 'à', // Ã  -> à
        '\u00C3\u00A8': 'è', // Ã¨ -> è
        '\u00C3\u00A9': 'é', // Ã© -> é
        '\u00C3\u00A7': 'ç', // Ã§ -> ç
        '\u00C3\u00B9': 'ù', // Ã¹ -> ù
        '\u00C3\u00A2': 'â', // Ã¢ -> â
        '\u00C3\u00AA': 'ê', // Ãª -> ê
        '\u00C3\u00AE': 'î', // Ã® -> î
        '\u00C3\u00B4': 'ô', // Ã´ -> ô
        '\u00C3\u00BB': 'û', // Ã» -> û
        // Additional common broken chars
        '\u00C2\u00A9': '©', // Â© -> ©
        '\u00C2\u00A0': ' ', // Â  -> space
        '\u00E2\u20AC': '€', // â‚¬ -> €
        '\u00C2\u00AE': '®', // Â® -> ®
        '\u00E2\u2019': "'", // â -> '
        '\u00E2\u20AC\u0153': '"', // â -> "
        '\u00E2\u20AC\u009D': '"', // â -> "
      };

      // Fix name
      if (center.name) {
        let fixedName = center.name;
        Object.entries(encodingMap).forEach(([broken, fixedChar]) => {
          if (fixedName.includes(broken)) {
            fixedName = fixedName.replace(new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fixedChar);
            needsFix = true;
          }
        });
        // Also fix UTF-8 byte sequences
        fixedName = fixedName
          .replace(/\u00C3\u00A9/g, 'é')
          .replace(/\u00C3\u00A0/g, 'à')
          .replace(/\u00C3\u00A8/g, 'è')
          .replace(/\u00C3\u00A7/g, 'ç')
          .replace(/\u00C3\u00B9/g, 'ù')
          .replace(/\u00C3\u00A2/g, 'â')
          .replace(/\u00C3\u00AA/g, 'ê')
          .replace(/\u00C3\u00AE/g, 'î')
          .replace(/\u00C3\u00B4/g, 'ô')
          .replace(/\u00C3\u00BB/g, 'û')
          .replace(/\u00C2\u00A9/g, '©')
          .replace(/\u00C2\u00A0/g, ' ')
          .replace(/\u00E2\u20AC/g, '€')
          .replace(/\u00C2\u00AE/g, '®')
          .replace(/\u00E2\u2019/g, "'")
          .replace(/\u00E2\u20AC\u0153/g, '"')
          .replace(/\u00E2\u20AC\u009D/g, '"');
        if (fixedName !== center.name) needsFix = true;
        fixed.name = fixedName;
      }

      // Fix city
      if (center.city) {
        let fixedCity = center.city;
        Object.entries(encodingMap).forEach(([broken, fixedChar]) => {
          if (fixedCity.includes(broken)) {
            fixedCity = fixedCity.replace(new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fixedChar);
            needsFix = true;
          }
        });
        // Also fix UTF-8 byte sequences
        fixedCity = fixedCity
          .replace(/\u00C3\u00A9/g, 'é')
          .replace(/\u00C3\u00A0/g, 'à')
          .replace(/\u00C3\u00A8/g, 'è')
          .replace(/\u00C3\u00A7/g, 'ç')
          .replace(/\u00C3\u00B9/g, 'ù')
          .replace(/\u00C3\u00A2/g, 'â')
          .replace(/\u00C3\u00AA/g, 'ê')
          .replace(/\u00C3\u00AE/g, 'î')
          .replace(/\u00C3\u00B4/g, 'ô')
          .replace(/\u00C3\u00BB/g, 'û')
          .replace(/\u00C2\u00A9/g, '©')
          .replace(/\u00C2\u00A0/g, ' ')
          .replace(/\u00E2\u20AC/g, '€')
          .replace(/\u00C2\u00AE/g, '®')
          .replace(/\u00E2\u2019/g, "'")
          .replace(/\u00E2\u20AC\u0153/g, '"')
          .replace(/\u00E2\u20AC\u009D/g, '"');
        if (fixedCity !== center.city) needsFix = true;
        fixed.city = fixedCity;
      }

      // Fix address
      if (center.address) {
        let fixedAddress = center.address;
        Object.entries(encodingMap).forEach(([broken, fixedChar]) => {
          if (fixedAddress.includes(broken)) {
            fixedAddress = fixedAddress.replace(new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fixedChar);
            needsFix = true;
          }
        });
        // Also fix UTF-8 byte sequences
        fixedAddress = fixedAddress
          .replace(/\u00C3\u00A9/g, 'é')
          .replace(/\u00C3\u00A0/g, 'à')
          .replace(/\u00C3\u00A8/g, 'è')
          .replace(/\u00C3\u00A7/g, 'ç')
          .replace(/\u00C3\u00B9/g, 'ù')
          .replace(/\u00C3\u00A2/g, 'â')
          .replace(/\u00C3\u00AA/g, 'ê')
          .replace(/\u00C3\u00AE/g, 'î')
          .replace(/\u00C3\u00B4/g, 'ô')
          .replace(/\u00C3\u00BB/g, 'û')
          .replace(/\u00C2\u00A9/g, '©')
          .replace(/\u00C2\u00A0/g, ' ')
          .replace(/\u00E2\u20AC/g, '€')
          .replace(/\u00C2\u00AE/g, '®')
          .replace(/\u00E2\u2019/g, "'")
          .replace(/\u00E2\u20AC\u0153/g, '"')
          .replace(/\u00E2\u20AC\u009D/g, '"');
        if (fixedAddress !== center.address) needsFix = true;
        fixed.address = fixedAddress;
      }

      if (needsFix) {
        fixedCount++;
      }

      return fixed;
    });

    // Write back the fixed data
    fs.writeFileSync('../../../to be devided/split-files/call-centers-part-1-fixed.json', JSON.stringify(callCenters, null, 2), 'utf8');

    console.log(`✅ Fixed encoding issues in ${fixedCount} call centers`);
    console.log('📁 Fixed file saved as: ../../../to be devided/split-files/call-centers-part-1-fixed.json');

    // Validate the fix
    console.log('🔍 Validating the fixed file...');
    const fixedData = fs.readFileSync('../../../to be devided/split-files/call-centers-part-1-fixed.json', 'utf8');
    const parsed = JSON.parse(fixedData);
    console.log(`✅ Validation successful: ${parsed.length} call centers parsed correctly`);

  } catch (error) {
    console.error('❌ Error fixing encoding issues:', error);
  }
}

fixEncodingIssues();
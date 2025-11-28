const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function generateDataReport() {
  console.log('🔍 Generating Firebase Data Report...\n');

  const report = {
    generatedAt: new Date().toISOString(),
    collections: {}
  };

  try {
    // 1. ACCOUNTS COLLECTION
    console.log('📱 Loading accounts...');
    const accountsSnapshot = await db.collection('accounts').get();
    report.collections.accounts = {
      count: accountsSnapshot.size,
      data: accountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
    console.log(`✅ Found ${accountsSnapshot.size} accounts`);

    // 2. GROUPS COLLECTION
    console.log('👥 Loading groups...');
    const groupsSnapshot = await db.collection('groups').get();
    report.collections.groups = {
      count: groupsSnapshot.size,
      data: groupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
    console.log(`✅ Found ${groupsSnapshot.size} groups`);

    // 3. TEXTS COLLECTION
    console.log('📝 Loading texts...');
    const textsSnapshot = await db.collection('textsVOIP').get();
    report.collections.texts = {
      count: textsSnapshot.size,
      data: textsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
    console.log(`✅ Found ${textsSnapshot.size} texts`);

    // 4. IMAGES COLLECTION
    console.log('🖼️ Loading images...');
    const imagesSnapshot = await db.collection('imagesVOIP').get();
    report.collections.images = {
      count: imagesSnapshot.size,
      data: imagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    };
    console.log(`✅ Found ${imagesSnapshot.size} images`);

    // 5. VOIP COLLECTIONS (if they exist)
    console.log('🔍 Checking VOIP collections...');

    try {
      const accountsVOIPSnapshot = await db.collection('accountsVOIP').get();
      report.collections.accountsVOIP = {
        count: accountsVOIPSnapshot.size,
        data: accountsVOIPSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      };
      console.log(`✅ Found ${accountsVOIPSnapshot.size} accountsVOIP`);
    } catch (error) {
      report.collections.accountsVOIP = { count: 0, error: 'Collection does not exist' };
      console.log('❌ accountsVOIP collection does not exist');
    }

    try {
      const groupsVOIPSnapshot = await db.collection('groupsVOIP').get();
      report.collections.groupsVOIP = {
        count: groupsVOIPSnapshot.size,
        data: groupsVOIPSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      };
      console.log(`✅ Found ${groupsVOIPSnapshot.size} groupsVOIP`);
    } catch (error) {
      report.collections.groupsVOIP = { count: 0, error: 'Collection does not exist' };
      console.log('❌ groupsVOIP collection does not exist');
    }

    // Save report to file
    const reportPath = path.join(__dirname, 'firebase-data-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📄 Report saved to: ${reportPath}`);

    // Print summary
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Accounts (accounts): ${report.collections.accounts.count}`);
    console.log(`Groups (groups): ${report.collections.groups.count}`);
    console.log(`Texts (textsVOIP): ${report.collections.texts.count}`);
    console.log(`Images (imagesVOIP): ${report.collections.images.count}`);
    console.log(`AccountsVOIP: ${report.collections.accountsVOIP.count || 0}`);
    console.log(`GroupsVOIP: ${report.collections.groupsVOIP.count || 0}`);

    // Detailed account browser analysis
    console.log('\n📱 ACCOUNT BROWSER ANALYSIS:');
    console.log('-'.repeat(30));
    const browserCounts = {};
    report.collections.accounts.data.forEach(account => {
      const browser = account.browser || account.browserType || 'unknown';
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });

    Object.entries(browserCounts).forEach(([browser, count]) => {
      console.log(`${browser}: ${count} accounts`);
    });

    // Sample data
    console.log('\n🔍 SAMPLE DATA:');
    console.log('-'.repeat(30));

    if (report.collections.accounts.data.length > 0) {
      console.log('First Account:', JSON.stringify(report.collections.accounts.data[0], null, 2));
    }

    if (report.collections.groups.data.length > 0) {
      console.log('First Group:', JSON.stringify(report.collections.groups.data[0], null, 2));
    }

    if (report.collections.texts.data.length > 0) {
      console.log('First Text:', JSON.stringify(report.collections.texts.data[0], null, 2));
    }

    if (report.collections.images.data.length > 0) {
      console.log('First Image:', JSON.stringify(report.collections.images.data[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error generating report:', error);
  } finally {
    process.exit(0);
  }
}

generateDataReport();
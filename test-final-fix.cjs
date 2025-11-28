const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function testFinalFix() {
  console.log('🧪 TESTING FINAL FIX - ALL 10 ACCOUNTS');
  console.log('==========================================\n');

  try {
    // Load accounts using the FIXED collection (accounts)
    console.log('📊 Loading accounts from "accounts" collection...');
    const accountsQuery = await db.collection('accounts').where('status', '==', 'active').get();
    const accounts = accountsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Loaded ${accounts.length} active accounts`);

    if (accounts.length === 10) {
      console.log('🎉 SUCCESS! All 10 accounts are now loaded!');
    } else {
      console.log(`❌ Expected 10 accounts, got ${accounts.length}`);
    }

    console.log('\n👥 ALL 10 ACCOUNTS:');
    console.log('====================');
    accounts.forEach((acc, i) => {
      console.log(`${i + 1}. ${acc.name} (${acc.browser || acc.browserType})`);
    });

    // Load a few groups for testing
    const groupsSnapshot = await db.collection('groups').limit(5).get();
    const groups = groupsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`\n📊 Loaded ${groups.length} sample groups`);

    // Load content
    const textsSnapshot = await db.collection('posting_texts').get();
    const texts = textsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const imagesSnapshot = await db.collection('posting_images').get();
    const images = imagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Content: ${texts.length} texts, ${images.length} images`);

    // Simulate task generation with ALL 10 accounts
    const targetCount = 20;
    const tasks = [];
    const maxPostsPerGroup = 2;
    const groupUsage = new Map();

    let accountIndex = 0;
    let textIndex = 0;
    let imageIndex = 0;

    console.log(`\n🎯 Generating ${targetCount} tasks with ALL 10 accounts...`);

    while (tasks.length < targetCount) {
      const account = accounts[accountIndex % accounts.length];
      const availableGroups = groups.filter(group =>
        (groupUsage.get(group.id) || 0) < maxPostsPerGroup
      );

      if (availableGroups.length === 0) {
        groupUsage.clear();
        continue;
      }

      const selectedGroup = availableGroups[0];
      const availableText = texts[textIndex % texts.length];
      const selectedImage = images[imageIndex % images.length];

      tasks.push({
        accountName: account.name,
        accountBrowser: account.browser || account.browserType,
        groupName: selectedGroup.name,
        textTitle: availableText.title,
        imageFilename: selectedImage.filename
      });

      const currentUsage = groupUsage.get(selectedGroup.id) || 0;
      groupUsage.set(selectedGroup.id, currentUsage + 1);

      accountIndex++;
      textIndex++;
      imageIndex++;
    }

    console.log(`\n✅ Generated ${tasks.length} tasks`);

    // Analyze browser distribution
    const browserCounts = {};
    tasks.forEach(task => {
      const browser = task.accountBrowser;
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });

    console.log('\n🌐 Browser Distribution:');
    Object.entries(browserCounts).forEach(([browser, count]) => {
      console.log(`   ${browser}: ${count} tasks`);
    });

    // Check account usage
    const accountCounts = {};
    tasks.forEach(task => {
      const account = task.accountName;
      accountCounts[account] = (accountCounts[account] || 0) + 1;
    });

    console.log('\n👤 Account Usage:');
    Object.entries(accountCounts).forEach(([account, count]) => {
      console.log(`   ${account}: ${count} tasks`);
    });

    console.log(`\n🎉 FINAL RESULTS:`);
    console.log(`===================`);
    console.log(`✅ Total accounts used: ${Object.keys(accountCounts).length}/10`);
    console.log(`✅ Total browsers used: ${Object.keys(browserCounts).length}`);
    console.log(`✅ Midiori browser included: ${browserCounts['midiori'] ? 'YES' : 'NO'}`);

    if (Object.keys(accountCounts).length === 10) {
      console.log('\n🎊 ISSUE COMPLETELY RESOLVED!');
      console.log('✅ ALL 10 accounts are now being used');
      console.log('✅ Including the missing "midiori" browser account');
      console.log('✅ Ready to test in Facebook CRM dashboard');
    }

  } catch (error) {
    console.error('❌ Error testing final fix:', error);
  } finally {
    await admin.app().delete();
  }
}

testFinalFix().catch(console.error);
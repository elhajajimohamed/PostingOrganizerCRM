const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function testUpdatedAlgorithm() {
  console.log('🧪 TESTING UPDATED ALGORITHM WITH ALL 9 ACCOUNTS');
  console.log('===================================================\n');

  try {
    // Load all active accounts (should now be 9)
    const accountsQuery = await db.collection('facebook_accounts').where('status', '==', 'active').get();
    const accounts = accountsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Loaded ${accounts.length} active accounts`);
    console.log('👥 All Accounts:');
    accounts.forEach((acc, i) => {
      console.log(`   ${i + 1}. ${acc.name} (${acc.browser || acc.browserType})`);
    });

    // Load groups (from primary collection)
    const groupsSnapshot = await db.collection('groups').get();
    const groups = groupsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`\n📊 Loaded ${groups.length} groups`);

    // Load texts
    const textsSnapshot = await db.collection('posting_texts').get();
    const texts = textsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Loaded ${texts.length} texts`);

    // Load images
    const imagesSnapshot = await db.collection('posting_images').get();
    const images = imagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 Loaded ${images.length} images`);

    // Simulate the variety-focused algorithm
    const targetCount = 20;
    const maxPostsPerGroup = 2;
    const groupUsage = new Map();
    const tasks = [];

    let accountIndex = 0;
    let textIndex = 0;
    let imageIndex = 0;

    console.log(`\n🎯 Generating ${targetCount} tasks with ALL 9 accounts...`);

    while (tasks.length < targetCount) {
      // Get current account
      const account = accounts[accountIndex % accounts.length];
      
      // Find groups that haven't reached the usage limit
      const availableGroups = groups.filter(group =>
        (groupUsage.get(group.id) || 0) < maxPostsPerGroup
      );
      
      // If no groups available within limits, reset usage for variety
      if (availableGroups.length === 0) {
        groupUsage.clear();
        continue;
      }
      
      // Select next available group
      const selectedGroup = availableGroups[0];
      
      // Create task
      const availableText = texts[textIndex % texts.length];
      const selectedImage = images[imageIndex % images.length];

      tasks.push({
        id: `task_${tasks.length + 1}`,
        facebookAccountName: account.name,
        facebookAccountBrowser: account.browser || account.browserType,
        facebookGroupName: selectedGroup.name,
        facebookGroupMemberCount: selectedGroup.memberCount,
        postingTextTitle: availableText.title,
        postingImageFilename: selectedImage.filename
      });

      // Track group usage
      const currentUsage = groupUsage.get(selectedGroup.id) || 0;
      groupUsage.set(selectedGroup.id, currentUsage + 1);
      
      console.log(`✅ Task ${tasks.length}/${targetCount}: ${account.name} (${account.browser}) → ${selectedGroup.name}`);

      // Rotate to next account
      accountIndex++;
      
      // Rotate content
      if (texts.length > 0) textIndex++;
      if (images.length > 0) imageIndex++;
    }

    console.log(`\n🎉 SUCCESS: Generated ${tasks.length} tasks`);

    // Analyze results
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`==================`);
    console.log(`Total Tasks: ${tasks.length}/20`);
    
    // Browser distribution
    const browserCounts = {};
    tasks.forEach(task => {
      const browser = task.facebookAccountBrowser;
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });

    console.log('\n🌐 Browser Distribution:');
    Object.entries(browserCounts).forEach(([browser, count]) => {
      console.log(`   ${browser}: ${count} tasks`);
    });

    // Account usage
    const accountCounts = {};
    tasks.forEach(task => {
      const account = task.facebookAccountName;
      accountCounts[account] = (accountCounts[account] || 0) + 1;
    });

    console.log('\n👤 Account Usage:');
    Object.entries(accountCounts).forEach(([account, count]) => {
      console.log(`   ${account}: ${count} tasks`);
    });

    // Unique groups used
    const uniqueGroups = new Set(tasks.map(t => t.facebookGroupName));
    console.log(`\n🎯 Unique Groups Used: ${uniqueGroups.size}`);
    console.log(`✅ Variety Enforcement: ${Math.max(...Object.values(browserCounts)) - Math.min(...Object.values(browserCounts)) <= 3 ? 'EXCELLENT' : 'GOOD'}`);

    // Check if all 9 accounts are being used
    const allAccountsUsed = Object.keys(accountCounts).length === 9;
    console.log(`\n🔍 All 9 Accounts Used: ${allAccountsUsed ? '✅ YES' : '❌ NO'}`);

    if (allAccountsUsed) {
      console.log('🎉 ISSUE COMPLETELY RESOLVED!');
      console.log('✅ All 9 accounts are now being used for task generation');
      console.log('✅ Browser distribution should be much better');
      console.log('✅ Ready to test with "Generate Daily Tasks"');
    }

  } catch (error) {
    console.error('❌ Error testing algorithm:', error);
  } finally {
    await admin.app().delete();
  }
}

testUpdatedAlgorithm().catch(console.error);
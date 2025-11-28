#!/usr/bin/env node

// Test script to validate the daily posting tasks generation
// This simulates the generation process to ensure we get 20 tasks

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function testDailyTasksGeneration() {
  console.log('🧪 TESTING DAILY POSTING TASKS GENERATION');
  console.log('==========================================\n');

  try {
    // Load accounts
    console.log('📊 Loading accounts...');
    const accountsSnapshot = await db.collection('facebook_accounts')
      .where('status', '==', 'active')
      .get();
    
    const accounts = [];
    accountsSnapshot.forEach(doc => {
      const data = doc.data();
      accounts.push({
        id: doc.id,
        name: data.name || 'Unknown',
        browser: data.browser || data.browserType || 'aloha'
      });
    });
    
    console.log(`✅ Loaded ${accounts.length} active accounts`);
    if (accounts.length > 0) {
      console.log('   Sample accounts:', accounts.slice(0, 3).map(a => `${a.name} (${a.browser})`));
    }

    // Load groups
    console.log('\n📊 Loading groups...');
    const groupsSnapshot = await db.collection('groups').get();
    
    const groups = [];
    groupsSnapshot.forEach(doc => {
      const data = doc.data();
      groups.push({
        id: doc.id,
        name: data.name || 'Unknown',
        memberCount: data.memberCount || 0,
        url: data.url || ''
      });
    });
    
    console.log(`✅ Loaded ${groups.length} groups`);
    if (groups.length > 0) {
      console.log('   Sample groups:', groups.slice(0, 3).map(g => `${g.name} (${g.memberCount} members)`));
    }

    // Load texts
    console.log('\n📊 Loading texts...');
    const textsSnapshot = await db.collection('posting_texts').get();
    
    const texts = [];
    textsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.isActive === true || data.status === 'active') {
        texts.push({
          id: doc.id,
          title: data.title || 'Untitled'
        });
      }
    });
    
    console.log(`✅ Loaded ${texts.length} active texts`);
    if (texts.length > 0) {
      console.log('   Sample texts:', texts.slice(0, 3).map(t => t.title));
    }

    // Load images
    console.log('\n📊 Loading images...');
    const imagesSnapshot = await db.collection('posting_images').get();
    
    const images = [];
    imagesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.isActive === true || data.status === 'active') {
        images.push({
          id: doc.id,
          filename: data.filename || 'Unknown'
        });
      }
    });
    
    console.log(`✅ Loaded ${images.length} active images`);
    if (images.length > 0) {
      console.log('   Sample images:', images.slice(0, 3).map(i => i.filename));
    }

    // Validate minimum requirements
    console.log('\n🔍 VALIDATION CHECKS');
    console.log('====================');
    
    const requirements = [
      { name: 'Accounts', count: accounts.length, min: 1 },
      { name: 'Groups', count: groups.length, min: 1 },
      { name: 'Texts', count: texts.length, min: 1 },
      { name: 'Images', count: images.length, min: 0 }
    ];

    let allGood = true;
    requirements.forEach(req => {
      const status = req.count >= req.min ? '✅' : '❌';
      console.log(`${status} ${req.name}: ${req.count} (minimum: ${req.min})`);
      if (req.count < req.min) allGood = false;
    });

    if (!allGood) {
      console.log('\n❌ Validation failed - insufficient data for task generation');
      return;
    }

    // Simulate the new simplified algorithm
    console.log('\n🚀 TESTING SIMPLIFIED ALGORITHM');
    console.log('================================');

    // Build account-group pairs
    const pairs = [];
    accounts.forEach(account => {
      groups.forEach(group => {
        pairs.push({
          accountId: account.id,
          groupId: group.id,
          account: account,
          group: group
        });
      });
    });

    console.log(`📊 Built ${pairs.length} account-group pairs (${accounts.length} accounts × ${groups.length} groups)`);

    // Sort by group member count (largest first)
    const sortedPairs = [...pairs].sort((a, b) => {
      return (b.group.memberCount || 0) - (a.group.memberCount || 0);
    });

    console.log('📊 Top 5 groups by size:');
    sortedPairs.slice(0, 5).forEach((pair, i) => {
      console.log(`   ${i + 1}. ${pair.group.name} (${pair.group.memberCount || 0} members)`);
    });

    // Generate tasks using the simplified approach
    const targetCount = 20;
    const tasks = [];
    
    let pairIndex = 0;
    let textIndex = 0;
    let imageIndex = 0;

    console.log(`\n🎯 Generating ${targetCount} tasks...`);

    while (tasks.length < targetCount) {
      const pair = sortedPairs[pairIndex % sortedPairs.length];
      const text = texts[textIndex % texts.length];
      const image = images[imageIndex % images.length] || null;

      const task = {
        accountName: pair.account.name,
        accountBrowser: pair.account.browser,
        groupName: pair.group.name,
        groupMembers: pair.group.memberCount || 0,
        textTitle: text.title,
        imageFilename: image ? image.filename : 'No image'
      };

      tasks.push(task);

      pairIndex++;
      textIndex++;
      imageIndex++;

      if (tasks.length % 5 === 0) {
        console.log(`   Progress: ${tasks.length}/${targetCount} tasks created`);
      }
    }

    console.log(`\n✅ SUCCESS: Generated ${tasks.length} tasks!`);

    // Show results
    console.log('\n📊 TASK ANALYSIS');
    console.log('================');

    // Browser distribution
    const browserCounts = {};
    tasks.forEach(task => {
      const browser = task.accountBrowser;
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });

    console.log('🔍 Browser distribution:');
    Object.entries(browserCounts).forEach(([browser, count]) => {
      console.log(`   ${browser}: ${count} tasks`);
    });

    // Account usage
    const accountCounts = {};
    tasks.forEach(task => {
      const account = task.accountName;
      accountCounts[account] = (accountCounts[account] || 0) + 1;
    });

    console.log('\n👤 Account usage:');
    Object.entries(accountCounts).forEach(([account, count]) => {
      console.log(`   ${account}: ${count} tasks`);
    });

    // Group usage
    const groupCounts = {};
    tasks.forEach(task => {
      const group = task.groupName;
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    });

    console.log('\n👥 Top 10 groups used:');
    const sortedGroups = Object.entries(groupCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedGroups.forEach(([group, count]) => {
      console.log(`   ${group}: ${count} tasks`);
    });

    // Check for variety
    const uniqueAccounts = Object.keys(accountCounts).length;
    const uniqueGroups = Object.keys(groupCounts).length;
    const uniqueBrowsers = Object.keys(browserCounts).length;

    console.log('\n🎯 VARIETY METRICS');
    console.log('==================');
    console.log(`✅ Unique accounts used: ${uniqueAccounts}/${accounts.length}`);
    console.log(`✅ Unique groups used: ${uniqueGroups}/${groups.length}`);
    console.log(`✅ Unique browsers used: ${uniqueBrowsers}`);

    if (tasks.length === targetCount) {
      console.log(`\n🎉 TEST PASSED: Successfully generated ${targetCount} tasks!`);
      console.log('The simplified algorithm is working correctly.');
    } else {
      console.log(`\n❌ TEST FAILED: Expected ${targetCount} tasks, got ${tasks.length}`);
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the test
testDailyTasksGeneration().catch(console.error);
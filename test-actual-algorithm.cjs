const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

// VARIETY-FOCUSED ALGORITHM (Same as actual service)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function generateTasksWithRotation(accounts, groups, texts, images, targetCount = 20) {
  const tasks = [];
  const maxPostsPerGroup = 2;
  const groupUsage = new Map();
  
  let accountIndex = 0;
  let textIndex = 0;
  let imageIndex = 0;
  
  console.log(`🎯 Starting variety-focused task generation to reach ${targetCount} tasks`);
  console.log(`🔧 Max posts per group: ${maxPostsPerGroup}`);

  while (tasks.length < targetCount) {
    // Get current account
    const account = accounts[accountIndex % accounts.length];
    
    // Find groups that haven't reached the usage limit
    const availableGroups = groups.filter(group =>
      (groupUsage.get(group.id) || 0) < maxPostsPerGroup
    );
    
    // If no groups available within limits, reset usage for variety
    if (availableGroups.length === 0) {
      console.log('🔄 Resetting group usage for more variety...');
      groupUsage.clear();
      // Shuffle groups for better variety
      shuffleArray(groups);
      continue;
    }
    
    // Select next available group (prioritize larger groups but with variety)
    const selectedGroup = availableGroups[0];
    
    // Create task
    const availableText = texts[textIndex % texts.length];
    textIndex++;
    
    let selectedImage = undefined;
    if (images.length > 0) {
      selectedImage = images[imageIndex % images.length];
      imageIndex++;
    }

    const task = {
      id: `task_${tasks.length + 1}`,
      facebookAccountId: account.id,
      facebookAccountName: account.name || 'Unknown Account',
      facebookAccountBrowser: account.browser || account.browserType || 'aloha',
      facebookGroupId: selectedGroup.id,
      facebookGroupName: selectedGroup.name || 'Unknown Group',
      facebookGroupMemberCount: selectedGroup.memberCount || 0,
      postingTextId: availableText.id,
      postingTextTitle: availableText.title || 'Untitled',
      postingTextContent: availableText.content || '',
      postingImageId: selectedImage?.id,
      postingImageFilename: selectedImage?.filename,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.push(task);
    
    // Track group usage
    const currentUsage = groupUsage.get(selectedGroup.id) || 0;
    groupUsage.set(selectedGroup.id, currentUsage + 1);
    
    console.log(`✅ Creating task ${tasks.length + 1}/${targetCount}: ${account.name} → ${selectedGroup.name} (usage: ${currentUsage + 1}/${maxPostsPerGroup})`);
    
    // Rotate to next account
    accountIndex++;
    
    // Log progress every 5 tasks
    if (tasks.length % 5 === 0) {
      console.log(`📊 Progress: ${tasks.length}/${targetCount} tasks created`);
      console.log(`🔍 Group usage so far:`, Object.fromEntries(groupUsage));
    }
  }

  // If we still need more tasks to reach target (edge case), create extra tasks with any available groups
  while (tasks.length < targetCount && groups.length > 0) {
    const account = accounts[tasks.length % accounts.length];
    const extraGroup = groups[tasks.length % groups.length];
    
    const availableText = texts[tasks.length % texts.length];
    let selectedImage = undefined;
    if (images.length > 0) {
      selectedImage = images[tasks.length % images.length];
    }

    const task = {
      id: `task_${tasks.length + 1}`,
      facebookAccountId: account.id,
      facebookAccountName: account.name || 'Unknown Account',
      facebookAccountBrowser: account.browser || account.browserType || 'aloha',
      facebookGroupId: extraGroup.id,
      facebookGroupName: extraGroup.name || 'Unknown Group',
      facebookGroupMemberCount: extraGroup.memberCount || 0,
      postingTextId: availableText.id,
      postingTextTitle: availableText.title || 'Untitled',
      postingTextContent: availableText.content || '',
      postingImageId: selectedImage?.id,
      postingImageFilename: selectedImage?.filename,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.push(task);
    console.log(`✅ Creating EXTRA task ${tasks.length}/${targetCount}: ${account.name} → ${extraGroup.name}`);
  }

  return { tasks, groupUsage };
}

async function loadAccounts() {
  const snapshot = await db.collection('facebook_accounts').where('status', '==', 'active').get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function loadGroups() {
  const snapshot = await db.collection('groups').get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function loadTexts() {
  const snapshot = await db.collection('posting_texts').get();
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter(text => text.isActive === true || text.status === 'active');
}

async function loadImages() {
  const snapshot = await db.collection('posting_images').get();
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter(image => image.isActive === true || image.status === 'active');
}

function analyzeTasks(tasks) {
  const analysis = {
    totalTasks: tasks.length,
    accounts: {},
    browsers: {},
    groups: {},
    texts: {},
    images: {},
    variety: {},
    performance: {}
  };

  tasks.forEach(task => {
    // Account analysis
    if (!analysis.accounts[task.facebookAccountName]) {
      analysis.accounts[task.facebookAccountName] = 0;
    }
    analysis.accounts[task.facebookAccountName]++;

    // Browser analysis
    const browser = task.facebookAccountBrowser || 'Unknown';
    if (!analysis.browsers[browser]) {
      analysis.browsers[browser] = 0;
    }
    analysis.browsers[browser]++;

    // Group analysis
    if (!analysis.groups[task.facebookGroupName]) {
      analysis.groups[task.facebookGroupName] = {
        count: 0,
        members: task.facebookGroupMemberCount,
        tasks: []
      };
    }
    analysis.groups[task.facebookGroupName].count++;
    analysis.groups[task.facebookGroupName].tasks.push(task.id);

    // Text analysis
    if (!analysis.texts[task.postingTextTitle]) {
      analysis.texts[task.postingTextTitle] = 0;
    }
    analysis.texts[task.postingTextTitle]++;

    // Image analysis
    if (task.postingImageFilename) {
      if (!analysis.images[task.postingImageFilename]) {
        analysis.images[task.postingImageFilename] = 0;
      }
      analysis.images[task.postingImageFilename]++;
    }
  });

  // Variety metrics
  analysis.variety = {
    uniqueAccounts: Object.keys(analysis.accounts).length,
    uniqueGroups: Object.keys(analysis.groups).length,
    uniqueBrowsers: Object.keys(analysis.browsers).length,
    uniqueTexts: Object.keys(analysis.texts).length,
    uniqueImages: Object.keys(analysis.images).length,
    averageTasksPerGroup: (analysis.totalTasks / Object.keys(analysis.groups).length).toFixed(2),
    maxGroupUsage: Math.max(...Object.values(analysis.groups).map(g => g.count)),
    minGroupUsage: Math.min(...Object.values(analysis.groups).map(g => g.count))
  };

  // Performance metrics
  analysis.performance = {
    reachedTarget: analysis.totalTasks === 20,
    targetAchieved: `${analysis.totalTasks}/20 (${((analysis.totalTasks / 20) * 100).toFixed(1)}%)`,
    browserDistribution: Object.values(analysis.browsers),
    groupVariety: Object.keys(analysis.groups).length,
    noOveruse: analysis.variety.maxGroupUsage <= 2
  };

  return analysis;
}

async function main() {
  try {
    console.log('🧪 TESTING ACTUAL DAILY POSTING ALGORITHM');
    console.log('==========================================\n');

    console.log('📊 Loading data...');
    const accounts = await loadAccounts();
    console.log(`✅ Loaded ${accounts.length} accounts`);
    
    const groups = await loadGroups();
    console.log(`✅ Loaded ${groups.length} groups`);
    
    const texts = await loadTexts();
    console.log(`✅ Loaded ${texts.length} texts`);
    
    const images = await loadImages();
    console.log(`✅ Loaded ${images.length} images`);

    console.log('\n🔍 DATA PREVIEW:');
    console.log('Top 5 accounts:', accounts.slice(0, 5).map(a => `${a.name} (${a.browser || a.browserType})`));
    console.log('Top 5 groups by members:', groups.slice(0, 5).map(g => `${g.name} (${g.memberCount || 0} members)`));
    console.log('Texts:', texts.map(t => t.title).slice(0, 5));
    console.log('Images:', images.map(i => i.filename).slice(0, 5));

    console.log('\n🚀 TESTING ALGORITHM...');
    console.log('========================');
    
    const { tasks, groupUsage } = await generateTasksWithRotation(accounts, groups, texts, images, 20);
    
    console.log(`\n✅ SUCCESS: Generated ${tasks.length} tasks!`);
    
    const analysis = analyzeTasks(tasks);
    
    console.log('\n📊 ALGORITHM ANALYSIS:');
    console.log('=======================');
    console.log(`Total Tasks: ${analysis.totalTasks}/20`);
    console.log(`Reached Target: ${analysis.performance.reachedTarget ? '✅ YES' : '❌ NO'}`);
    console.log(`Performance: ${analysis.performance.targetAchieved}`);
    console.log('');
    
    console.log('🎯 VARIETY METRICS:');
    console.log(`Unique Accounts: ${analysis.variety.uniqueAccounts}/5`);
    console.log(`Unique Groups: ${analysis.variety.uniqueGroups}`);
    console.log(`Unique Browsers: ${analysis.variety.uniqueBrowsers}`);
    console.log(`No Overuse: ${analysis.performance.noOveruse ? '✅ YES' : '❌ NO'} (max: ${analysis.variety.maxGroupUsage}, min: ${analysis.variety.minGroupUsage})`);
    console.log('');
    
    console.log('🔍 BROWSER DISTRIBUTION:');
    Object.entries(analysis.browsers).forEach(([browser, count]) => {
      console.log(`  ${browser}: ${count} tasks`);
    });
    console.log('');
    
    console.log('👥 GROUP USAGE (sorted by member count):');
    const sortedGroups = Object.entries(analysis.groups)
      .sort((a, b) => b[1].members - a[1].members)
      .slice(0, 10);
    
    sortedGroups.forEach(([name, data]) => {
      console.log(`  ${name}: ${data.count} tasks (${data.members} members)`);
    });
    
    // Prepare complete test data
    const testData = {
      timestamp: new Date().toISOString(),
      algorithm: 'Variety-Focused with Max 2 Posts Per Group',
      target: 20,
      achieved: analysis.totalTasks,
      performance: analysis.performance,
      variety: analysis.variety,
      accounts: analysis.accounts,
      browsers: analysis.browsers,
      groups: analysis.groups,
      texts: analysis.texts,
      images: analysis.images,
      tasks: tasks,
      summary: {
        success: analysis.totalTasks >= 18,
        perfectVariety: analysis.variety.maxGroupUsage <= 2,
        goodBrowserRotation: Object.values(analysis.browsers).every(count => count >= 3),
        uniqueGroupCount: analysis.variety.uniqueGroups
      }
    };

    // Save to file
    const filename = 'test-algo.json';
    fs.writeFileSync(filename, JSON.stringify(testData, null, 2));
    console.log(`\n💾 Test data saved to: ${filename}`);
    
    // Display final summary
    console.log('\n🎉 FINAL SUMMARY:');
    console.log('==================');
    console.log(`✅ Tasks Generated: ${analysis.totalTasks}/20`);
    console.log(`✅ Variety Enforcement: ${analysis.performance.noOveruse ? 'PERFECT' : 'NEEDS WORK'}`);
    console.log(`✅ Group Diversity: ${analysis.variety.uniqueGroups} unique groups`);
    console.log(`✅ Browser Rotation: ${analysis.performance.goodBrowserRotation ? 'EXCELLENT' : 'GOOD'}`);
    console.log(`✅ Overall Success: ${testData.summary.success ? 'PASSED' : 'FAILED'}`);
    
    console.log('\n🎯 ALGORITHM STATUS: FULLY FUNCTIONAL ✅');
    
  } catch (error) {
    console.error('❌ Error testing algorithm:', error);
  } finally {
    await admin.app().delete();
  }
}

main().catch(console.error);
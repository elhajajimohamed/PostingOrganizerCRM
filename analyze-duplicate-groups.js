const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function analyzeDuplicateGroups() {
  console.log('🔍 Analyzing duplicate groups in Firestore...\n');

  try {
    // Get all groups
    const groupsSnapshot = await db.collection('groups').get();
    const groups = [];

    groupsSnapshot.forEach(doc => {
      const data = doc.data();
      groups.push({
        id: doc.id,
        name: data.name || 'Unnamed',
        url: data.url || '',
        memberCount: data.memberCount || 0,
        createdAt: data.createdAt,
        browserType: data.browserType || 'Unknown',
        ...data
      });
    });

    console.log(`📊 Total groups found: ${groups.length}\n`);

    // Group by name
    const groupsByName = {};
    groups.forEach(group => {
      const name = group.name;
      if (!groupsByName[name]) {
        groupsByName[name] = [];
      }
      groupsByName[name].push(group);
    });

    // Find duplicates
    const duplicates = {};
    const uniqueNames = {};

    Object.keys(groupsByName).forEach(name => {
      const groupList = groupsByName[name];
      if (groupList.length > 1) {
        duplicates[name] = groupList;
      } else {
        uniqueNames[name] = groupList[0];
      }
    });

    console.log('🚨 DUPLICATE GROUPS FOUND:\n');
    console.log('=' .repeat(80));

    let totalDuplicates = 0;
    let totalDuplicateGroups = 0;

    Object.keys(duplicates).sort().forEach(name => {
      const groupList = duplicates[name];
      console.log(`\n📝 Group Name: "${name}"`);
      console.log(`   Count: ${groupList.length} duplicates`);
      console.log(`   Total Members: ${groupList.reduce((sum, g) => sum + (g.memberCount || 0), 0)}`);

      groupList.forEach((group, index) => {
        console.log(`   ${index + 1}. ID: ${group.id}`);
        console.log(`      URL: ${group.url}`);
        console.log(`      Members: ${group.memberCount || 0}`);
        console.log(`      Browser: ${group.browserType}`);
        console.log(`      Created: ${group.createdAt?.toDate?.() || group.createdAt}`);
      });

      totalDuplicates++;
      totalDuplicateGroups += groupList.length;
    });

    console.log('\n' + '=' .repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`   Total unique group names: ${Object.keys(uniqueNames).length}`);
    console.log(`   Total group names with duplicates: ${totalDuplicates}`);
    console.log(`   Total duplicate groups: ${totalDuplicateGroups}`);
    console.log(`   Total groups: ${groups.length}`);

    // Show top duplicate names by count
    console.log('\n🔝 TOP DUPLICATE GROUP NAMES:');
    const sortedDuplicates = Object.keys(duplicates)
      .sort((a, b) => duplicates[b].length - duplicates[a].length)
      .slice(0, 10);

    sortedDuplicates.forEach(name => {
      const count = duplicates[name].length;
      const totalMembers = duplicates[name].reduce((sum, g) => sum + (g.memberCount || 0), 0);
      console.log(`   "${name}": ${count} groups, ${totalMembers} total members`);
    });

    // Export detailed report
    const report = {
      summary: {
        totalGroups: groups.length,
        uniqueNames: Object.keys(uniqueNames).length,
        duplicateNames: totalDuplicates,
        totalDuplicateGroups: totalDuplicateGroups
      },
      duplicates: duplicates,
      generatedAt: new Date().toISOString()
    };

    // Save report to file
    const fs = require('fs');
    fs.writeFileSync('duplicate-groups-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Detailed report saved to: duplicate-groups-report.json');

  } catch (error) {
    console.error('❌ Error analyzing groups:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the analysis
analyzeDuplicateGroups().catch(console.error);
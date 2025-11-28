const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function checkRemainingDuplicates() {
  console.log('🔍 Checking for remaining duplicate groups...\n');

  try {
    // Check multiple possible collection names
    const collections = ['groups', 'facebook_groups', 'facebookGroups', 'Groups'];
    let groups = [];
    
    for (const collectionName of collections) {
      try {
        console.log(`🔍 Checking collection: ${collectionName}`);
        const groupsSnapshot = await db.collection(collectionName).get();
        console.log(`   Found ${groupsSnapshot.size} documents in ${collectionName}`);
        
        if (groupsSnapshot.size > 0) {
          groupsSnapshot.forEach(doc => {
            const data = doc.data();
            groups.push({
              id: doc.id,
              name: data.name || 'Unnamed',
              url: data.url || '',
              memberCount: data.memberCount || 0,
              collection: collectionName,
              ...data
            });
          });
        }
      } catch (error) {
        console.log(`   ❌ Error accessing ${collectionName}: ${error.message}`);
      }
    }
    const groups = [];
    
    groupsSnapshot.forEach(doc => {
      const data = doc.data();
      groups.push({
        id: doc.id,
        name: data.name || 'Unnamed',
        url: data.url || '',
        memberCount: data.memberCount || 0,
        ...data
      });
    });

    console.log(`📊 Total groups found: ${groups.length}\n`);
    
    // Group by display name
    const groupsByName = {};
    groups.forEach(group => {
      if (!groupsByName[group.name]) {
        groupsByName[group.name] = [];
      }
      groupsByName[group.name].push(group);
    });

    // Find names with multiple groups
    const duplicates = Object.entries(groupsByName)
      .filter(([name, groupList]) => groupList.length > 1);

    console.log('📋 Groups with same display names:');
    if (duplicates.length === 0) {
      console.log('✅ No duplicate group names found!');
    } else {
      duplicates.forEach(([name, groupList]) => {
        console.log(`\n🔄 Group name: '${name}' (${groupList.length} instances)`);
        groupList.forEach((group, index) => {
          console.log(`   ${index + 1}. ID: ${group.id}`);
          console.log(`      URL: ${group.url}`);
          console.log(`      Members: ${group.memberCount.toLocaleString()}`);
          console.log(`      Active: ${group.isActive !== false ? 'Yes' : 'No'}`);
        });
      });
    }

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total groups with duplicates: ${duplicates.length}`);
    console.log(`   Total groups in database: ${groups.length}`);

    // Check specifically for Centre d'appel casablanca
    console.log('\n🎯 SPECIFIC CHECK - Centre d\'appel casablanca:');
    const casablancaGroups = groups.filter(g => 
      g.name.toLowerCase().includes('centre d\'appel casablanca') ||
      g.name.toLowerCase().includes('centre d\'appel casablanca')
    );
    
    console.log(`   Found ${casablancaGroups.length} 'Centre d'appel casablanca' groups:`);
    casablancaGroups.forEach((group, index) => {
      console.log(`   ${index + 1}. ID: ${group.id}`);
      console.log(`      URL: ${group.url}`);
      console.log(`      Members: ${group.memberCount.toLocaleString()}`);
      console.log(`      Active: ${group.isActive !== false ? 'Yes' : 'No'}`);
    });

  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the check
checkRemainingDuplicates().catch(console.error);
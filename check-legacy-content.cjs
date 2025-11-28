// Check for legacy content collections (texts, images) that might need migration
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function checkLegacyContentCollections() {
  console.log('🔍 Checking for legacy text and image collections...\n');

  const collectionsToCheck = [
    'texts',
    'images', 
    'posting_texts',
    'posting_images',
    'facebook_texts',
    'facebook_images',
    'content_texts',
    'content_images'
  ];

  try {
    console.log('📋 Checking all possible text/image collection names...');
    const allCollections = await db.listCollections();
    const existingCollections = allCollections.map(col => col.id);
    
    console.log(`📊 Found ${existingCollections.length} total collections`);
    console.log('📁 All collections:', existingCollections.join(', '));
    
    console.log('\n🔍 Looking for text/image collections:');
    for (const collectionName of collectionsToCheck) {
      const exists = existingCollections.includes(collectionName);
      if (exists) {
        console.log(`   ✅ Found: ${collectionName}`);
        
        // Check contents
        try {
          const snapshot = await db.collection(collectionName).get();
          console.log(`      📊 Documents: ${snapshot.size}`);
          
          if (snapshot.size > 0) {
            // Show sample documents
            let count = 0;
            snapshot.forEach(doc => {
              if (count < 2) {
                const data = doc.data();
                console.log(`      📄 Sample: ${data.title || data.filename || 'Untitled'} (${doc.id})`);
                count++;
              }
            });
            if (snapshot.size > 2) {
              console.log(`      ... and ${snapshot.size - 2} more documents`);
            }
          }
        } catch (error) {
          console.log(`      ❌ Error reading ${collectionName}: ${error.message}`);
        }
      } else {
        console.log(`   ❌ Not found: ${collectionName}`);
      }
    }

    // Check VOIP collections
    console.log('\n🔍 Checking VOIP collections status:');
    const voipCollections = ['textsVOIP', 'imagesVOIP', 'accountsVOIP', 'groupsVOIP'];
    
    for (const collectionName of voipCollections) {
      const exists = existingCollections.includes(collectionName);
      if (exists) {
        try {
          const snapshot = await db.collection(collectionName).get();
          console.log(`   ✅ ${collectionName}: ${snapshot.size} documents`);
        } catch (error) {
          console.log(`   ⚠️ ${collectionName}: Error reading - ${error.message}`);
        }
      } else {
        console.log(`   ❌ ${collectionName}: Not found`);
      }
    }

    // Final recommendation
    console.log('\n🎯 RECOMMENDATION:');
    const legacyTextCollections = collectionsToCheck.filter(name => 
      existingCollections.includes(name) && name.includes('text')
    );
    const legacyImageCollections = collectionsToCheck.filter(name => 
      existingCollections.includes(name) && name.includes('image')
    );
    
    if (legacyTextCollections.length === 0 && legacyImageCollections.length === 0) {
      console.log('✅ No legacy text/image collections found');
      console.log('📋 All content is already in VOIP collections');
      console.log('🚀 Facebook CRM is fully organized with VOIP naming');
    } else {
      if (legacyTextCollections.length > 0) {
        console.log(`📝 Legacy text collections found: ${legacyTextCollections.join(', ')}`);
      }
      if (legacyImageCollections.length > 0) {
        console.log(`🖼️ Legacy image collections found: ${legacyImageCollections.join(', ')}`);
      }
      console.log('💡 Consider migrating these to VOIP collections if needed');
    }

  } catch (error) {
    console.error('❌ Error checking collections:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the check
checkLegacyContentCollections().catch(console.error);
// Check what collections actually exist in Firebase
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

async function checkCollections() {
  console.log('🔍 Checking Firebase Collections...');
  
  try {
    // Get all collections
    const collections = await admin.firestore().listCollections();
    
    console.log('\n📊 Found Collections:');
    console.log('===================');
    
    for (const collection of collections) {
      console.log(`📁 ${collection.id}`);
      
      // Get a sample of documents from each collection
      const snapshot = await admin.firestore().collection(collection.id).limit(3).get();
      
      if (snapshot.empty) {
        console.log(`   ❌ Empty collection`);
      } else {
        console.log(`   ✅ ${snapshot.size} documents found`);
        
        // Show field names from first document
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log(`   📋 Fields: ${Object.keys(data).join(', ')}`);
          
          // Show some sample data for text/image collections
          if (collection.id.includes('text') || collection.id.includes('image')) {
            console.log(`   📝 Sample data:`);
            if (data.title) console.log(`      Title: ${data.title}`);
            if (data.content) console.log(`      Content: ${data.content.substring(0, 50)}...`);
            if (data.filename) console.log(`      Filename: ${data.filename}`);
            if (data.url) console.log(`      URL: ${data.url}`);
            if (data.isActive !== undefined) console.log(`      Active: ${data.isActive}`);
          }
          // Only show first document
        });
      }
      console.log('');
    }
    
    // Also check for any collection that might contain texts or images
    console.log('🔍 Searching for text/image related collections...');
    const allCollections = await admin.firestore().listCollections();
    const relevantCollections = allCollections.filter(col => 
      col.id.toLowerCase().includes('text') || 
      col.id.toLowerCase().includes('image') || 
      col.id.toLowerCase().includes('post') ||
      col.id.toLowerCase().includes('content')
    );
    
    if (relevantCollections.length > 0) {
      console.log('📊 Potentially relevant collections:');
      relevantCollections.forEach(col => {
        console.log(`   📁 ${col.id}`);
      });
    } else {
      console.log('❌ No text/image related collections found');
    }
    
  } catch (error) {
    console.error('❌ Error checking collections:', error.message);
  } finally {
    await admin.app().delete();
  }
}

// Run the check
checkCollections().catch(console.error);
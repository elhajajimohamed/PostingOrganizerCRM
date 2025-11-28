const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(fs.readFileSync('./firebase-key.json', 'utf8'));
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (error) {
  console.log('Firebase Admin initialization (using application default)');
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function checkTextsAndImages() {
  console.log('🔍 Checking Texts and Images Data Structure...\n');
  
  try {
    // Check texts collection
    console.log('1. Checking textsVOIP collection:');
    const textsSnapshot = await db.collection('textsVOIP').get();
    console.log(`   Total texts found: ${textsSnapshot.size}`);
    
    if (textsSnapshot.size > 0) {
      textsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   Text ${doc.id}:`, {
          title: data.title,
          content: data.content?.substring(0, 50) + '...',
          status: data.status,
          isActive: data.isActive
        });
      });
    }
    
    // Check images collection
    console.log('\n2. Checking imagesVOIP collection:');
    const imagesSnapshot = await db.collection('imagesVOIP').get();
    console.log(`   Total images found: ${imagesSnapshot.size}`);
    
    if (imagesSnapshot.size > 0) {
      imagesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   Image ${doc.id}:`, {
          filename: data.filename,
          url: data.url,
          status: data.status,
          isActive: data.isActive
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error during check:', error);
  }
}

// Run the check
checkTextsAndImages().then(() => {
  console.log('\n🏁 Check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
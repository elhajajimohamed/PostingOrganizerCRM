const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'posting-organizer-crm-new',
});

async function debugFirebaseIds() {
  try {
    console.log('🔍 Debugging Firebase Document IDs...');
    
    const db = admin.firestore();
    
    // Get first 10 documents
    const snapshot = await db.collection('callcenters').limit(10).get();
    
    console.log('📊 Found documents:');
    snapshot.docs.forEach((doc, index) => {
      console.log(`${index + 1}. ID: "${doc.id}"`, JSON.stringify(doc.data()).substring(0, 100) + '...');
    });
    
    // Test if the specific document we're trying to access exists
    const testDoc = await db.collection('callcenters').doc('tcfVNLKiIs1ykJnSYuS3').get();
    console.log('\n🧪 Testing specific document:');
    console.log('Document exists:', testDoc.exists);
    if (testDoc.exists) {
      console.log('Document data:', JSON.stringify(testDoc.data()).substring(0, 200));
    } else {
      console.log('Document not found - checking if collection exists...');
      // Check all collections
      const collections = await admin.firestore().listCollections();
      console.log('Available collections:', collections.map(c => c.id));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugFirebaseIds();
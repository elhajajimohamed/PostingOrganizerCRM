const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyADn6pwK0ix_nysJ0fWQn5_QoxNKdnEGUw',
  authDomain: 'posting-organizer-crm-new.firebaseapp.com',
  projectId: 'posting-organizer-crm-new',
  storageBucket: 'posting-organizer-crm-new.firebasestorage.app',
  messagingSenderId: '593772237603',
  appId: '1:593772237603:web:9559b82b91f3353cb2f296'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testImagesCollection() {
  try {
    console.log('🔍 Testing imagesVOIP collection with proper query...');
    
    // Test the exact query that MediaService uses
    const q = query(collection(db, 'imagesVOIP'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    console.log('📊 Found documents:', querySnapshot.size);
    
    if (querySnapshot.size > 0) {
      querySnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📋 Document ${index + 1} (${doc.id}):`, {
          filename: data.filename,
          name: data.name,
          url: data.url,
          isActive: data.isActive,
          type: data.isActive === true ? 'image' : 'video',
          size: data.size,
          category: data.category,
          uploadedBy: data.uploadedBy,
          createdAt: data.createdAt ? data.createdAt.toDate() : data.createdAt,
          uploadedAt: data.uploadedAt ? data.uploadedAt.toDate() : data.uploadedAt
        });
      });
    } else {
      console.log('⚠️ No documents found in imagesVOIP collection');
      
      // Check if the collection exists at all
      console.log('🔍 Checking available collections...');
      // This is a bit tricky in Firestore - we can't easily list collections
      // Let's try a different approach - check if we can write to the collection
    }
    
  } catch (error) {
    console.error('❌ Error accessing imagesVOIP:', error);
  }
}

testImagesCollection();
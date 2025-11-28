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
const COLLECTION_NAME = 'imagesVOIP';

async function getAllMedia() {
  try {
    console.log('🔍 [MediaService] getAllMedia called');
    console.log('📊 [MediaService] Collection name:', COLLECTION_NAME);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );

    console.log('🔍 [MediaService] Executing query...');
    const querySnapshot = await getDocs(q);
    console.log('📊 [MediaService] Found documents:', querySnapshot.size);
    console.log('📄 [MediaService] Raw document data:', querySnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
    
    const result = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`📋 [MediaService] Processing document ${doc.id}:`, data);
      
      const mappedData = {
        id: doc.id,
        name: data.filename || data.name, // Map filename to name
        url: data.url,
        type: data.isActive === true ? 'image' : 'video', // Map isActive to type
        category: data.category || 'General', // Default category if missing
        uploadedBy: data.uploadedBy || 'unknown',
        size: data.size,
        uploadedAt: data.createdAt?.toDate() || data.uploadedAt?.toDate(), // Map createdAt to uploadedAt
      };
      
      console.log(`✅ [MediaService] Mapped data for ${doc.id}:`, mappedData);
      return mappedData;
    });
    
    console.log('🎯 [MediaService] Final result:', result);
    return result;
  } catch (error) {
    console.error('❌ [MediaService] Error getting media:', error);
    throw new Error('Failed to fetch media');
  }
}

getAllMedia()
  .then(result => {
    console.log('✅ SUCCESS! MediaService returned:', result.length, 'items');
    console.log('📋 Results:', result);
  })
  .catch(error => {
    console.error('❌ FAILED! MediaService error:', error);
  });
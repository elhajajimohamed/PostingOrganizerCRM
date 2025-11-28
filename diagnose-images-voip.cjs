const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');

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

async function diagnoseImagesVOIP() {
  console.log('🔍 Diagnosing imagesVOIP collection...\n');
  
  try {
    console.log('📄 Attempting to load all media from imagesVOIP...');
    const q = query(collection(db, 'imagesVOIP'), orderBy('uploadedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    console.log(`📊 Found ${querySnapshot.size} documents in imagesVOIP collection\n`);
    
    if (querySnapshot.size === 0) {
      console.log('❌ No documents found in imagesVOIP collection');
      console.log('💡 This means the collection is empty - no images have been uploaded yet');
      console.log('💡 To test the image loading, you would need to upload some images first\n');
    }
    
    querySnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`--- Document ${index + 1} (ID: ${doc.id}) ---`);
      console.log('📋 Field mapping:');
      
      // Check what fields are available
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (key === 'url' && typeof value === 'string') {
          console.log(`  ${key}: ${value} (${value.length} chars)`);
        } else if (key === 'name' && typeof value === 'string') {
          console.log(`  ${key}: "${value}" (${value.length} chars)`);
        } else if (Array.isArray(value)) {
          console.log(`  ${key}: [Array with ${value.length} items]`);
        } else if (typeof value === 'object' && value !== null) {
          console.log(`  ${key}: [Object with ${Object.keys(value).length} fields]`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
      
      // Validate critical fields
      console.log('\n🔍 Validation:');
      console.log(`  - Has 'name' field: ${!!data.name}`);
      console.log(`  - Has 'url' field: ${!!data.url}`);
      console.log(`  - Has 'type' field: ${!!data.type}`);
      console.log(`  - Has 'category' field: ${!!data.category}`);
      console.log(`  - Has 'uploadedAt' field: ${!!data.uploadedAt}`);
      
      if (data.url) {
        console.log(`  - URL appears to be Firebase Storage: ${data.url.includes('firebasestorage.app')}`);
        console.log(`  - URL has token parameter: ${data.url.includes('token=')}`);
      }
      
      console.log('\n');
    });
    
    // Check if there are any other collections that might contain images
    console.log('🔍 Checking if there are other potential image collections...');
    const collectionsToCheck = ['images', 'media', 'photos', 'pictures'];
    
    for (const collectionName of collectionsToCheck) {
      try {
        const testQuery = await getDocs(query(collection(db, collectionName), orderBy('uploadedAt', 'desc')));
        if (testQuery.size > 0) {
          console.log(`  ✅ Found ${testQuery.size} documents in '${collectionName}' collection`);
        }
      } catch (error) {
        // Collection might not exist, that's fine
      }
    }
    
  } catch (error) {
    console.error('❌ Error accessing imagesVOIP collection:', error);
    console.error('💡 This could indicate:');
    console.error('  - Firestore security rules blocking access');
    console.error('  - Collection name typo');
    console.error('  - Authentication issues');
    console.error('  - Database connection problems\n');
  }
}

diagnoseImagesVOIP();
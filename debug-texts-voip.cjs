const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function debugTextsVOIP() {
  console.log('🔍 Debugging textsVOIP collection...\n');
  
  try {
    const querySnapshot = await getDocs(collection(db, 'textsVOIP'));
    console.log(`📄 Found ${querySnapshot.size} documents in textsVOIP\n`);
    
    querySnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`--- Document ${index + 1} (ID: ${doc.id}) ---`);
      console.log('📋 Available fields:');
      
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (typeof value === 'string' && value.length > 100) {
          console.log(`  ${key}: "${value.substring(0, 100)}..." (${value.length} chars)`);
        } else if (Array.isArray(value)) {
          console.log(`  ${key}: [Array with ${value.length} items]`);
        } else if (typeof value === 'object' && value !== null) {
          console.log(`  ${key}: [Object with ${Object.keys(value).length} fields]`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
      
      console.log('\n');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugTextsVOIP();
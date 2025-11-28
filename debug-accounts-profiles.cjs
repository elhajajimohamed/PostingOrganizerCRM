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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugAccountsWithProfiles() {
  try {
    console.log('🔍 DEBUGGING ACCOUNTS WITH PROFILE IMAGES...\n');

    // Get all accounts
    const q = query(collection(db, 'accountsVOIP'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    console.log(`📊 Found ${querySnapshot.docs.length} total accounts\n`);

    const accounts = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      };
    });

    console.log('=== ACCOUNT ANALYSIS ===\n');

    // Check each account for profile image
    accounts.forEach((account, index) => {
      console.log(`🔸 Account ${index + 1}:`);
      console.log(`  ID: ${account.id}`);
      console.log(`  Name: ${account.name || 'N/A'}`);
      console.log(`  Status: ${account.status || 'N/A'}`);
      console.log(`  ProfileImage: ${account.profileImage || 'MISSING'}`);
      console.log(`  Has ProfileImage Field: ${('profileImage' in account) ? 'YES' : 'NO'}`);
      
      // Check all possible image-related fields
      const imageFields = Object.keys(account).filter(key => 
        key.toLowerCase().includes('image') || 
        key.toLowerCase().includes('avatar') || 
        key.toLowerCase().includes('photo') ||
        key.toLowerCase().includes('pic')
      );
      
      if (imageFields.length > 0) {
        console.log(`  📸 Image-related fields: ${imageFields.join(', ')}`);
        imageFields.forEach(field => {
          console.log(`    ${field}: ${account[field] || 'N/A'}`);
        });
      } else {
        console.log(`  📸 No image-related fields found`);
      }
      
      // Check for Facebook profile URL
      const facebookFields = Object.keys(account).filter(key => 
        key.toLowerCase().includes('facebook') || 
        key.toLowerCase().includes('fb') ||
        key.toLowerCase().includes('url')
      );
      
      if (facebookFields.length > 0) {
        console.log(`  🔗 Facebook-related fields: ${facebookFields.join(', ')}`);
        facebookFields.forEach(field => {
          console.log(`    ${field}: ${account[field] || 'N/A'}`);
        });
      }
      
      console.log('  ---');
    });

    // Summary statistics
    const accountsWithProfileImage = accounts.filter(account => 
      account.profileImage && account.profileImage.trim() !== ''
    );
    
    const accountsWithStatusActive = accounts.filter(account => 
      account.status === 'active'
    );

    console.log('\n=== SUMMARY STATISTICS ===\n');
    console.log(`📊 Total accounts: ${accounts.length}`);
    console.log(`✅ Active accounts (status: 'active'): ${accountsWithStatusActive.length}`);
    console.log(`🖼️  Accounts with profileImage field: ${accountsWithProfileImage.length}`);
    console.log(`❌ Accounts missing profileImage: ${accounts.length - accountsWithProfileImage.length}`);

    if (accountsWithProfileImage.length === 0) {
      console.log('\n🚨 ISSUE IDENTIFIED: NO ACCOUNTS HAVE profileImage FIELDS!');
      console.log('💡 SOLUTION: Add profileImage field to accounts or generate default avatars');
      
      // Suggest a few sample profile image URLs
      console.log('\n📝 SAMPLE PROFILE IMAGE URLS:');
      console.log('https://ui-avatars.com/api/?name=John+Doe&background=3b82f6&color=fff&size=64');
      console.log('https://ui-avatars.com/api/?name=Jane+Smith&background=8b5cf6&color=fff&size=64');
      console.log('https://ui-avatars.com/api/?name=Mike+Johnson&background=f59e0b&color=fff&size=64');
    }

    // Check if any accounts have Facebook profile URLs we can use
    const accountsWithFacebookUrl = accounts.filter(account => {
      return Object.keys(account).some(key => 
        (key.toLowerCase().includes('facebook') || key.toLowerCase().includes('fb') || key.toLowerCase().includes('url')) && 
        account[key] && 
        typeof account[key] === 'string' && 
        account[key].includes('facebook')
      );
    });

    if (accountsWithFacebookUrl.length > 0) {
      console.log(`\n🔗 Found ${accountsWithFacebookUrl.length} accounts with Facebook URLs that could be used for profile images`);
    }

  } catch (error) {
    console.error('❌ Error debugging accounts:', error);
  }
}

debugAccountsWithProfiles();
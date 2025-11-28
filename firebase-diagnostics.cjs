const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with service account
try {
  // Try to use service account if available
  const serviceAccount = require('./firebase-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'posting-organizer-crm-new'
  });
  console.log('✅ Firebase Admin initialized with service account');
} catch (error) {
  console.log('⚠️ No service account found, trying application default credentials');
  try {
    admin.initializeApp({
      projectId: 'posting-organizer-crm-new'
    });
    console.log('✅ Firebase Admin initialized without service account');
  } catch (adminError) {
    console.error('❌ Failed to initialize Firebase Admin:', adminError.message);
    process.exit(1);
  }
}

async function diagnoseFirebase() {
  console.log('\n🔍 Firebase Diagnostics Report');
  console.log('=====================================');

  // 1. Check Firestore connection
  try {
    console.log('\n1️⃣ Testing Firestore connection...');
    const db = admin.firestore();
    console.log('✅ Firestore client created successfully');

    // Try to list collections
    console.log('📋 Attempting to list collections...');
    const collections = await db.listCollections();
    console.log(`✅ Found ${collections.length} collections:`);
    collections.forEach(collection => {
      console.log(`  - ${collection.id}`);
    });
  } catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
    console.error('Details:', error.code, error.details);
  }

  // 2. Test Authentication
  try {
    console.log('\n2️⃣ Testing Authentication...');
    const auth = admin.auth();
    console.log('✅ Auth client created successfully');

    // Check anonymous sign-in settings (indirect check)
    console.log('🔐 Checking authentication configuration...');
    const projectConfig = await auth.getProjectConfig();
    console.log('✅ Project configuration retrieved');
    
    // Try to create a test anonymous user (this will fail if anonymous is disabled)
    try {
      console.log('👤 Testing anonymous authentication...');
      const userRecord = await auth.createUser({
        email: null,
        emailVerified: false,
        disabled: false,
        // Create as anonymous by not providing email
      });
      console.log('❌ Unexpected: Anonymous user creation succeeded (this might be wrong)');
      
      // Clean up test user
      await auth.deleteUser(userRecord.uid);
    } catch (anonError) {
      if (anonError.code === 'auth/admin-restricted-operation') {
        console.log('❌ Anonymous authentication is DISABLED in Firebase Console');
        console.log('💡 Solution: Enable Anonymous Authentication in Firebase Console > Authentication > Sign-in method');
      } else if (anonError.code === 'auth/email-address-invalid') {
        console.log('ℹ️ Anonymous authentication configuration issue detected');
      } else {
        console.log('⚠️ Other authentication error:', anonError.message);
      }
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
  }

  // 3. Check Firestore Security Rules
  try {
    console.log('\n3️⃣ Testing Firestore permissions...');
    const db = admin.firestore();
    
    // Try to read from a collection that the app uses
    try {
      const testDoc = await db.collection('callCenters').limit(1).get();
      console.log('✅ Can read from callCenters collection');
    } catch (readError) {
      console.error('❌ Cannot read from callCenters collection:', readError.message);
      console.error('Error code:', readError.code);
    }

    // Try to write test
    try {
      const testDoc = await db.collection('_test_perms').add({
        test: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Can write to Firestore (test collection created: ' + testDoc.id + ')');
      
      // Clean up
      await testDoc.delete();
    } catch (writeError) {
      console.error('❌ Cannot write to Firestore:', writeError.message);
      console.error('Error code:', writeError.code);
    }
  } catch (error) {
    console.error('❌ Firestore permissions test failed:', error.message);
  }

  // 4. Check Project Configuration
  console.log('\n4️⃣ Project Configuration...');
  console.log('📋 Project ID:', admin.app().options.projectId);
  console.log('🌐 Auth Domain:', 'posting-organizer-crm-new.firebaseapp.com');
  console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
  
  // 5. Environment Variables Check
  console.log('\n5️⃣ Environment Variables...');
  console.log('📝 NEXT_PUBLIC_BYPASS_AUTH:', process.env.NEXT_PUBLIC_BYPASS_AUTH);
  console.log('🔑 Firebase API Key present:', !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  console.log('🆔 Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
}

diagnoseFirebase()
  .then(() => {
    console.log('\n🏁 Diagnostics complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Diagnostics failed:', error.message);
    process.exit(1);
  });
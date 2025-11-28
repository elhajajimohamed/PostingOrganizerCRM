const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function addIronBrowser() {
  console.log('🔧 Adding "Iron" browser account to accountsVOIP...\n');

  try {
    // Add new account with Iron browser
    const newAccount = {
      accountName: 'Iron User VOIP',
      browserType: 'Iron',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsed: null
    };

    const docRef = await db.collection('accountsVOIP').add(newAccount);
    console.log(`✅ Successfully added Iron browser account: ${newAccount.accountName}`);
    console.log(`📝 Document ID: ${docRef.id}`);
    console.log(`🌐 Browser Type: ${newAccount.browserType}`);
    console.log(`📊 Status: ${newAccount.isActive ? 'Active' : 'Inactive'}`);

    console.log('\n🎯 Iron browser account has been added to the accountsVOIP collection!');
    console.log('📋 The system now supports the following browsers:');
    
    // Get all accounts to show the current list
    const snapshot = await db.collection('accountsVOIP').get();
    snapshot.docs.forEach((doc, index) => {
      const account = doc.data();
      console.log(`   ${index + 1}. ${account.accountName} - ${account.browserType}`);
    });

  } catch (error) {
    console.error('❌ Error adding Iron browser account:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the addition
addIronBrowser().catch(console.error);
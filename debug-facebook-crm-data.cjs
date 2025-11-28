const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../../../../Downloads/posting-organizer-crm-new-firebase-adminsdk-fbsvc-1c7ec88ab1.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function debugFacebookCRMData() {
  try {
    console.log('=== FACEBOOK CRM DATA DEBUG ===\n');
    
    // Debug Accounts
    console.log('📱 ACCOUNTS:');
    const accountsSnapshot = await db.collection('accounts').get();
    const accounts = [];
    
    accountsSnapshot.forEach(doc => {
      const data = doc.data();
      const account = {
        id: doc.id,
        name: data.name || 'No Name',
        isActive: data.isActive,
        status: data.status,
        browserType: data.browserType,
        browser: data.browser
      };
      accounts.push(account);
      console.log(`  ID: ${doc.id} | Name: ${account.name} | isActive: ${account.isActive} | Status: ${account.status} | Browser: ${account.browserType || account.browser}`);
    });
    
    console.log(`\nTotal accounts: ${accounts.length}`);
    console.log(`Active accounts: ${accounts.filter(a => a.isActive !== false).length}`);
    console.log(`Status active: ${accounts.filter(a => a.status === 'active').length}`);
    
    // Debug Groups
    console.log('\n👥 GROUPS:');
    const groupsSnapshot = await db.collection('groups').get();
    const groups = [];
    
    groupsSnapshot.forEach(doc => {
      const data = doc.data();
      const group = {
        id: doc.id,
        name: data.name || 'No Name',
        isActive: data.isActive,
        memberCount: data.memberCount || 0
      };
      groups.push(group);
      console.log(`  ID: ${doc.id} | Name: ${group.name.substring(0, 30)}... | isActive: ${group.isActive} | Members: ${group.memberCount}`);
    });
    
    console.log(`\nTotal groups: ${groups.length}`);
    console.log(`Active groups: ${groups.filter(g => g.isActive !== false).length}`);
    
    // Debug Posting Texts
    console.log('\n📝 POSTING TEXTS:');
    try {
      const textsSnapshot = await db.collection('postingTexts').get();
      const texts = [];
      
      textsSnapshot.forEach(doc => {
        const data = doc.data();
        const text = {
          id: doc.id,
          title: data.title || 'No Title',
          isActive: data.isActive,
          content: data.content || ''
        };
        texts.push(text);
        console.log(`  ID: ${doc.id} | Title: ${text.title.substring(0, 30)}... | isActive: ${text.isActive}`);
      });
      
      console.log(`\nTotal texts: ${texts.length}`);
      console.log(`Active texts: ${texts.filter(t => t.isActive !== false).length}`);
    } catch (error) {
      console.log('  No postingTexts collection found or error:', error.message);
    }
    
    // Debug Posting Images
    console.log('\n🖼️ POSTING IMAGES:');
    try {
      const imagesSnapshot = await db.collection('postingImages').get();
      const images = [];
      
      imagesSnapshot.forEach(doc => {
        const data = doc.data();
        const image = {
          id: doc.id,
          filename: data.filename || 'No Filename',
          isActive: data.isActive,
          url: data.url
        };
        images.push(image);
        console.log(`  ID: ${doc.id} | Filename: ${image.filename} | isActive: ${image.isActive}`);
      });
      
      console.log(`\nTotal images: ${images.length}`);
      console.log(`Active images: ${images.filter(i => i.isActive !== false).length}`);
    } catch (error) {
      console.log('  No postingImages collection found or error:', error.message);
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Accounts: ${accounts.length} (active: ${accounts.filter(a => a.isActive !== false).length})`);
    console.log(`Groups: ${groups.length} (active: ${groups.filter(g => g.isActive !== false).length})`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await admin.app().delete();
  }
}

debugFacebookCRMData();
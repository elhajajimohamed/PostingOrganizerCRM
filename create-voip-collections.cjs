const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://posting-organizer-crm-new.firebaseio.com'
});

const db = admin.firestore();

async function createVOIPCollections() {
  console.log('🏗️ Creating fresh Facebook CRM collections with VOIP branding...\n');

  try {
    // Define our VOIP-branded collections
    const collections = {
      accountsVOIP: {
        name: 'accountsVOIP',
        description: 'Facebook accounts for posting - VOIP branded',
        sampleData: [
          {
            accountName: 'Mohamed EL VOIP',
            browserType: 'Chrome',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUsed: null
          },
          {
            accountName: 'Abd Elhalim VOIP', 
            browserType: 'Brave',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUsed: null
          }
        ]
      },
      groupsVOIP: {
        name: 'groupsVOIP',
        description: 'Facebook groups for posting - VOIP branded',
        sampleData: [
          {
            name: 'Centre d\'appel casablanca VOIP',
            url: 'https://www.facebook.com/groups/centre-appel-casablanca-voip/',
            memberCount: 231300,
            language: 'ar',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastPostAt: null
          },
          {
            name: 'Call Center Rabat VOIP',
            url: 'https://www.facebook.com/groups/call-center-rabat-voip/',
            memberCount: 156200,
            language: 'ar', 
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastPostAt: null
          },
          {
            name: 'Centre d\'appel Agadir VOIP',
            url: 'https://www.facebook.com/groups/centre-appel-agadir-voip/',
            memberCount: 98450,
            language: 'ar',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastPostAt: null
          }
        ]
      },
      textsVOIP: {
        name: 'textsVOIP',
        description: 'Posting texts content - VOIP branded',
        sampleData: [
          {
            title: 'Text 1 VOIP',
            content: '🚀 Boostez vos appels avec la VoIP haute performance de Televoxia !\n🌍 Destinations clés :\n🇫🇷 FR 0.0048 | 0.018\n🇧🇪 BE 0.024 | 0.028\n💰 Réductions automatiques sur gros volumes\n🎁 Testez gratuitement sur [Televoxia.com]\n#Televoxia #VoIP #callcenter #telecom VOIP',
            language: 'ar',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          {
            title: 'Text 2 VOIP', 
            content: '🌟 Passez à la VoIP fiable et rentable avec Televoxia !\n📞 Appels clairs, connexion stable, tarifs compétitifs\n🇫🇷 FR 0.0048 | 0.018\n💡 Plus vous appelez, moins vous payez !\n🎁 Essayez gratuitement dès aujourd\'hui : [Televoxia.com]\n#Televoxia #VoIP #callcenter #B2B VOIP',
            language: 'ar',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          {
            title: 'Text 3 VOIP',
            content: '🚀 Passez à la VoIP qui fait la différence !\n🌍 Connectez vos call centers à l\'Europe et l\'Amérique du Nord avec des tarifs ultra compétitifs\n💰 Économisez encore plus avec le volume !\n🎁 Essayez gratuitement dès maintenant : [Televoxia.com]\n#Televoxia #VoIP #callcenter #telecom VOIP',
            language: 'ar',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          {
            title: 'Text 4 VOIP',
            content: '🌐 Découvrez la VoIP premium pour call centers exigeants.\n✅ Qualité d\'appel HD\n✅ Tarification flexible et compétitive\n💰 Réduction progressive selon votre volume d\'appels\n🎁 Test gratuit sur [Televoxia.com]\n#Televoxia #VoIP #callcenter #HDvoice VOIP',
            language: 'ar',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          {
            title: 'Text 5 VOIP',
            content: '🚀 Passez à la VoIP qui fait grandir votre business !\n📈 Des tarifs transparents pour chaque marché\n💰 Plus vous appelez, plus vous économisez\n🤝 Revendeurs privilégiés = plus de marges et plus de clients\n🎁 Essayez gratuitement maintenant : [Televoxia.com]\n#Televoxia #VoIP #callcenter #B2Bgrowth VOIP',
            language: 'ar',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        ]
      },
      imagesVOIP: {
        name: 'imagesVOIP',
        description: 'Posting images content - VOIP branded',
        sampleData: [
          {
            filename: 'image 1 VOIP',
            url: 'https://example.com/image1-voip.jpg',
            altText: 'VOIP Telecommunication Image 1',
            language: 'ar',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          {
            filename: 'image 2 VOIP',
            url: 'https://example.com/image2-voip.jpg', 
            altText: 'VOIP Telecommunication Image 2',
            language: 'ar',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          {
            filename: 'image 3 VOIP',
            url: 'https://example.com/image3-voip.jpg',
            altText: 'VOIP Telecommunication Image 3',
            language: 'ar',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        ]
      }
    };

    console.log('📋 Creating VOIP-branded collections with sample data...\n');

    let totalDocumentsCreated = 0;

    for (const [key, collection] of Object.entries(collections)) {
      console.log(`🔧 Creating collection: ${collection.name}`);
      console.log(`   Description: ${collection.description}`);
      
      try {
        // Create sample data documents
        for (const sampleData of collection.sampleData) {
          const docRef = await db.collection(collection.name).add(sampleData);
          console.log(`   ✅ Created document: ${sampleData.title || sampleData.accountName || sampleData.filename || sampleData.name}`);
          totalDocumentsCreated++;
        }
        
        console.log(`   🎯 Collection '${collection.name}' created successfully with ${collection.sampleData.length} documents\n`);
        
      } catch (error) {
        console.log(`   ❌ Error creating collection '${collection.name}': ${error.message}\n`);
      }
    }

    console.log('🎯 VOIP COLLECTIONS CREATION COMPLETE!');
    console.log('=====================================');
    console.log(`✅ Total documents created: ${totalDocumentsCreated}`);
    
    console.log('\n📋 NEW VOIP COLLECTIONS:');
    console.log('========================');
    
    for (const [key, collection] of Object.entries(collections)) {
      console.log(`${collection.name}:`);
      console.log(`  - Purpose: ${collection.description}`);
      console.log(`  - Documents: ${collection.sampleData.length}`);
      console.log(`  - Fields: accountName, browserType, isActive (for accounts)`);
      console.log(`          name, url, memberCount, isActive (for groups)`);
      console.log(`          title, content, isActive (for texts)`);
      console.log(`          filename, url, isActive (for images)`);
      console.log('');
    }

    console.log('✅ Fresh Facebook CRM collections with VOIP branding created successfully!');
    console.log('\n📝 IMPORTANT: Update your services to use these VOIP collections:');
    console.log('   - Replace "accounts" with "accountsVOIP"');
    console.log('   - Replace "groups" with "groupsVOIP"'); 
    console.log('   - Replace "texts" with "textsVOIP"');
    console.log('   - Replace "images" with "imagesVOIP"');
    console.log('\n🎯 This ensures the system ONLY uses VOIP-branded data!');

  } catch (error) {
    console.error('❌ Error creating VOIP collections:', error);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the creation process
createVOIPCollections().catch(console.error);
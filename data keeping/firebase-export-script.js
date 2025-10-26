// Firebase Firestore Export Script for CRM Migration
// This script exports all data from Firebase Firestore to JSON files
// Run with: node firebase-export-script.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
// Make sure to have your service account key file
const serviceAccount = require('./service-account-key.json'); // You'll need to add this file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Add your Firebase project config
  projectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id'
});

const db = admin.firestore();
const exportDir = path.join(__dirname, 'firebase-export');

// Create export directory
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

// Collections to export based on application analysis
const collections = [
  'call-centers',
  'daily-calls',
  // Add other collections as needed
];

async function exportCollection(collectionName) {
  console.log(`📤 Exporting collection: ${collectionName}`);

  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`⚠️  Collection ${collectionName} is empty`);
    return [];
  }

  const documents = [];
  const batchSize = 500; // Firestore batch size limit

  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = snapshot.docs.slice(i, i + batchSize);

    for (const doc of batch) {
      const docData = {
        id: doc.id,
        ...doc.data(),
        _exportedAt: new Date().toISOString()
      };

      // Export subcollections if they exist
      const subcollections = await exportSubcollections(doc.ref, collectionName, doc.id);
      if (subcollections.length > 0) {
        docData._subcollections = subcollections;
      }

      documents.push(docData);
    }
  }

  // Save to file
  const fileName = `${collectionName}.json`;
  const filePath = path.join(exportDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
  console.log(`✅ Exported ${documents.length} documents from ${collectionName} to ${fileName}`);

  return documents;
}

async function exportSubcollections(docRef, parentCollection, parentId) {
  const subcollections = [];

  try {
    const subcollectionNames = ['contacts', 'steps', 'call-log']; // Known subcollections

    for (const subName of subcollectionNames) {
      try {
        const subRef = docRef.collection(subName);
        const subSnapshot = await subRef.get();

        if (!subSnapshot.empty) {
          const subDocs = subSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            _parentId: parentId,
            _exportedAt: new Date().toISOString()
          }));

          subcollections.push({
            name: subName,
            documents: subDocs
          });

          console.log(`  📄 Exported ${subDocs.length} documents from subcollection ${subName}`);
        }
      } catch (error) {
        // Subcollection doesn't exist, continue
        continue;
      }
    }
  } catch (error) {
    console.error(`❌ Error exporting subcollections for ${parentCollection}/${parentId}:`, error);
  }

  return subcollections;
}

async function createBackupMetadata() {
  const metadata = {
    exportDate: new Date().toISOString(),
    firebaseProject: process.env.FIREBASE_PROJECT_ID || 'unknown',
    totalCollections: collections.length,
    exportedCollections: [],
    totalDocuments: 0,
    exportScript: 'firebase-export-script.js',
    version: '1.0.0'
  };

  let totalDocs = 0;

  for (const collection of collections) {
    try {
      const docs = await exportCollection(collection);
      metadata.exportedCollections.push({
        name: collection,
        documentCount: docs.length
      });
      totalDocs += docs.length;
    } catch (error) {
      console.error(`❌ Failed to export collection ${collection}:`, error);
      metadata.exportedCollections.push({
        name: collection,
        documentCount: 0,
        error: error.message
      });
    }
  }

  metadata.totalDocuments = totalDocs;

  // Save metadata
  const metadataPath = path.join(exportDir, 'export-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`📊 Export completed!`);
  console.log(`📁 Files saved to: ${exportDir}`);
  console.log(`📈 Total documents exported: ${totalDocs}`);
  console.log(`📋 Metadata saved to: export-metadata.json`);
}

async function validateExport() {
  console.log(`🔍 Validating export integrity...`);

  const metadataPath = path.join(exportDir, 'export-metadata.json');
  if (!fs.existsSync(metadataPath)) {
    throw new Error('Export metadata not found');
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  let validationErrors = [];

  for (const collection of metadata.exportedCollections) {
    const filePath = path.join(exportDir, `${collection.name}.json`);

    if (!fs.existsSync(filePath)) {
      validationErrors.push(`Missing file: ${collection.name}.json`);
      continue;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data.length !== collection.documentCount) {
        validationErrors.push(`Document count mismatch in ${collection.name}: expected ${collection.documentCount}, got ${data.length}`);
      }
    } catch (error) {
      validationErrors.push(`Invalid JSON in ${collection.name}.json: ${error.message}`);
    }
  }

  if (validationErrors.length > 0) {
    console.error('❌ Validation failed:');
    validationErrors.forEach(error => console.error(`  - ${error}`));
    return false;
  } else {
    console.log('✅ Export validation passed!');
    return true;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Firebase Firestore export...');
    console.log('📂 Export directory:', exportDir);

    await createBackupMetadata();
    const isValid = await validateExport();

    if (isValid) {
      console.log('🎉 Export completed successfully!');
      console.log('💡 Next steps:');
      console.log('   1. Review exported files in data keeping/firebase-export/');
      console.log('   2. Set up MySQL database on Namecheap');
      console.log('   3. Run the MySQL import script');
    } else {
      console.error('❌ Export validation failed. Please check the errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { exportCollection, createBackupMetadata, validateExport };
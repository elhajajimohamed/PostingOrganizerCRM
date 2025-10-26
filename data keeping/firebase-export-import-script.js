// Firebase Project Migration Script
// Exports data from old Firebase project and imports to new one
// Run with: node firebase-export-import-script.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration - Update these paths and project IDs
const EXPORT_DIR = path.join(__dirname, 'firebase-export');
const OLD_SERVICE_ACCOUNT = path.join(EXPORT_DIR, 'old-service-account-key.json');
const NEW_SERVICE_ACCOUNT = path.join(EXPORT_DIR, 'new-service-account-key.json');

// Initialize both Firebase projects
let oldApp, newApp;
let oldDb, newDb;

function initializeFirebaseProjects() {
  console.log('🔧 Initializing Firebase projects...');

  // Initialize old project (source)
  const oldServiceAccount = JSON.parse(fs.readFileSync(OLD_SERVICE_ACCOUNT, 'utf8'));
  oldApp = admin.initializeApp({
    credential: admin.credential.cert(oldServiceAccount),
    projectId: oldServiceAccount.project_id
  }, 'old-project');
  oldDb = admin.firestore(oldApp);

  // Initialize new project (destination)
  const newServiceAccount = JSON.parse(fs.readFileSync(NEW_SERVICE_ACCOUNT, 'utf8'));
  newApp = admin.initializeApp({
    credential: admin.credential.cert(newServiceAccount),
    projectId: newServiceAccount.project_id
  }, 'new-project');
  newDb = admin.firestore(newApp);

  console.log('✅ Firebase projects initialized');
}

async function exportFromOldProject() {
  console.log('📤 Starting export from old Firebase project...');

  const collections = ['call-centers', 'daily-calls'];
  const exportData = {};

  for (const collectionName of collections) {
    console.log(`📄 Exporting collection: ${collectionName}`);

    const collectionRef = oldDb.collection(collectionName);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      console.log(`⚠️  Collection ${collectionName} is empty`);
      exportData[collectionName] = [];
      continue;
    }

    const documents = [];
    const batchSize = 500;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = snapshot.docs.slice(i, i + batchSize);

      for (const doc of batch) {
        const docData = {
          id: doc.id,
          ...doc.data(),
          _migratedAt: new Date().toISOString(),
          _originalProject: oldServiceAccount.project_id
        };

        // Export subcollections
        const subcollections = await exportSubcollections(doc.ref, collectionName, doc.id);
        if (subcollections.length > 0) {
          docData._subcollections = subcollections;
        }

        documents.push(docData);
      }
    }

    exportData[collectionName] = documents;
    console.log(`✅ Exported ${documents.length} documents from ${collectionName}`);
  }

  // Save export data
  const exportFile = path.join(EXPORT_DIR, 'migration-export.json');
  fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
  console.log(`💾 Export saved to: ${exportFile}`);

  return exportData;
}

async function exportSubcollections(docRef, parentCollection, parentId) {
  const subcollections = [];
  const subcollectionNames = ['contacts', 'steps', 'call-log'];

  for (const subName of subcollectionNames) {
    try {
      const subRef = docRef.collection(subName);
      const subSnapshot = await subRef.get();

      if (!subSnapshot.empty) {
        const subDocs = subSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          _parentId: parentId,
          _migratedAt: new Date().toISOString()
        }));

        subcollections.push({
          name: subName,
          parentId: parentId,
          documents: subDocs
        });

        console.log(`  📄 Exported ${subDocs.length} documents from subcollection ${subName}`);
      }
    } catch (error) {
      // Subcollection doesn't exist, continue
      continue;
    }
  }

  return subcollections;
}

async function importToNewProject(exportData) {
  console.log('📥 Starting import to new Firebase project...');

  const batchSize = 500; // Firestore batch write limit
  let totalImported = 0;

  for (const [collectionName, documents] of Object.entries(exportData)) {
    console.log(`📝 Importing collection: ${collectionName}`);

    // Import main collection documents
    const batches = [];
    let currentBatch = newDb.batch();
    let batchCount = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const docId = doc.id;
      const docData = { ...doc };

      // Remove migration metadata from document data
      delete docData.id;
      delete docData._migratedAt;
      delete docData._originalProject;
      delete docData._subcollections;

      const docRef = newDb.collection(collectionName).doc(docId);
      currentBatch.set(docRef, docData);

      batchCount++;

      // Commit batch when it reaches the limit
      if (batchCount >= batchSize || i === documents.length - 1) {
        batches.push(currentBatch.commit());
        currentBatch = newDb.batch();
        batchCount = 0;
      }
    }

    // Wait for all batches to complete
    await Promise.all(batches);
    console.log(`✅ Imported ${documents.length} documents to ${collectionName}`);

    // Import subcollections
    for (const doc of documents) {
      if (doc._subcollections) {
        for (const subcollection of doc._subcollections) {
          await importSubcollection(collectionName, doc.id, subcollection);
        }
      }
    }

    totalImported += documents.length;
  }

  console.log(`🎉 Import completed! Total documents imported: ${totalImported}`);
  return totalImported;
}

async function importSubcollection(parentCollection, parentId, subcollectionData) {
  const { name: subName, documents: subDocs } = subcollectionData;

  console.log(`  📝 Importing subcollection ${subName} for document ${parentId}`);

  const batchSize = 500;
  const batches = [];
  let currentBatch = newDb.batch();
  let batchCount = 0;

  for (let i = 0; i < subDocs.length; i++) {
    const subDoc = subDocs[i];
    const subDocId = subDoc.id;
    const subDocData = { ...subDoc };

    // Remove migration metadata
    delete subDocData.id;
    delete subDocData._parentId;
    delete subDocData._migratedAt;

    const subDocRef = newDb.collection(parentCollection).doc(parentId).collection(subName).doc(subDocId);
    currentBatch.set(subDocRef, subDocData);

    batchCount++;

    if (batchCount >= batchSize || i === subDocs.length - 1) {
      batches.push(currentBatch.commit());
      currentBatch = newDb.batch();
      batchCount = 0;
    }
  }

  await Promise.all(batches);
  console.log(`    ✅ Imported ${subDocs.length} documents to ${subName}`);
}

async function validateMigration(exportData) {
  console.log('🔍 Validating migration...');

  let validationPassed = true;
  const validationResults = {};

  for (const [collectionName, oldDocuments] of Object.entries(exportData)) {
    console.log(`🔍 Validating collection: ${collectionName}`);

    // Check main collection
    const newSnapshot = await newDb.collection(collectionName).get();
    const newCount = newSnapshot.size;

    validationResults[collectionName] = {
      oldCount: oldDocuments.length,
      newCount: newCount,
      match: oldDocuments.length === newCount
    };

    if (!validationResults[collectionName].match) {
      console.error(`❌ Count mismatch in ${collectionName}: ${oldDocuments.length} → ${newCount}`);
      validationPassed = false;
    } else {
      console.log(`✅ ${collectionName}: ${newCount} documents migrated successfully`);
    }

    // Validate subcollections
    for (const oldDoc of oldDocuments) {
      if (oldDoc._subcollections) {
        for (const subcollection of oldDoc._subcollections) {
          const subSnapshot = await newDb.collection(collectionName).doc(oldDoc.id).collection(subcollection.name).get();
          const subNewCount = subSnapshot.size;
          const subOldCount = subcollection.documents.length;

          if (subOldCount !== subNewCount) {
            console.error(`❌ Subcollection ${subcollection.name} count mismatch for doc ${oldDoc.id}: ${subOldCount} → ${subNewCount}`);
            validationPassed = false;
          } else {
            console.log(`✅ Subcollection ${subcollection.name} for doc ${oldDoc.id}: ${subNewCount} documents`);
          }
        }
      }
    }
  }

  // Save validation results
  const validationFile = path.join(EXPORT_DIR, 'migration-validation.json');
  fs.writeFileSync(validationFile, JSON.stringify({
    validationPassed,
    results: validationResults,
    timestamp: new Date().toISOString()
  }, null, 2));

  return validationPassed;
}

async function cleanup() {
  console.log('🧹 Cleaning up Firebase connections...');
  await oldApp.delete();
  await newApp.delete();
  console.log('✅ Cleanup completed');
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Firebase project migration...');
    console.log('📂 Export directory:', EXPORT_DIR);

    // Check if service account files exist
    if (!fs.existsSync(OLD_SERVICE_ACCOUNT)) {
      throw new Error(`Old service account file not found: ${OLD_SERVICE_ACCOUNT}`);
    }
    if (!fs.existsSync(NEW_SERVICE_ACCOUNT)) {
      throw new Error(`New service account file not found: ${NEW_SERVICE_ACCOUNT}`);
    }

    // Initialize Firebase projects
    initializeFirebaseProjects();

    // Export from old project
    const exportData = await exportFromOldProject();

    // Import to new project
    const importedCount = await importToNewProject(exportData);

    // Validate migration
    const isValid = await validateMigration(exportData);

    // Cleanup
    await cleanup();

    if (isValid) {
      console.log('🎉 Migration completed successfully!');
      console.log(`📊 Total documents migrated: ${importedCount}`);
      console.log('💡 Next steps:');
      console.log('   1. Update your .env.local with new Firebase config');
      console.log('   2. Test your application with the new project');
      console.log('   3. Update any hardcoded Firebase references');
    } else {
      console.error('❌ Migration validation failed. Please check the errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  initializeFirebaseProjects,
  exportFromOldProject,
  importToNewProject,
  validateMigration
};
# Firebase Export Directory

## Overview
This directory will contain exported data from Firebase Firestore during the migration process.

## Files to be created:
- `call-centers.json` - Main call centers collection
- `daily-calls.json` - Daily calls collection
- `export-metadata.json` - Export information and statistics
- `service-account-key.json` - Firebase service account credentials (you need to add this)

## Setup Instructions

### 1. Get Firebase Service Account Key
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Rename it to `service-account-key.json` and place it in this directory

### 2. Configure Environment Variables
Create a `.env` file in this directory with:
```
FIREBASE_PROJECT_ID=your-project-id
```

### 3. Install Dependencies
```bash
npm install firebase-admin
```

### 4. Run Export
```bash
node ../firebase-export-script.js
```

## Expected Output
After successful export, you should see:
- JSON files for each collection
- Metadata file with export statistics
- Validation confirmation

## Data Structure
The exported data will include:
- Document IDs
- All document fields
- Subcollections (contacts, steps, call-log)
- Export timestamps
- Parent-child relationships

## Next Steps
After export completes successfully:
1. Review the exported data
2. Set up MySQL database on Namecheap
3. Run the MySQL import script
4. Test the migrated application
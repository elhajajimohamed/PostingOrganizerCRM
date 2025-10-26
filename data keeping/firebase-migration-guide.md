# Firebase Account Migration Guide - Option B

## Overview
This guide walks you through creating a new Firebase project with a new Google account and migrating all your CRM data.

## Prerequisites
- Access to old Firebase project (current account)
- Access to new Google account
- Node.js installed
- Your "data keeping" folder with backup scripts

## Step-by-Step Migration Process

### Step 1: Create New Firebase Project
```
Time: 10-15 minutes
```

1. **Sign in to new Google account**
   - Open https://console.firebase.google.com/
   - Sign out of current account if needed
   - Sign in with new Google account

2. **Create new Firebase project**
   - Click "Create a project" or "Add project"
   - Project name: `posting-organizer-crm-new` (or your preferred name)
   - Choose whether to enable Google Analytics (recommended: Yes)
   - Select Google Analytics account or create new one
   - Wait for project creation to complete

3. **Enable Firestore Database**
   - In Firebase Console, go to "Firestore Database"
   - Click "Create database"
   - Choose "Start in test mode" (you can change security rules later)
   - Select a location (choose same region as your users)

4. **Generate Service Account Key**
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - **IMPORTANT**: Save this file as `data keeping/firebase-export/new-service-account-key.json`

### Step 2: Prepare Migration Environment
```
Time: 5 minutes
```

1. **Navigate to data keeping folder**
   ```bash
   cd "data keeping"
   ```

2. **Install Firebase Admin SDK**
   ```bash
   npm install firebase-admin
   ```

3. **Get old service account key**
   - Go to your OLD Firebase project console
   - Project Settings → Service Accounts
   - Generate new private key (or use existing one)
   - Save as `data keeping/firebase-export/old-service-account-key.json`

4. **Verify files are in place**
   ```
   data keeping/firebase-export/
   ├── old-service-account-key.json  ← From old project
   ├── new-service-account-key.json  ← From new project
   ├── service-account-template.json
   └── README.md
   ```

### Step 3: Run Data Migration
```
Time: 15-30 minutes (depending on data size)
```

1. **Execute migration script**
   ```bash
   node firebase-export-import-script.js
   ```

2. **Monitor the process**
   - Script will show progress for each collection
   - Exports from old project → Saves to JSON → Imports to new project
   - Validates data integrity after migration

3. **Expected output**
   ```
   🚀 Starting Firebase project migration...
   🔧 Initializing Firebase projects...
   📤 Starting export from old Firebase project...
   📄 Exporting collection: call-centers
   📄 Exporting collection: daily-calls
   📥 Starting import to new Firebase project...
   🔍 Validating migration...
   🎉 Migration completed successfully!
   ```

### Step 4: Update Application Configuration
```
Time: 10 minutes
```

1. **Get new Firebase config**
   - In new Firebase Console, go to Project Settings → General
   - Scroll to "Your apps" section
   - Click "Add app" → Web app (</>) icon
   - Register app with name "Posting Organizer CRM"
   - Copy the config object

2. **Update environment variables**
   - Open `.env.local` in your project root
   - Replace all Firebase values with new project config:

   ```bash
   # Old values (keep as backup)
   # NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCxRsH_BBl51lxbc8CZ9RGIqwdslTfXlqA
   # NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=posting-organizer-crm-52415.firebaseapp.com
   # NEXT_PUBLIC_FIREBASE_PROJECT_ID=posting-organizer-crm-52415
   # NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=posting-organizer-crm-52415.firebasestorage.app
   # NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=260682804885
   # NEXT_PUBLIC_FIREBASE_APP_ID=1:260682804885:web:49fb4b5c47c5f3f9c8b59c

   # New values from new project
   NEXT_PUBLIC_FIREBASE_API_KEY=your-new-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-new-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-new-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-new-project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-new-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-new-app-id
   ```

3. **Update Google Places API Key** (if needed)
   - If switching Google Cloud accounts, get new API key
   - Update `GOOGLE_PLACES_API_KEY` in `.env.local`

### Step 5: Test Migration
```
Time: 10 minutes
```

1. **Restart development server**
   ```bash
   npm run dev
   ```

2. **Test application functionality**
   - Open http://localhost:3000
   - Check if data loads correctly
   - Test adding new call centers
   - Verify dashboard shows correct statistics

3. **Verify data integrity**
   - Compare record counts between old and new projects
   - Check that all collections migrated: call-centers, daily-calls, contacts, steps, etc.

### Step 6: Update Security Rules
```
Time: 5 minutes
```

1. **Update Firestore Security Rules**
   - In new Firebase Console, go to Firestore Database → Rules
   - Copy rules from your backup: `data keeping/firestore.rules`
   - Or set appropriate security rules for your use case

2. **Update Storage Rules** (if using Firebase Storage)
   - Go to Storage → Rules
   - Apply rules from `data keeping/storage.rules`

### Step 7: Clean Up (Optional)
```
Time: After confirming everything works
```

1. **Keep old project as backup** (recommended for 30 days)
2. **Or delete old project** if confident migration succeeded
3. **Update any documentation** with new project details

## Troubleshooting

### Migration Script Fails
- Check service account files are correctly named and placed
- Verify Firebase Admin SDK is installed: `npm list firebase-admin`
- Ensure both projects have Firestore enabled

### App Doesn't Load Data
- Check `.env.local` has correct new project config
- Verify API keys are not expired
- Check browser console for Firebase errors

### Data Missing After Migration
- Check migration validation output
- Compare document counts between projects
- Run migration script again if needed

## Rollback Plan
If something goes wrong:
1. Revert `.env.local` to old Firebase config
2. Old project remains intact as backup
3. Contact support if needed

## Success Checklist
- [ ] New Firebase project created
- [ ] Service account keys generated and saved
- [ ] Migration script completed successfully
- [ ] Environment variables updated
- [ ] Application loads and functions correctly
- [ ] Data integrity verified
- [ ] Security rules applied
- [ ] Old project backed up or cleaned up

## Time Estimate
- **Total time**: 1-2 hours
- **Downtime**: Minimal (only during config update)
- **Risk level**: Low (old project remains as backup)

## Support
If you encounter issues, check:
1. Firebase Console for project status
2. Browser developer tools for errors
3. Migration script output for specific error messages
4. This guide's troubleshooting section
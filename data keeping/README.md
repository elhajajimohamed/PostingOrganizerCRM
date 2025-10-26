# Data Keeping Folder - CRM Database Preservation

## Overview
This folder contains all critical data and configuration files necessary to preserve and restore the CRM database during migration from Firebase Firestore to Namecheap Shared Hosting MySQL.

## Contents

### JSON Data Files
- `abidjan-call-centers-complete-list.json` - Complete call centers data for Abidjan
- `morocco-call-centers-complete-list.json` - Complete call centers data for Morocco
- `tunis-call-centers-complete-list.json` - Complete call centers data for Tunis
- `Big database filtred no duplicated.json` - Large filtered database without duplicates
- `cleaned-database.json` - Cleaned and processed database
- `processed-big-database.json` - Processed large database
- `import-ready-data.json` - Data ready for import operations

### Configuration Files
- `.env.local` - Environment variables and API keys
- `firebase.json` - Firebase project configuration
- `firestore.rules` - Firestore security rules
- `storage.rules` - Firebase Storage security rules
- `package.json` - Node.js dependencies and scripts
- `tsconfig.json` - TypeScript configuration

### Database Scripts
- `database-cleaning-script.js` - Script for cleaning database data
- `clean-json-database.js` - JSON database cleaning utilities
- `import-cleaned-data.js` - Data import script
- `import-script.js` - General import utilities
- `process-big-database.js` - Large database processing script
- `test-processed-data.js` - Data validation script
- `check-import.js` - Import verification script

## Migration Strategy

### Phase 1: Data Preservation (Current)
- ✅ All JSON data files backed up
- ✅ All configuration files preserved
- ✅ All database scripts archived
- ✅ Firebase configuration saved

### Phase 2: Firebase Export (Next)
- Export all Firestore collections to JSON
- Validate data integrity
- Create multiple backup copies

### Phase 3: MySQL Migration
- Set up MySQL database on Namecheap
- Create schema matching Firestore structure
- Import data with validation
- Test application functionality

### Phase 4: Rollback Plan
- Keep Firebase active during migration
- Maintain backup copies
- Test rollback procedures

## Important Notes

1. **Do not modify files in this folder** - They represent the current state of your data
2. **Keep multiple copies** - Store backups in cloud storage and external drives
3. **Test migration on staging first** - Never migrate production data without testing
4. **Document all changes** - Keep records of any data transformations
5. **Validate data integrity** - Count records before and after each migration step

## Firebase Collections to Export
Based on the application code, the following collections need to be exported:
- `call-centers` (main collection)
- `contacts` (subcollection under call-centers)
- `steps` (subcollection under call-centers)
- `daily-calls` (collection)
- `call-log` (subcollection under daily-calls)
- Any other collections used by the application

## Contact Information
If you need to restore from this backup, ensure you have:
- Firebase project access
- Namecheap hosting credentials
- Application source code
- This backup folder

## Backup Date
Created: October 26, 2025
Total records in database: 3,297 call centers
Status: Ready for migration
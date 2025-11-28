# Facebook Groups Import Feature Guide

## Overview
This feature allows you to import Facebook groups from a JSON file and attach them to a specific Facebook account in your Groups Posting CRM system.

## Features
- ✅ Import groups from JSON file
- ✅ Attach imported groups to a specific Facebook account
- ✅ Preview groups before importing
- ✅ Real-time import results with success/error reporting
- ✅ Duplicate detection and handling
- ✅ Account browser information display
- ✅ Comprehensive error handling

## How to Use

### 1. Access the Import Feature
1. Navigate to **Groups Posting** page
2. Click on the **📥 Import Groups** tab

### 2. Prepare Your JSON File
Create a JSON file with one of the following formats:

#### Format 1: Direct Array
```json
[
  {
    "name": "Marketing Professionals Morocco",
    "url": "https://facebook.com/groups/marketing-morocco",
    "memberCount": 2500,
    "language": "French",
    "description": "Marketing professionals and discussions"
  },
  {
    "name": "Business Network Casablanca",
    "url": "https://facebook.com/groups/business-casa",
    "memberCount": 1500,
    "language": "French"
  }
]
```

#### Format 2: Object with Groups Property
```json
{
  "groups": [
    {
      "name": "Digital Marketing Tunisia",
      "url": "https://facebook.com/groups/digital-tunisia",
      "memberCount": 3200,
      "language": "French"
    }
  ]
}
```

### 3. Required Fields
- **name**: Group name (required)
- **url**: Facebook group URL (optional but recommended)
- **memberCount**: Number of members (optional)
- **language**: Group language (optional)
- **description**: Group description (optional)

### 4. Import Process

#### Step 1: Upload JSON File
1. Click **"Choose File"** button
2. Select your JSON file
3. The system will validate the file format

#### Step 2: Preview Groups
After successful file upload:
1. Select a **target Facebook account** from the dropdown
2. Review the groups list (shows first 10, with count of remaining)
3. Check the account details to ensure correct assignment

#### Step 3: Import Groups
1. Click **"Import Groups"** button
2. Wait for the import process to complete
3. View the results summary

### 5. Import Results
The system provides detailed import results:
- ✅ **Successfully Imported**: Number of groups added
- ❌ **Failed**: Number of groups that failed to import
- 📊 **Total Processed**: Total groups processed
- 📝 **Errors**: Detailed error messages for failed imports

### 6. Post-Import Actions
After successful import:
- Click **"Refresh Groups List"** to update the Groups database view
- Use **"Import More Groups"** to import additional groups
- Groups are automatically attached to the selected account

## API Endpoint
- **URL**: `POST /api/groups/import`
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "groups": [
    {
      "name": "Group Name",
      "url": "https://facebook.com/groups/...",
      "memberCount": 1000,
      "language": "English"
    }
  ],
  "targetAccountId": "account-id-here"
}
```

## Account Browser Display
The import interface shows detailed account information including:
- Account name
- Browser assignment
- Account status
- Account ID
- This helps you verify the correct account assignment

## Error Handling
- **File Format Errors**: Invalid JSON structure
- **Missing Fields**: Required fields validation
- **Duplicate Groups**: Automatic duplicate detection
- **Account Assignment**: Validates account exists
- **Firebase Errors**: Database operation failures

## Best Practices
1. **Validate JSON Format**: Ensure your file is valid JSON
2. **Check Account Selection**: Verify the correct target account
3. **Review Preview**: Always preview groups before importing
4. **Batch Size**: Keep imports manageable (recommended under 100 groups)
5. **Duplicate Prevention**: Check existing groups to avoid duplicates

## Troubleshooting

### Common Issues
1. **"Invalid JSON format"**: Ensure your file is valid JSON
2. **"No groups to import"**: Check file structure and content
3. **"Select target account"**: Choose a Facebook account before importing
4. **Import fails**: Check Firebase permissions and account validity

### Debug Information
- Import errors are displayed in real-time
- Check browser console for detailed error messages
- Verify Firebase connection and permissions

## File Locations
- Test sample file: `test-groups-import.json`
- API route: `src/app/api/groups/import/route.ts`
- Frontend component: `src/app/groups-posting/page.tsx`

## Support
For technical issues or questions:
1. Check the browser console for error messages
2. Verify Firebase connection and permissions
3. Test with the sample JSON file provided
4. Check that Facebook accounts exist in the system
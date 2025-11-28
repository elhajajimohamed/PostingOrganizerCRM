# Prospects Import Structure Guide

## Overview
This document provides a comprehensive guide for importing prospects into the CRM prospection section. The import data should be structured as a JSON array containing prospect objects.

## Basic Structure

```json
[
  {
    "name": "Company or Individual Name",
    "country": "Country Name",
    "city": "City Name",
    "positions": 0,
    "businessType": "call-center",
    "phones": [],
    "emails": [],
    "website": "",
    "address": "",
    "source": "",
    "tags": [],
    "notes": "",
    "status": "pending",
    "priority": "medium",
    "contactAttempts": 0
  }
]
```

## Field Specifications

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | string | Company or individual name | "Call Center Solutions Morocco" |
| `country` | string | Country where the prospect is located | "Morocco" |
| `city` | string | City where the prospect is located | "Casablanca" |
| `businessType` | string | Type of business | "call-center", "voip-reseller", "data-vendor", "workspace-rental", "individual" |

### Optional Core Fields

| Field | Type | Description | Default | Example |
|-------|------|-------------|---------|---------|
| `positions` | number | Number of available positions | 0 | 15 |
| `phones` | array[string] | List of phone numbers | [] | ["+212522123456", "0666123456"] |
| `emails` | array[string] | List of email addresses | [] | ["contact@company.ma"] |
| `website` | string | Company website URL | "" | "https://company.ma" |
| `address` | string | Physical address | "" | "123 Business District, Casablanca" |
| `source` | string | Source of the prospect | "" | "linkedin", "website", "referral" |
| `tags` | array[string] | Tags for categorization | [] | ["linkedin", "b2b", "high-potential"] |
| `notes` | string | Additional notes about the prospect | "" | "Large established call center..." |
| `status` | string | Current status of the prospect | "pending" | "active", "contacted", "qualified", "not_interested", "invalid", "archived" |
| `priority` | string | Priority level | "medium" | "low", "medium", "high" |
| `contactAttempts` | number | Number of contact attempts | 0 | 3 |

### Advanced Fields

| Field | Type | Description | Default | Example |
|-------|------|-------------|---------|---------|
| `destinations` | array[string] | Target calling destinations | [] | ["USA", "France", "Spain"] |
| `contacts` | array[Contact] | Additional contacts | [] | [See Contact Structure] |
| `steps` | array[Step] | Follow-up steps | [] | [See Step Structure] |
| `callHistory` | array[CallLog] | Previous call logs | [] | [See CallLog Structure] |
| `lastContacted` | string | ISO date string | undefined | "2025-11-19T14:30:00Z" |
| `prospectDate` | string | ISO date string | Auto-generated | "2025-11-19" |
| `addedDate` | string | ISO date string | Auto-generated | "2025-11-19" |

### DNC/DND/DP Fields

| Field | Type | Description | Default | Example |
|-------|------|-------------|---------|---------|
| `dnc` | boolean | Do Not Call flag | false | true |
| `dnd` | boolean | Do Not Disturb flag | false | false |
| `dp` | boolean | Do NotProspect flag | false | false |
| `dncDescription` | string | Reason for DNC | "" | "Number disconnected" |
| `dndDescription` | string | Reason for DND | "" | "Requested no calls" |
| `dpDescription` | string | Reason for DP | "" | "Competitor" |

## Supporting Structures

### Contact Structure
```json
{
  "id": "unique_contact_id",
  "name": "Contact Name",
  "position": "Job Title",
  "phone": "Phone Number",
  "email": "Email Address",
  "notes": "Contact Notes"
}
```

### Step Structure
```json
{
  "id": "unique_step_id",
  "title": "Step Title",
  "description": "Step Description",
  "date": "2025-11-20T10:00:00Z",
  "completed": false,
  "priority": "high"
}
```

### CallLog Structure
```json
{
  "id": "unique_call_id",
  "date": "2025-11-19T14:30:00Z",
  "duration": 15,
  "outcome": "Call Outcome",
  "notes": "Call Notes",
  "followUp": "Follow-up Instructions",
  "disposition": "callback",
  "phone_used": "+212522123456",
  "phone_index": 0,
  "attempts_count": 2
}
```

### Disposition Values
- `interested` - Prospect showed interest
- `callback` - Call back later
- `no_answer` - No answer received
- `not_interested` - Prospect not interested
- `invalid_number` - Number is invalid
- `dnc` - Do not call
- `manual_override` - Manual override by agent

## Business Type Options

1. **call-center** - Call center companies
2. **voip-reseller** - VoIP service resellers
3. **data-vendor** - Data providers
4. **workspace-rental** - Office/workspace rental companies
5. **individual** - Individual entrepreneurs/freelancers

## Status Options

1. **pending** - Newly added, awaiting first contact
2. **contacted** - Initial contact made
3. **qualified** - Prospect meets criteria
4. **not_interested** - Prospect declined
5. **invalid** - Invalid contact information
6. **active** - Currently being pursued
7. **added_to_crm** - Added to main CRM
8. **archived** - Archived prospect

## Priority Options

1. **low** - Low priority prospect
2. **medium** - Medium priority prospect
3. **high** - High priority prospect

## Destination Options

Common calling destinations:
- USA
- Canada
- France
- Spain
- Switzerland
- Italy
- Germany
- UK
- Belgium

## Import Examples

### Simple Call Center Prospect
```json
{
  "name": "Casablanca Call Center",
  "country": "Morocco",
  "city": "Casablanca",
  "positions": 10,
  "businessType": "call-center",
  "phones": ["+212522123456"],
  "emails": ["info@casabellacenter.ma"],
  "source": "linkedin",
  "tags": ["linkedin"],
  "notes": "Looking for outbound calling solutions",
  "status": "pending",
  "priority": "medium"
}
```

### Complex Prospect with Contacts and History
```json
{
  "name": "Enterprise Solutions Ltd",
  "country": "Morocco",
  "city": "Casablanca",
  "positions": 25,
  "businessType": "call-center",
  "phones": ["+212522123456", "+212522123457"],
  "emails": ["contact@enterprise.ma", "sales@enterprise.ma"],
  "website": "https://enterprise.ma",
  "address": "Business District, Casablanca",
  "source": "referral",
  "tags": ["referral", "enterprise", "high-value"],
  "notes": "Large enterprise client, high revenue potential",
  "status": "active",
  "priority": "high",
  "contactAttempts": 3,
  "destinations": ["USA", "France", "Spain"],
  "contacts": [
    {
      "id": "contact_001",
      "name": "Ahmed Benali",
      "position": "Operations Manager",
      "phone": "+212522123456",
      "email": "ahmed@enterprise.ma",
      "notes": "Key decision maker"
    }
  ],
  "steps": [
    {
      "id": "step_001",
      "title": "Initial Demo",
      "description": "Schedule product demonstration",
      "date": "2025-11-20T10:00:00Z",
      "completed": false,
      "priority": "high"
    }
  ],
  "callHistory": [
    {
      "id": "call_001",
      "date": "2025-11-19T14:30:00Z",
      "duration": 25,
      "outcome": "Interested",
      "notes": "Very interested, wants to see demo",
      "followUp": "Schedule demo for next week",
      "disposition": "callback",
      "phone_used": "+212522123456",
      "attempts_count": 2
    }
  ],
  "lastContacted": "2025-11-19T14:30:00Z",
  "dnc": false,
  "dnd": false,
  "dp": false
}
```

## Best Practices

### 1. Data Quality
- Use consistent country and city names
- Ensure phone numbers include country codes for international numbers
- Validate email addresses
- Use meaningful tags for easy filtering

### 2. Contact Information
- Include primary contact person with name, position, and direct contact
- Add multiple contact methods when available
- Include relevant notes about decision makers

### 3. Status Management
- Start with "pending" status for new prospects
- Update status based on interaction outcomes
- Use "active" for prospects currently being pursued
- Mark invalid prospects with appropriate status

### 4. Priority Setting
- Set "high" priority for enterprise clients or large opportunities
- Use "medium" for standard prospects
- Reserve "low" for small or low-value prospects

### 5. Tagging Strategy
- Use source tags (e.g., "linkedin", "website", "referral")
- Add capability tags (e.g., "b2b", "technical", "enterprise")
- Use potential tags (e.g., "high-potential", "renewable-energy")

### 6. Phone Number Formatting
- Include country codes for international numbers
- Use E.164 format when possible: +[country][number]
- Include both international and local formats if available
- Add alternative numbers for redundancy

## Validation Rules

1. **Name**: Required, maximum 255 characters
2. **Country**: Required, must be a valid country name
3. **City**: Required, maximum 100 characters
4. **BusinessType**: Must be one of the allowed values
5. **Phones**: Array of strings, each maximum 20 characters
6. **Emails**: Array of strings, each must be valid email format
7. **Status**: Must be one of the allowed values
8. **Priority**: Must be "low", "medium", or "high"
9. **ContactAttempts**: Must be a non-negative integer
10. **Positions**: Must be a non-negative integer

## Import Process

1. Prepare your data in the JSON format shown above
2. Validate the structure and field values
3. Use the import API endpoint: `/api/prospection/linkedin` (for LinkedIn-sourced data) or the general import function
4. Monitor the import results for any errors
5. Review imported prospects in the CRM interface

## Error Handling

Common import errors:
- Invalid email format in emails array
- Invalid phone number format
- Missing required fields (name, country, city)
- Invalid status or priority values
- Business type not in allowed options

Each error will be logged and the import process will continue with valid records.
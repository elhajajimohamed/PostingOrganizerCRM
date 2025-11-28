# Price Simulator Enhancements

## Overview
The price simulator has been enhanced with comprehensive pricing data and additional services to provide a complete cost estimation for VOIP services across multiple markets.

## New Features Added

### 1. Market Coverage
- **Added United Kingdom (UK)** with specific pricing:
  - Fixed: 0.012€/min
  - Mobile: 0.040€/min
  - Display numbers: 5€ (>50 positions = 4€)

### 2. Enhanced Market Pricing
All markets now have more detailed tiered pricing based on the provided data:

#### France
- Maintained existing volume-based pricing tiers
- Added mobile display pricing (0.019€/min for volume, 0.021€/min standard)
- Gray line pricing preserved

#### Belgium
- <10 positions: 0.024€/min (fixed), 0.028€/min (mobile)
- 10-25 positions: 0.020€/min (fixed), 0.025€/min (mobile)
- 15 positions: 0.022€/min (fixed), 0.026€/min (mobile)
- Added mobile display: 0.022€/min

#### Spain
- Tiered pricing based on positions:
  - ≤10 positions: 0.0085€/min (fixed), 0.028€/min (mobile)
  - 11-25 positions: 0.0075€/min (fixed), 0.026€/min (mobile)
  - 26-50 positions: 0.006€/min (fixed), 0.026€/min (mobile)
  - 51-200 positions: 0.005€/min (fixed), 0.025€/min (mobile)
  - 200+ positions: 0.0045€/min (fixed), 0.024€/min (mobile)
- Added mobile display: 0.030€/min

#### Canada
- Tiered pricing based on positions:
  - ≤20 positions: 0.0090€/min
  - 21-40 positions: 0.0085€/min
  - 41-50 positions: 0.0080€/min
  - 51+ positions: 0.0075€/min
- Added mobile display: 0.090€/min

#### Switzerland
- <10 positions: 0.07€/min (fixed), 0.30€/min (mobile)
- 10-20 positions: 0.065€/min (fixed), 0.28€/min (mobile)
- 20-30 positions: 0.060€/min (fixed), 0.25€/min (mobile)
- 30+ positions: 0.055€/min (fixed), 0.22€/min (mobile)

#### Italy
- 10 positions: 0.015€/min (fixed), 0.025€/min (mobile)
- Other positions: 0.011€/min (fixed), 0.028€/min (mobile)

### 3. Additional Services

#### Boxiel CRM Pricing
- 1-10 positions: 9.9€/month
- 11-20 positions: 8.4€/month
- 21-30 positions: 7.4€/month
- 31-50 positions: 6.9€/month
- 50+ positions: 5.9€/month

#### NPV Numbers Pricing
- 1-10 numbers: 5.0€
- 11-20 numbers: 4.5€
- 21-30 numbers: 4.0€
- 31-50 numbers: 3.5€
- 51-100 numbers: 3.0€
- 101-150 numbers: 2.5€
- 151-200 numbers: 2.0€
- 201-300 numbers: 1.5€
- 300+ numbers: 1.0€

#### Mobile Display Pricing
- France: 0.019€/min (volume pricing), 0.021€/min (standard)
- Belgium: 0.022€/min
- Spain: 0.030€/min
- Canada: 0.090€/min

### 4. UI Enhancements

#### New Result Sections
- **Additional Services Section**: Shows CRM, NPV, and Mobile Display costs
- **Color-coded badges**: Different colors for each service type
- **Comprehensive pricing tables**: Complete pricing information for all services

#### Market Information
- Enhanced market cards with specific pricing details
- Added UK to the market selection
- Detailed pricing tables for all additional services

### 5. Calculation Improvements

#### Real-time Calculations
- CRM costs calculated per position and multiplied by total positions
- NPV costs based on position tiers
- Mobile display costs calculated monthly based on estimated usage

#### Enhanced Validation
- Maintains existing form validation
- Handles new pricing tiers automatically
- Graceful handling of different market requirements

## Data Integration

All pricing data has been extracted and integrated from the provided CSV structure:

1. **Original market data**: Preserved and enhanced with additional tiers
2. **NPV pricing**: Implemented as a separate pricing tier system
3. **CRM pricing**: Added as position-based monthly subscription
4. **Mobile display**: Integrated per destination with specific rates

## Usage

Users can now:
1. Select from 8 markets including the newly added UK
2. Enter position count (required)
3. Optionally specify mobile/fixed percentages (defaults to 50/50 if not provided)
4. View comprehensive pricing including:
   - VOIP rates (fixed, mobile, blended)
   - CRM monthly costs
   - NPV number setup costs
   - Mobile display monthly costs
5. Get total cost estimates for complete service planning

### Optional Fields
- **% Mobile & % Fixed**: These fields are optional. If not specified, the calculator defaults to a 50/50 split
- The fields include helpful placeholder text and validation messages
- A blue tip box explains the default behavior

## Technical Notes

- All calculations maintain the existing 4800 minutes/month assumption
- New pricing tiers automatically apply based on position counts
- Mobile display availability varies by market
- All prices are displayed in Euros with appropriate precision
- Form validation ensures data integrity across all new features

This enhancement provides a comprehensive pricing tool that covers all aspects of VOIP service deployment across European and North American markets.
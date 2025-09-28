# Sport Facility Day/Night Rates Setup Guide

This guide explains how to set up day and night rates for sport facilities in the system.

## Overview

Sport facilities (like futsal courts, badminton courts) now support different pricing for:
- **Day Rate**: 8:00 AM - 7:00 PM  
- **Night Rate**: 8:00 PM - 12:00 AM (midnight)

## Setting Up Day/Night Rates in Strapi

### 1. Access Facility in Strapi Admin

1. Log into your Strapi admin panel
2. Navigate to **Content Manager** > **Facilities**
3. Select or create a sport facility
4. Ensure the **Type** field is set to `SPORT`

### 2. Configure Rates JSON

In the **Rates** field (JSON), use this structure:

```json
{
  "dayRate": 50,
  "nightRate": 70,
  "hourlyRate": 50,
  "halfDayRate": 250,
  "fullDayRate": 400
}
```

**Field Explanations:**
- `dayRate`: Price per hour for 8:00 AM - 7:00 PM (RM50 in example)
- `nightRate`: Price per hour for 8:00 PM - 12:00 AM (RM70 in example)  
- `hourlyRate`, `halfDayRate`, `fullDayRate`: Fallback compatibility rates

### 3. Example Configurations

#### Futsal Court Example:
```json
{
  "dayRate": 50,
  "nightRate": 70
}
```

#### Badminton Court Example:
```json
{
  "dayRate": 30,
  "nightRate": 45,
  "hourlyRate": 30
}
```

## How It Works

### Automatic Detection
- The system automatically detects if a sport facility has `dayRate` and `nightRate` configured
- If both are present, it uses day/night pricing logic
- If not present, it falls back to regular hourly rates

### Price Calculation Examples

#### Example 1: 2 Hours Day Booking (10:00 AM - 12:00 PM)
- Day hours: 2 hours @ RM50 = RM100
- Night hours: 0 hours @ RM70 = RM0  
- **Total: RM100**

#### Example 2: 3 Hours Night Booking (9:00 PM - 12:00 AM)
- Day hours: 0 hours @ RM50 = RM0
- Night hours: 3 hours @ RM70 = RM210
- **Total: RM210**

#### Example 3: Mixed Day/Night Booking (6:00 PM - 10:00 PM)
- Day hours: 1 hour @ RM50 = RM50 (6:00-7:00 PM)
- Night hours: 2 hours @ RM70 = RM140 (8:00-10:00 PM)
- **Total: RM190**

### Operating Hours
- **Day Rate Period**: 8:00 AM - 7:00 PM
- **Gap Period**: 7:00 PM - 8:00 PM (not bookable)
- **Night Rate Period**: 8:00 PM - 12:00 AM
- **Minimum Booking**: 2 hours

## User Experience

### Facility Detail Page
- Shows day and night rates clearly
- Displays operating hours for each rate period
- Includes helpful notes about minimum booking

### Sport Booking Page  
- Displays rate information prominently
- Shows real-time price calculation
- Provides detailed price breakdown in booking summary

### Booking Summary Example
```
Pecahan Harga: 2 jam (hari) @ RM50 + 1 jam (malam) @ RM70
Jumlah Harga: RM170
```

## Troubleshooting

### Rates Not Showing
1. Verify facility type is set to `SPORT`
2. Check that both `dayRate` and `nightRate` are present in rates JSON
3. Ensure rates are valid numbers

### Fallback Behavior
- If day/night rates are not configured, system uses regular hourly rates
- If no hourly rate, uses halfDay/fullDay rates as fallback

## Technical Implementation

The day/night rate feature is implemented using:
- `SportPricingLogic` class for calculations
- Enhanced facility interfaces to support new rate fields
- Backward compatibility with existing rate structure
- No database schema changes required (uses existing JSON field)

## Testing

To test the day/night rate functionality:
1. Create a sport facility with day/night rates configured
2. Access the facility through `/fasiliti/{id}` 
3. Click "Tempah Sekarang" to go to sport booking page
4. Select different time slots and verify pricing calculations
5. Complete a booking to ensure backend processing works correctly




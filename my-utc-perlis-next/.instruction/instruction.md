# UTC Perlis Website Development Progress

## Latest Implementation Updates (29 December 2024)

### 1. Form Field Standardization
- Renamed form fields to follow consistent English naming convention:
  - `nama` → `applicantName`
  - `jabatan` → `department`
  - `alamat` → `address`
  - `noTelefon` → `phoneNumber`
  - `tujuanKegunaan` → `purpose`
  - `namaAcara` → `eventName`
  - `tarikhMula` → `startDate`
  - `tarikhHingga` → `endDate`
  - `masaMula` → `startTime`
  - `masaHingga` → `endTime`
  - `bilanganKehadiran` → `attendance`

### 2. Form Structure Improvements
- Reorganized form structure for better maintainability:
  ```typescript
  rental: {
    duration: '1/2_HARI' | '1_HARI' | 'LEBIH_DARI_SEHARI' | 'PER_JAM';
    additionalEquipment: {
      laptop: boolean;
      webCam: boolean;
      [key: string]: boolean;
    }
  }
  food: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    supper: boolean;
    mineralWater: number;
  }
  ```

### 3. API Integration
- Added environment variables for Strapi integration:
  - `NEXT_PUBLIC_STRAPI_API_URL`
  - `STRAPI_API_TOKEN`
- Prepared booking submission endpoint structure at `/api/bookings`

### 4. Form Submission Enhancement
- Added submission status handling:
  - Success message with redirect
  - Error message display
  - Loading state during submission
- Improved validation messaging
- Added facility capacity validation

### 5. Navigation Updates
- Updated service route from `/servis` to `/services` for consistency
- Updated navigation links accordingly

### 6. Facility Display Improvements
- Updated FacilityCard to show relevant information:
  - Facility name
  - Location
  - Capacity
  - Hourly rate
  - Document ID for routing

## Current Issues and TODOs

### 1. API Implementation
- [ ] Complete `/api/bookings` route implementation
- [ ] Add proper error handling for API responses
- [ ] Implement rate limiting
- [ ] Add request validation

### 2. Form Validation
- [ ] Add proper validation for phone numbers
- [ ] Implement date range validation for "Lebih Dari Sehari" bookings
- [ ] Add validation for overlapping bookings

### 3. User Experience
- [ ] Add loading states for facility data fetching
- [ ] Implement proper form reset after submission
- [ ] Add confirmation modal before form submission
- [ ] Improve error message display

### 4. Security
- [ ] Implement CSRF protection
- [ ] Add rate limiting for form submissions
- [ ] Sanitize user inputs
- [ ] Implement proper API authentication

### 5. Testing
- [ ] Add unit tests for form validation
- [ ] Add integration tests for API endpoints
- [ ] Add E2E tests for booking flow

### 6. Documentation
- [ ] Add API documentation
- [ ] Document form validation rules
- [ ] Add setup instructions for new developers

## Known Issues

1. **Time Selection Logic**
   - Time validation for cross-day bookings needs improvement
   - End time calculation for "Separuh Hari" might need adjustment for edge cases

2. **Price Calculation**
   - Additional day calculations might need refinement
   - Equipment pricing for multi-day bookings needs clarification

3. **Form State**
   - Form reset after submission needs proper implementation
   - Need to handle unsaved changes warning

4. **Data Fetching**
   - Error handling for failed API requests needs improvement
   - Loading states need to be more user-friendly

## Next Steps

1. Implement the booking API endpoint
2. Add proper form submission handling
3. Implement booking confirmation system
4. Add email notification system
5. Create admin interface for booking management

## Notes for Developers

- Always use TypeScript interfaces for form data
- Follow the established naming conventions
- Implement proper error handling
- Add comments for complex business logic
- Keep the UI consistent with the design system
- Test edge cases thoroughly

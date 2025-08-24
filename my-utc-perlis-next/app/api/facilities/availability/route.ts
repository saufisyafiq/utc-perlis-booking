import { NextRequest, NextResponse } from 'next/server';

interface Booking {
  id: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  bookingStatus: string;
}

interface AvailabilityResponse {
  dates: {
    [date: string]: {
      available: boolean;
      partiallyAvailable: boolean;
      bookedTimeSlots: Array<{
        startTime: string;
        endTime: string;
      }>;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const facilityId = searchParams.get('facilityId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    
    if (!facilityId) {
      return NextResponse.json(
        { error: 'Missing facilityId parameter' },
        { status: 400 }
      );
    }
    
    if (!month || !year) {
      return NextResponse.json(
        { error: 'Missing month or year parameter' },
        { status: 400 }
      );
    }
    
    // Parse month and year
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    // First day of the selected month
    const startOfMonth = new Date(yearNum, monthNum - 1, 1);
    
    // Last day of the month - using new approach to ensure accuracy
    // Get the first day of the NEXT month, then subtract 1 day
    const endOfMonth = new Date(yearNum, monthNum, 0);
    
    // Calculate the ACTUAL last day of month (important for correctness)
    // We'll use this to ensure we include the full date range in our calculations
    const lastDayOfMonth = new Date(yearNum, monthNum, 0).getDate();
    
    // Format the dates for Strapi API query
    const formattedStartDate = startOfMonth.toISOString().split('T')[0];
    const formattedEndDate = new Date(yearNum, monthNum - 1, lastDayOfMonth).toISOString().split('T')[0];
    
    console.log(`Month date range: ${formattedStartDate} to ${formattedEndDate} (${lastDayOfMonth} days in month)`);
    console.log(`Checking availability for facility ${facilityId} from ${formattedStartDate} to ${formattedEndDate}`);
    
    // First, get the facility data to get its numeric ID
    const facilityResponse = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/facilities?filters[documentId][$eq]=${facilityId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
      }
    );

    if (!facilityResponse.ok) {
      throw new Error('Failed to fetch facility data');
    }

    const facilityData = await facilityResponse.json();
    if (!facilityData.data || facilityData.data.length === 0) {
      throw new Error('Facility not found');
    }

    // Get the numeric ID from the facility data
    const facilityNumericId = facilityData.data[0].id;
    
    // Fetch bookings for this facility - exclude REJECTED and CANCELED bookings
    // Only bookings with PENDING, APPROVED, or other active statuses should block availability
    const bookingsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings?filters[facility][id][$eq]=${facilityNumericId}&filters[bookingStatus][$notIn][0]=REJECTED&filters[bookingStatus][$notIn][1]=CANCELED&populate=*`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
      }
    );
    
    if (!bookingsResponse.ok) {
      throw new Error('Failed to fetch bookings data');
    }
    
    const bookingsData = await bookingsResponse.json();
    
    console.log(`Found ${bookingsData.data?.length || 0} active bookings for facility ${facilityId} (excluding REJECTED and CANCELED)`);
    
    // Handle different data structures - Strapi v3 vs v4+
    const bookings: Booking[] = [];
    
    // Check response structure and extract bookings accordingly
    try {
      if (bookingsData.data && Array.isArray(bookingsData.data)) {
        bookingsData.data.forEach((booking: any) => {
          // Try to handle different Strapi response structures
          let bookingData: Booking;
          
          // Strapi v4 structure (with attributes property)
          if (booking.attributes) {
            bookingData = {
              id: booking.id,
              startDate: booking.attributes.startDate,
              endDate: booking.attributes.endDate,
              startTime: booking.attributes.startTime,
              endTime: booking.attributes.endTime,
              bookingStatus: booking.attributes.bookingStatus
            };
          } 
          // Flat structure (direct properties)
          else {
            bookingData = {
              id: booking.id,
              startDate: booking.startDate,
              endDate: booking.endDate,
              startTime: booking.startTime,
              endTime: booking.endTime,
              bookingStatus: booking.bookingStatus
            };
          }
          
          // Validate required fields before adding to booking list
          if (bookingData.startDate && bookingData.endDate) {
            bookings.push(bookingData);
          } else {
            console.warn(`Skipping booking ${booking.id} due to missing date fields`);
          }
        });
      }
    } catch (error) {
      console.error('Error processing bookings data:', error);
      // Continue with empty bookings array to show all dates as available
    }
    
    console.log(`Processing ${bookings.length} valid bookings for month ${month}/${year}`);
    
    // Process availability data
    const dates: AvailabilityResponse['dates'] = {};
    
    // Initialize all dates in the month - FIXED to properly handle month boundaries
    const daysInMonth = lastDayOfMonth;
    console.log(`Days in month: ${daysInMonth}`);
    
    // Loop through each day in the month (from 1 to the REAL last day)
    for (let day = 1; day <= daysInMonth; day++) {
      // Create date object for this day
      const date = new Date(yearNum, monthNum - 1, day);
      
      // Format date as ISO string and extract YYYY-MM-DD part
      const formattedDate = date.toISOString().split('T')[0];
      
      console.log(`Initializing date: ${formattedDate}`);
      
      // Initialize availability for this date
      dates[formattedDate] = {
        available: true,
        partiallyAvailable: false,
        bookedTimeSlots: []
      };
    }
    
    // Filter relevant bookings that overlap with the selected month
    const relevantBookings = bookings.filter(booking => {
      try {
        const bookingStartDate = new Date(booking.startDate);
        const bookingEndDate = new Date(booking.endDate);
        const realEndOfMonth = new Date(yearNum, monthNum - 1, lastDayOfMonth);
        
        // Check if booking overlaps with the month
        return !(bookingEndDate < startOfMonth || bookingStartDate > realEndOfMonth);
      } catch (error) {
        console.warn(`Error filtering booking ${booking.id}:`, error);
        return false;
      }
    });
    
    console.log(`Processing ${relevantBookings.length} relevant bookings for month ${month}/${year}`);
    
    // Update availability based on bookings
    relevantBookings.forEach(booking => {
      try {
        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);
        
        // Determine if booking spans multiple days
        const isMultiDayBooking = startDate.toISOString().split('T')[0] !== endDate.toISOString().split('T')[0];
        
        console.log(`Processing booking ${booking.id}: ${booking.startDate} to ${booking.endDate} (${isMultiDayBooking ? 'multi-day' : 'single-day'})`);
        
        // Special handling for multi-day bookings
        if (isMultiDayBooking) {
          // Iterate through all days of the booking
          const currentDate = new Date(startDate);
          
          while (currentDate <= endDate) {
            const formattedDate = currentDate.toISOString().split('T')[0];
            const isFirstDay = formattedDate === startDate.toISOString().split('T')[0];
            const isLastDay = formattedDate === endDate.toISOString().split('T')[0];
            
            // Check if the date is within the requested month
            if (dates[formattedDate]) {
              console.log(`Marking date ${formattedDate} for multi-day booking ${booking.id} (${isFirstDay ? 'first day' : isLastDay ? 'last day' : 'middle day'})`);
              
              // Middle days of a multi-day booking are always fully booked
              if (!isFirstDay && !isLastDay) {
                dates[formattedDate].available = false;
                dates[formattedDate].partiallyAvailable = false;
                // Add full-day booking slots for clarity
                dates[formattedDate].bookedTimeSlots.push({
                  startTime: "00:00:00.000",
                  endTime: "23:59:00.000"
                });
              }
              // First day: Only from startTime to end of day is booked
              else if (isFirstDay) {
                if (booking.startTime === "00:00:00.000") {
                  // If full day is booked on first day
                  dates[formattedDate].available = false;
                  dates[formattedDate].partiallyAvailable = false;
                } else {
                  // Part of the day is booked
                  dates[formattedDate].partiallyAvailable = true;
                  dates[formattedDate].bookedTimeSlots.push({
                    startTime: booking.startTime,
                    endTime: "23:59:00.000"
                  });
                }
              }
              // Last day: From start of day to endTime is booked
              else if (isLastDay) {
                if (booking.endTime === "23:59:00.000") {
                  // If full day is booked on last day
                  dates[formattedDate].available = false;
                  dates[formattedDate].partiallyAvailable = false;
                } else {
                  // Part of the day is booked
                  dates[formattedDate].partiallyAvailable = true;
                  dates[formattedDate].bookedTimeSlots.push({
                    startTime: "00:00:00.000",
                    endTime: booking.endTime
                  });
                }
              }
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } 
        // Single day booking handling
        else {
          const formattedDate = startDate.toISOString().split('T')[0];
          
          // Check if the date is within the requested month
          if (dates[formattedDate]) {
            console.log(`Marking date ${formattedDate} for single-day booking ${booking.id}`);
            
            // Full day bookings or default booking type (no time specified)
            if (
              booking.startTime === "00:00:00.000" && 
              booking.endTime === "23:59:00.000"
            ) {
              dates[formattedDate].available = false;
              dates[formattedDate].partiallyAvailable = false;
            }
            // Check 1_HARI booking type (8:00 to 23:59)
            else if (
              booking.startTime === "08:00:00.000" && 
              booking.endTime === "23:59:00.000"
            ) {
              dates[formattedDate].available = false;
              dates[formattedDate].partiallyAvailable = false;
            }
            // Specific time slot bookings
            else {
              dates[formattedDate].partiallyAvailable = true;
              dates[formattedDate].bookedTimeSlots.push({
                startTime: booking.startTime,
                endTime: booking.endTime
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
        // Continue with next booking
      }
    });
    
    // Final check to ensure all days are included
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearNum, monthNum - 1, day);
      const dateStr = date.toISOString().split('T')[0];
      
      if (!dates[dateStr]) {
        console.log(`Adding missing date: ${dateStr}`);
        dates[dateStr] = {
          available: true,
          partiallyAvailable: false,
          bookedTimeSlots: []
        };
      }
    }
    
    // Debug: Log all dates in the response to verify
    console.log('All dates in response:');
    Object.keys(dates).sort().forEach(date => {
      console.log(`${date}: ${dates[date].available ? 'Available' : 'Not available'}, Slots: ${dates[date].bookedTimeSlots.length}`);
    });
    
    return NextResponse.json({ dates });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
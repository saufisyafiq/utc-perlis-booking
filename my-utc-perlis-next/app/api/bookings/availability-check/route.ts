import { NextRequest, NextResponse } from 'next/server';

interface PackageType {
  type: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY' | 'MULTI_DAY';
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
}

interface TemporaryHold {
  sessionId: string;
  facilityId: string;
  package: PackageType;
  expiresAt: Date;
  createdAt: Date;
}

// In-memory store for temporary holds (in production, use Redis)
const temporaryHolds: Map<string, TemporaryHold> = new Map();

// Clean expired holds
const cleanExpiredHolds = () => {
  const now = new Date();
  for (const [key, hold] of temporaryHolds.entries()) {
    if (hold.expiresAt < now) {
      temporaryHolds.delete(key);
    }
  }
};

// Get package time boundaries
const getPackageTimeBoundaries = (packageType: string, date: string) => {
  switch (packageType) {
    case 'FULL_DAY':
      return {
        type: 'single' as const,
        data: {
          startTime: '08:00:00.000',
          endTime: '22:00:00.000',
          startDate: date,
          endDate: date
        }
      };
    case 'HALF_DAY':
      return {
        type: 'options' as const,
        data: [
          {
            startTime: '08:00:00.000',
            endTime: '14:00:00.000',
            startDate: date,
            endDate: date,
            name: 'Morning'
          },
          {
            startTime: '14:00:00.000',
            endTime: '22:00:00.000',
            startDate: date,
            endDate: date,
            name: 'Afternoon'
          }
        ]
      };
    default:
      return null;
  }
};

// Check if time ranges overlap
const timeRangesOverlap = (
  start1: string, end1: string, date1: string,
  start2: string, end2: string, date2: string
): boolean => {
  // If different dates, check date overlap first
  if (date1 !== date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getTime() === d2.getTime();
  }
  
  // Same date, check time overlap
  const start1Minutes = parseTimeToMinutes(start1);
  const end1Minutes = parseTimeToMinutes(end1);
  const start2Minutes = parseTimeToMinutes(start2);
  const end2Minutes = parseTimeToMinutes(end2);
  
  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
};

// Check if date ranges overlap (for multi-day bookings)
const dateRangesOverlap = (
  startDate1: string, endDate1: string,
  startDate2: string, endDate2: string
): boolean => {
  const start1 = new Date(startDate1);
  const end1 = new Date(endDate1);
  const start2 = new Date(startDate2);
  const end2 = new Date(endDate2);
  
  return start1 <= end2 && end1 >= start2;
};

const parseTimeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

export async function POST(request: NextRequest) {
  try {
    cleanExpiredHolds();
    
    const body = await request.json();
    const { 
      facilityId, 
      packageType, 
      startDate, 
      endDate, 
      startTime, 
      endTime,
      sessionId,
      action = 'check' // 'check' | 'hold' | 'release'
    } = body;

    if (!facilityId || !packageType || !startDate || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Handle different actions
    if (action === 'release') {
      const holdKey = `${sessionId}-${facilityId}`;
      temporaryHolds.delete(holdKey);
      return NextResponse.json({ success: true, message: 'Hold released' });
    }

    // Get facility data
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

    const facilityNumericId = facilityData.data[0].id;

    // Fetch existing bookings - exclude REJECTED and CANCELED bookings
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
    const existingBookings = bookingsData.data || [];

    // Get current temporary holds (excluding current session)
    const currentHolds = Array.from(temporaryHolds.values())
      .filter(hold => hold.facilityId === facilityId && hold.sessionId !== sessionId);

    // Determine package boundaries
    let requestedPackage: PackageType;
    
    if (packageType === 'HOURLY') {
      requestedPackage = {
        type: 'HOURLY',
        startTime: startTime || '08:00:00.000',
        endTime: endTime || '09:00:00.000',
        startDate,
        endDate: endDate || startDate
      };
    } else if (packageType === 'FULL_DAY') {
      const fullDayBoundaries = getPackageTimeBoundaries('FULL_DAY', startDate);
      if (!fullDayBoundaries || fullDayBoundaries.type !== 'single') {
        return NextResponse.json(
          { error: 'Failed to get full day boundaries' },
          { status: 500 }
        );
      }
      requestedPackage = {
        type: 'FULL_DAY',
        startTime: fullDayBoundaries.data.startTime,
        endTime: fullDayBoundaries.data.endTime,
        startDate,
        endDate: endDate || startDate
      };
    } else if (packageType === 'HALF_DAY') {
      const halfDayOptions = getPackageTimeBoundaries('HALF_DAY', startDate);
      if (!halfDayOptions || halfDayOptions.type !== 'options') {
        return NextResponse.json(
          { error: 'Failed to get half day boundaries' },
          { status: 500 }
        );
      }
      // For half day, we need to specify which half
      const selectedHalf = body.halfDayPeriod || 'morning'; // 'morning' | 'afternoon'
      const selectedOption = halfDayOptions.data[selectedHalf === 'morning' ? 0 : 1];
      
      requestedPackage = {
        type: 'HALF_DAY',
        startTime: selectedOption.startTime,
        endTime: selectedOption.endTime,
        startDate,
        endDate: endDate || startDate
      };
    } else if (packageType === 'MULTI_DAY') {
      requestedPackage = {
        type: 'MULTI_DAY',
        startTime: '08:00:00.000',
        endTime: '22:00:00.000',
        startDate,
        endDate: endDate || startDate
      };
    } else {
      return NextResponse.json(
        { error: 'Invalid package type' },
        { status: 400 }
      );
    }

    // Check conflicts with existing bookings
    const hasBookingConflict = existingBookings.some((booking: any) => {
      const bookingData = booking.attributes || booking;
      
      // First check if date ranges overlap
      const dateOverlap = dateRangesOverlap(
        requestedPackage.startDate,
        requestedPackage.endDate,
        bookingData.startDate,
        bookingData.endDate
      );
      
      if (!dateOverlap) {
        return false;
      }
      
      // If dates overlap, check time overlap (for same-day bookings)
      if (requestedPackage.startDate === requestedPackage.endDate && 
          bookingData.startDate === bookingData.endDate &&
          requestedPackage.startDate === bookingData.startDate) {
        return timeRangesOverlap(
          requestedPackage.startTime,
          requestedPackage.endTime,
          requestedPackage.startDate,
          bookingData.startTime,
          bookingData.endTime,
          bookingData.startDate
        );
      }
      
      // For multi-day bookings, any date overlap is a conflict
      return true;
    });

    // Check conflicts with temporary holds
    const hasHoldConflict = currentHolds.some(hold => {
      // First check if date ranges overlap
      const dateOverlap = dateRangesOverlap(
        requestedPackage.startDate,
        requestedPackage.endDate,
        hold.package.startDate,
        hold.package.endDate
      );
      
      if (!dateOverlap) {
        return false;
      }
      
      // If dates overlap, check time overlap (for same-day bookings)
      if (requestedPackage.startDate === requestedPackage.endDate && 
          hold.package.startDate === hold.package.endDate &&
          requestedPackage.startDate === hold.package.startDate) {
        return timeRangesOverlap(
          requestedPackage.startTime,
          requestedPackage.endTime,
          requestedPackage.startDate,
          hold.package.startTime,
          hold.package.endTime,
          hold.package.startDate
        );
      }
      
      // For multi-day bookings, any date overlap is a conflict
      return true;
    });

    const isAvailable = !hasBookingConflict && !hasHoldConflict;

    // If checking availability and it's available, create a temporary hold
    if (action === 'hold' && isAvailable) {
      const holdKey = `${sessionId}-${facilityId}`;
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 15); // 15-minute hold

      temporaryHolds.set(holdKey, {
        sessionId,
        facilityId,
        package: requestedPackage,
        expiresAt: expirationTime,
        createdAt: new Date()
      });
    }

    // Generate available alternatives if requested package is not available
    let alternatives: any[] = [];
    if (!isAvailable && packageType !== 'HOURLY') {
      // Suggest hourly slots that are available
      const operatingHours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 10 PM
      
      alternatives = operatingHours.map(hour => {
        const slotStart = `${hour.toString().padStart(2, '0')}:00:00.000`;
        const slotEnd = `${(hour + 1).toString().padStart(2, '0')}:00:00.000`;
        
        const hasConflict = existingBookings.some((booking: any) => {
          const bookingData = booking.attributes || booking;
          return timeRangesOverlap(
            slotStart, slotEnd, startDate,
            bookingData.startTime, bookingData.endTime, bookingData.startDate
          );
        }) || currentHolds.some(hold => {
          return timeRangesOverlap(
            slotStart, slotEnd, startDate,
            hold.package.startTime, hold.package.endTime, hold.package.startDate
          );
        });

        return {
          type: 'HOURLY',
          startTime: slotStart,
          endTime: slotEnd,
          available: !hasConflict,
          displayTime: `${hour}:00 - ${hour + 1}:00`
        };
      }).filter(slot => slot.available);
    }

    return NextResponse.json({
      available: isAvailable,
      package: requestedPackage,
      conflictReason: hasBookingConflict ? 'existing_booking' : hasHoldConflict ? 'temporary_hold' : null,
      alternatives,
      holdExpiry: action === 'hold' && isAvailable ? 
        temporaryHolds.get(`${sessionId}-${facilityId}`)?.expiresAt : null
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
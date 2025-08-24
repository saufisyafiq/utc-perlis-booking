import { NextRequest, NextResponse } from 'next/server';

// Helper function to transform booking data
function transformBookingData(booking: any) {
  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber || booking.attributes?.bookingNumber,
    name: booking.name || booking.attributes?.name,
    email: booking.email || booking.attributes?.email,
    purpose: booking.purpose || booking.attributes?.purpose,
    eventName: booking.eventName || booking.attributes?.eventName,
    startDate: booking.startDate || booking.attributes?.startDate,
    endDate: booking.endDate || booking.attributes?.endDate,
    startTime: booking.startTime || booking.attributes?.startTime,
    endTime: booking.endTime || booking.attributes?.endTime,
    attendance: booking.attendance || booking.attributes?.attendance,
    totalPrice: booking.totalPrice || booking.attributes?.totalPrice,
    bookingStatus: booking.bookingStatus || booking.attributes?.bookingStatus,
    statusReason: booking.statusReason || booking.attributes?.statusReason,
    paymentStatus: booking.paymentStatus || booking.attributes?.paymentStatus,
    facility: {
      name: booking.facility?.name || booking.attributes?.facility?.data?.name || booking.attributes?.facility?.data?.attributes?.name || 'N/A'
    },
    createdAt: booking.createdAt || booking.attributes?.createdAt,
    processedAt: booking.processedAt || booking.attributes?.processedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const bookingId = searchParams.get('id');

    if (!email || !bookingId) {
      return NextResponse.json(
        { error: 'Email dan ID tempahan diperlukan' },
        { status: 400 }
      );
    }

    // Search for booking with email and ID (try booking number first, then fallback to numeric ID)
    let response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings?filters[email][$eq]=${encodeURIComponent(email)}&filters[bookingNumber][$eq]=${bookingId}&populate=facility`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
      }
    );

    // If no booking found by booking number, try searching by numeric ID (backward compatibility)
    if (response.ok) {
      const data = await response.json();
      if (!data.data || data.data.length === 0) {
        response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings?filters[email][$eq]=${encodeURIComponent(email)}&filters[id][$eq]=${bookingId}&populate=facility`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
            },
          }
        );
      } else {
        // We found a booking by booking number, process this data
        const booking = data.data[0];
        const transformedBooking = transformBookingData(booking);
        return NextResponse.json({ booking: transformedBooking });
      }
    }

    if (!response.ok) {
      throw new Error('Failed to fetch booking');
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return NextResponse.json(
        { error: 'Tempahan tidak dijumpai atau email tidak sepadan' },
        { status: 404 }
      );
    }

    // Transform the booking data to match our interface
    const booking = data.data[0];
    const transformedBooking = transformBookingData(booking);

    return NextResponse.json({ booking: transformedBooking });

  } catch (error) {
    console.error('Error searching booking:', error);
    return NextResponse.json(
      { error: 'Ralat sistem semasa mencari tempahan' },
      { status: 500 }
    );
  }
} 
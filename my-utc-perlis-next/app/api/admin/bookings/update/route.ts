import { NextRequest, NextResponse } from 'next/server';

interface UpdateBookingRequest {
  documentId: string;
  bookingStatus: string;
  statusReason?: string;
  processedAt?: string;
  totalPrice?: number;
  paymentStatus?: string;
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateBookingRequest = await request.json();
    const { documentId, bookingStatus, statusReason, processedAt, totalPrice, paymentStatus } = body;

    // Validate required fields
    if (!documentId || !bookingStatus) {
      return NextResponse.json(
        { error: 'Document ID and booking status are required' },
        { status: 400 }
      );
    }

    console.log('Admin updating booking:', documentId, 'to', bookingStatus, totalPrice ? `with new price: ${totalPrice}` : '', paymentStatus ? `with payment status: ${paymentStatus}` : '');

    // Prepare update data
    const updateData: {
      bookingStatus: string;
      statusReason?: string | null;
      processedAt: string;
      totalPrice?: number;
      paymentStatus?: string;
    } = {
      bookingStatus,
      statusReason: statusReason || null,
      processedAt: processedAt || new Date().toISOString(),
    };

    if (totalPrice !== undefined) {
      updateData.totalPrice = totalPrice;
    }

    if (paymentStatus !== undefined) {
      updateData.paymentStatus = paymentStatus;
    }

    // Use server-side API token to update via Strapi REST API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings/${documentId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({
          data: updateData
        }),
      }
    );

    console.log('Strapi response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Strapi API Error:', errorData);
      return NextResponse.json(
        { error: `Failed to update booking: ${response.status} - ${errorData}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Booking updated successfully:', result);

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Booking updated successfully'
    });

  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

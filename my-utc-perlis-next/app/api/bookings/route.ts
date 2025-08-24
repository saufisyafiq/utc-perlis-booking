import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.json();
    console.log('Received form data:', formData);
    
    // Function to format time to Strapi's expected format
    const formatTime = (time: string) => {
      if (!time) return null;
      return `${time}:00.000`;
    };

    // Transform form data to match Strapi field names
    const bookingData = {
      name: formData.applicantName,
      jabatan: formData.department,
      address: formData.address,
      email: formData.email,
      phoneNo: formData.phoneNumber,
      purpose: formData.purpose,
      eventName: formData.eventName,
      startDate: formData.startDate,
      endDate: formData.endDate,
      startTime: formatTime(formData.startTime),
      endTime: formatTime(formData.endTime),
      attendance: formData.attendance,
      totalPrice: formData.totalPrice,
      facility: 1,
      rentDetails: {
        duration: formData.rental.duration,
        additionalEquipment: formData.rental.additionalEquipment
      },
      meal: {
        breakfast: formData.food.breakfast,
        lunch: formData.food.lunch,
        dinner: formData.food.dinner,
        supper: formData.food.supper,
        mineralWater: formData.food.mineralWater
      },
      bookingStatus: 'PENDING'
    };

    // First, get the facility data to get its ID
    const facilityResponse = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/facilities?filters[documentId][$eq]=${formData.facilityId}`,
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
    console.log('Facility data:', facilityData);

    if (!facilityData.data || facilityData.data.length === 0) {
      throw new Error('Facility not found');
    }

    // Get the numeric ID from the facility data
    const facilityNumericId = facilityData.data[0].id;

    console.log('Transformed booking data:', bookingData);

    // Send data to Strapi with authorization header
    const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({ 
        data: {
          ...bookingData,
          facility: facilityNumericId
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Strapi error:', error);
      return NextResponse.json(
        { error: 'Failed to create booking', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Strapi response:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

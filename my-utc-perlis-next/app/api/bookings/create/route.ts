import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateBookingNumber } from '@/app/lib/booking-number-generator-simple';
import { getEmailService } from '@/lib/email-service';

// Validation schema
const CreateBookingSchema = z.object({
  applicantName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  department: z.string().min(2, 'Department is required').max(200),
  address: z.string().min(10, 'Address must be at least 10 characters').max(500),
  email: z.string().email('Invalid email format'),
  phoneNumber: z.string().regex(/^[0-9+\-() ]{8,15}$/, 'Invalid phone number format'),
  purpose: z.string().min(5, 'Purpose must be at least 5 characters').max(500),
  eventName: z.string().min(2, 'Event name is required').max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  attendance: z.number().min(1, 'Attendance must be at least 1').max(1000),
  facilityId: z.string().min(1, 'Facility ID is required'),
  packageType: z.enum(['HOURLY', 'HALF_DAY', 'FULL_DAY', 'MULTI_DAY']),
  rental: z.object({
    duration: z.enum(['PER_JAM', '1/2_HARI', '1_HARI', 'MULTI_HARI']),
    additionalEquipment: z.record(z.boolean()).optional()
  }),
  food: z.object({
    breakfast: z.boolean().optional(),
    lunch: z.boolean().optional(),
    dinner: z.boolean().optional(),
    supper: z.boolean().optional(),
    mineralWater: z.number().min(0).optional()
  }).optional(),
  sessionId: z.string().min(1, 'Session ID is required'),
  frontendCalculatedPrice: z.number().min(0).optional()
});

type CreateBookingRequest = z.infer<typeof CreateBookingSchema>;

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

class BookingError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

// Helper functions
const formatTime = (time: string): string => {
  return `${time}:00.000`;
};

const validateBusinessRules = async (data: CreateBookingRequest): Promise<void> => {
  // Validate dates
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (startDate < now) {
    throw new BookingError('INVALID_DATE', 'Cannot book for past dates');
  }

  if (startDate > endDate) {
    throw new BookingError('INVALID_DATE_RANGE', 'End date must be after start date');
  }

  // Validate time range
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (startMinutes >= endMinutes) {
    throw new BookingError('INVALID_TIME_RANGE', 'End time must be after start time');
  }

  // Validate operating hours (8 AM to 10 PM)
  if (startMinutes < 8 * 60 || endMinutes > 22 * 60) {
    throw new BookingError('OUTSIDE_OPERATING_HOURS', 'Booking must be within operating hours (8 AM - 10 PM)');
  }
};

const getFacilityData = async (facilityId: string) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/facilities?filters[documentId][$eq]=${facilityId}&populate=*`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new BookingError('FACILITY_FETCH_ERROR', 'Failed to fetch facility data', 500);
  }

  const facilityData = await response.json();
  if (!facilityData.data || facilityData.data.length === 0) {
    throw new BookingError('FACILITY_NOT_FOUND', 'Facility not found', 404);
  }

  return facilityData.data[0];
};

const checkAvailability = async (data: CreateBookingRequest, facilityNumericId: number): Promise<void> => {
  // Check for overlapping bookings - exclude REJECTED and CANCELED bookings
  const bookingsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings?filters[facility][id][$eq]=${facilityNumericId}&filters[bookingStatus][$notIn][0]=REJECTED&filters[bookingStatus][$notIn][1]=CANCELED&populate=*`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
      },
    }
  );

  if (!bookingsResponse.ok) {
    throw new BookingError('AVAILABILITY_CHECK_ERROR', 'Failed to check availability', 500);
  }

  const bookingsData = await bookingsResponse.json();
  const existingBookings = bookingsData.data || [];

  // Check for time conflicts
  const hasConflict = existingBookings.some((booking: any) => {
    const bookingData = booking.attributes || booking;
    
    // Check date range overlap
    const existingStartDate = new Date(bookingData.startDate);
    const existingEndDate = new Date(bookingData.endDate);
    const requestedStartDate = new Date(data.startDate);
    const requestedEndDate = new Date(data.endDate);

    // Check if date ranges overlap
    const dateOverlap = requestedStartDate <= existingEndDate && requestedEndDate >= existingStartDate;
    
    if (!dateOverlap) {
      return false;
    }

    // If dates overlap, check time overlap (only for same-day bookings)
    if (bookingData.startDate === data.startDate && bookingData.endDate === data.endDate) {
      const existingStart = parseTimeToMinutes(bookingData.startTime);
      const existingEnd = parseTimeToMinutes(bookingData.endTime);
      const requestedStart = parseTimeToMinutes(formatTime(data.startTime));
      const requestedEnd = parseTimeToMinutes(formatTime(data.endTime));

      return requestedStart < existingEnd && requestedEnd > existingStart;
    }

    // For multi-day bookings, any date overlap is a conflict
    return true;
  });

  if (hasConflict) {
    throw new BookingError('TIME_CONFLICT', 'The requested time slot is already booked', 409);
  }
};

const parseTimeToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const calculateTotalPrice = (data: CreateBookingRequest, facility: any): number => {
  let basePrice = 0;
  
  const duration = data.rental.duration;
  const rates = facility.rates || {};

  switch (duration) {
    case 'PER_JAM':
      const hours = Math.ceil((parseTimeToMinutes(formatTime(data.endTime)) - parseTimeToMinutes(formatTime(data.startTime))) / 60);
      basePrice = hours * (rates.hourlyRate || 50);
      break;
    case '1/2_HARI':
      basePrice = rates.halfDayRate || 250;
      break;
    case '1_HARI':
      basePrice = rates.fullDayRate || 400;
      break;
    case 'MULTI_HARI':
      // Calculate number of days
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end date
      basePrice = daysDiff * (rates.fullDayRate || 400);
      break;
  }

  // Add equipment costs
  let equipmentPrice = 0;
  if (data.rental.additionalEquipment && facility.equipmentRates) {
    Object.entries(data.rental.additionalEquipment).forEach(([equipment, selected]) => {
      if (selected && facility.equipmentRates[equipment]) {
        equipmentPrice += facility.equipmentRates[equipment];
      }
    });
  }

  // Add water cost (RM1.00 per bottle)
  let waterCost = 0;
  if (data.food?.mineralWater && data.food.mineralWater > 0) {
    waterCost = data.food.mineralWater * 1.00;
  }

  return basePrice + equipmentPrice + waterCost;
};

const uploadFiles = async (files: File[]): Promise<number[]> => {
  const uploadedFileIds: number[] = [];
  
  for (const file of files) {
    const formData = new FormData();
    formData.append('files', file);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new BookingError('FILE_UPLOAD_ERROR', `Failed to upload file: ${file.name}`, response.status, error);
    }
    
    const uploadResult = await response.json();
    uploadedFileIds.push(uploadResult[0].id);
  }
  
  return uploadedFileIds;
};

const sendBookingConfirmationEmail = async (data: CreateBookingRequest, bookingNumber: string, facility: any, totalPrice: number): Promise<void> => {
  try {
    const emailService = getEmailService();
    
    // Format date and time for display
    const startDate = new Date(data.startDate).toLocaleDateString('ms-MY', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const endDate = new Date(data.endDate).toLocaleDateString('ms-MY', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="ms">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pengesahan Tempahan - UTC Perlis</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🏢 UTC Perlis</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Pengesahan Tempahan Fasiliti</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef;">
          <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
            <h2 style="color: #155724; margin: 0 0 10px 0; font-size: 20px;">✅ Tempahan Anda Telah Diterima</h2>
            <p style="color: #155724; margin: 0; font-size: 16px;">
              Terima kasih! Permohonan tempahan anda telah berjaya dihantar dan sedang menunggu kelulusan pihak pengurusan.
            </p>
          </div>
          
          <div style="background: white; border-radius: 8px; padding: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <h3 style="color: #495057; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">📋 Maklumat Tempahan</h3>
            
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f3f4;">
                <strong>No. Tempahan:</strong>
                <span style="color: #0066cc; font-weight: bold;">${bookingNumber}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f3f4;">
                <strong>Nama Pemohon:</strong>
                <span>${data.applicantName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f3f4;">
                <strong>Jabatan:</strong>
                <span>${data.department}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f3f4;">
                <strong>Fasiliti:</strong>
                <span>${facility.name}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f3f4;">
                <strong>Tujuan:</strong>
                <span>${data.purpose}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f3f4;">
                <strong>Nama Acara:</strong>
                <span>${data.eventName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f3f4;">
                <strong>Tarikh Mula:</strong>
                <span>${startDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f3f4;">
                <strong>Tarikh Tamat:</strong>
                <span>${endDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f3f4;">
                <strong>Masa:</strong>
                <span>${data.startTime} - ${data.endTime}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f3f4;">
                <strong>Bilangan Kehadiran:</strong>
                <span>${data.attendance} orang</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 18px; font-weight: bold; color: #28a745;">
                <strong>Jumlah Harga:</strong>
                <span>RM ${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">⏳ Langkah Seterusnya</h3>
            <ol style="color: #856404; margin: 10px 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Permohonan anda sedang dalam proses semakan oleh pihak pengurusan</li>
              <li style="margin-bottom: 8px;">Anda akan menerima notifikasi email apabila tempahan diluluskan atau ditolak</li>
              <li style="margin-bottom: 8px;">Sekiranya diluluskan, sila buat pembayaran mengikut arahan yang akan diberikan</li>
            </ol>
          </div>
          
          <div style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 20px;">
            <h3 style="color: #004085; margin: 0 0 10px 0; font-size: 16px;">📞 Hubungi Kami</h3>
            <p style="color: #004085; margin: 5px 0;">
              Sekiranya anda mempunyai sebarang pertanyaan, sila hubungi kami di:
            </p>
            <p style="color: #004085; margin: 5px 0;">
              📧 Email: utcperlis09@gmail.com<br>
              📞 Telefon: +604-9705310
            </p>
          </div>
        </div>
        
        <div style="background: #6c757d; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px;">
          <p style="margin: 0;">
            Email ini dijana secara automatik. Sila jangan balas email ini.<br>
            © 2024 UTC Perlis. Hak cipta terpelihara.
          </p>
        </div>
      </body>
      </html>
    `;

    await emailService.sendEmail({
      to: data.email,
      subject: `Pengesahan Tempahan - ${bookingNumber} - UTC Perlis`,
      html: emailHtml
    });

    console.log(`✅ Booking confirmation email sent to ${data.email}`);
  } catch (error) {
    console.error('❌ Failed to send booking confirmation email:', error);
    // Don't throw error - email failure shouldn't prevent booking creation
  }
};

const createBookingRecord = async (data: CreateBookingRequest, facilityNumericId: number, totalPrice: number, fileIds: number[] = []) => {
  // Generate simple booking number (Base36 encoded, no database dependencies)
  const bookingNumberResult = generateBookingNumber();
  
  const bookingData = {
    name: data.applicantName,
    jabatan: data.department,
    address: data.address,
    email: data.email,
    phoneNo: data.phoneNumber,
    purpose: data.purpose,
    eventName: data.eventName,
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: formatTime(data.startTime),
    endTime: formatTime(data.endTime),
    attendance: data.attendance,
    totalPrice,
    packageType: data.packageType,
    facility: facilityNumericId,
    rentDetails: {
      duration: data.rental.duration,
      additionalEquipment: data.rental.additionalEquipment || {}
    },
    meal: data.food || {},
    bookingStatus: 'PENDING',
    paymentStatus: 'UNPAID',
    sessionId: data.sessionId,
    dokumen_berkaitan: fileIds, // Add file references
    bookingNumber: bookingNumberResult.bookingNumber // Store booking number in database
  };

  const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify({ data: bookingData }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new BookingError('BOOKING_CREATION_ERROR', 'Failed to create booking', response.status, error);
  }

  return { response: await response.json(), bookingNumber: bookingNumberResult.bookingNumber };
};

export async function POST(request: NextRequest) {
  try {
    // Check content type and parse accordingly
    const contentType = request.headers.get('content-type') || '';
    let validatedData: CreateBookingRequest;
    let files: File[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with files)
      const formData = await request.formData();
      const dataString = formData.get('data') as string;
      
      if (!dataString) {
        throw new BookingError('MISSING_DATA', 'No booking data provided', 400);
      }

      const body = JSON.parse(dataString);
      validatedData = CreateBookingSchema.parse(body);

      // Extract files
      files = formData.getAll('dokumen_berkaitan') as File[];
      
    } else {
      // Handle JSON (backward compatibility)
      const body = await request.json();
      validatedData = CreateBookingSchema.parse(body);
    }

    // Business rule validation
    await validateBusinessRules(validatedData);

    // Get facility data and validate capacity
    const facility = await getFacilityData(validatedData.facilityId);
    
    if (validatedData.attendance > facility.capacity) {
      throw new BookingError(
        'CAPACITY_EXCEEDED', 
        `Attendance (${validatedData.attendance}) exceeds facility capacity (${facility.capacity})`,
        400
      );
    }

    // Check availability
    await checkAvailability(validatedData, facility.id);

    // Use frontend-calculated price if provided, otherwise calculate on backend
    const backendCalculatedPrice = calculateTotalPrice(validatedData, facility);
    const totalPrice = validatedData.frontendCalculatedPrice && validatedData.frontendCalculatedPrice > 0 
      ? validatedData.frontendCalculatedPrice 
      : backendCalculatedPrice;
      
    console.log('💰 Pricing comparison:', {
      frontendPrice: validatedData.frontendCalculatedPrice,
      backendPrice: backendCalculatedPrice,
      finalPrice: totalPrice,
      usingFrontend: validatedData.frontendCalculatedPrice && validatedData.frontendCalculatedPrice > 0
    });

    // Upload files if any
    let uploadedFileIds: number[] = [];
    if (files.length > 0) {
      uploadedFileIds = await uploadFiles(files);
    }

    // Create booking record with file references
    const result = await createBookingRecord(validatedData, facility.id, totalPrice, uploadedFileIds);

    // Send confirmation email to the user
    await sendBookingConfirmationEmail(validatedData, result.bookingNumber, facility, totalPrice);

    // Release any temporary holds for this session
    try {
      await fetch('/api/bookings/availability-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: validatedData.facilityId,
          sessionId: validatedData.sessionId,
          action: 'release'
        })
      });
    } catch (holdError) {
      // Don't fail the booking if hold release fails
      console.warn('Failed to release hold:', holdError);
    }

    return NextResponse.json({
      success: true,
      data: result.response.data,
      message: 'Booking created successfully',
      filesUploaded: uploadedFileIds.length,
      bookingNumber: result.bookingNumber
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Booking creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: error.errors
      }, { status: 400 });
    }

    if (error instanceof BookingError) {
      return NextResponse.json({
        success: false,
        error: error.code,
        message: error.message,
        details: error.details
      }, { status: error.statusCode });
    }

    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';

interface PaymentUploadRequest {
  bookingId: string;
  email: string;
  paymentProof?: string; // Base64 or file path
}

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] Payment upload API called');
    
    // Check environment variables
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL;
    const strapiToken = process.env.STRAPI_API_TOKEN;
    
    console.log('[DEBUG] Environment check:', {
      strapiUrl: strapiUrl ? 'Set' : 'Missing',
      strapiToken: strapiToken ? 'Set' : 'Missing'
    });
    
    if (!strapiUrl || !strapiToken) {
      console.error('[ERROR] Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing environment variables' },
        { status: 500 }
      );
    }
    
    const contentType = request.headers.get('content-type') || '';
    let bookingId: string;
    let email: string;
    let paymentProof: string | undefined;
    let uploadedFileIds: number[] = [];

    console.log('[DEBUG] Content type:', contentType);

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with files)
      const formData = await request.formData();
      bookingId = formData.get('bookingId') as string;
      email = formData.get('email') as string;
      
      console.log('[DEBUG] Form data:', { bookingId, email });
      
      // Handle file upload
      const file = formData.get('paymentProof') as File;
      console.log('[DEBUG] File info:', { 
        hasFile: !!file, 
        fileName: file?.name, 
        fileSize: file?.size,
        fileType: file?.type 
      });
      
      if (file && file.size > 0) {
        try {
          // Upload file to Strapi
          const fileFormData = new FormData();
          fileFormData.append('files', file);
          
          console.log('[DEBUG] Uploading file to Strapi:', `${strapiUrl}/api/upload`);
          
          const uploadResponse = await fetch(`${strapiUrl}/api/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${strapiToken}`,
            },
            body: fileFormData,
          });

          console.log('[DEBUG] Upload response status:', uploadResponse.status);
          
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            console.log('[DEBUG] Upload result:', uploadResult);
            uploadedFileIds = uploadResult.map((file: { id: number }) => file.id);
            paymentProof = uploadResult[0]?.url || 'File uploaded';
          } else {
            const errorText = await uploadResponse.text();
            console.error('[ERROR] File upload failed:', errorText);
            return NextResponse.json(
              { error: 'Failed to upload file to server' },
              { status: 500 }
            );
          }
        } catch (uploadError) {
          console.error('[ERROR] File upload exception:', uploadError);
          return NextResponse.json(
            { error: 'File upload failed' },
            { status: 500 }
          );
        }
      }
    } else {
      // Handle JSON (backward compatibility)
      const body: PaymentUploadRequest = await request.json();
      bookingId = body.bookingId;
      email = body.email;
      paymentProof = body.paymentProof;
    }

    // Validate required fields
    if (!bookingId || !email) {
      return NextResponse.json(
        { error: 'Booking ID and email are required' },
        { status: 400 }
      );
    }

    console.log('[DEBUG] User uploading payment proof for booking:', bookingId);

    // First, verify the booking exists and belongs to this email
    try {
      console.log('[DEBUG] Verifying booking:', `${strapiUrl}/api/booking/all?search=${encodeURIComponent(email)}`);
      
      const verifyResponse = await fetch(
        `${strapiUrl}/api/booking/all?search=${encodeURIComponent(email)}`,
        {
          headers: {
            'Authorization': `Bearer ${strapiToken}`,
          },
        }
      );

      console.log('[DEBUG] Verify response status:', verifyResponse.status);

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.error('[ERROR] Failed to verify booking:', errorText);
        return NextResponse.json(
          { error: 'Failed to verify booking' },
          { status: 400 }
        );
      }

      const bookingsData = await verifyResponse.json();
      console.log('[DEBUG] Bookings data:', { 
        hasData: !!bookingsData.data, 
        count: bookingsData.data?.length || 0 
      });
      
      const booking = bookingsData.data?.find((b: any) => 
        b.bookingNumber === bookingId || b.id.toString() === bookingId || b.documentId === bookingId
      );

      console.log('[DEBUG] Found booking:', !!booking);

      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found or email does not match' },
          { status: 404 }
        );
      }

      console.log('[DEBUG] Booking status:', booking.bookingStatus);

      if (booking.bookingStatus !== 'AWAITING PAYMENT' && booking.bookingStatus !== 'AWAITING_PAYMENT') {
        return NextResponse.json(
          { error: 'Booking is not in awaiting payment status' },
          { status: 400 }
        );
      }

      // Update booking status to REVIEW_PAYMENT
      const updateData: Record<string, unknown> = {
        bookingStatus: 'REVIEW PAYMENT',
        paymentProof: paymentProof || 'Uploaded', // Store proof reference
        processedAt: new Date().toISOString(),
      };

      // Add uploaded files if any
      if (uploadedFileIds.length > 0) {
        updateData.bukti_pembayaran = uploadedFileIds;
      }

      console.log('[DEBUG] Updating booking:', booking.documentId, updateData);

      const updateResponse = await fetch(
        `${strapiUrl}/api/bookings/${booking.documentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${strapiToken}`,
          },
          body: JSON.stringify({
            data: updateData
          }),
        }
      );

      console.log('[DEBUG] Update response status:', updateResponse.status);

      if (!updateResponse.ok) {
        const errorData = await updateResponse.text();
        console.error('[ERROR] Failed to update booking status:', errorData);
        return NextResponse.json(
          { error: 'Failed to update booking status' },
          { status: 500 }
        );
      }

      const result = await updateResponse.json();
      console.log('[DEBUG] Update result:', result);

      return NextResponse.json({
        success: true,
        message: 'Payment proof uploaded successfully. Your booking is now under review.',
        data: {
          bookingId: booking.bookingNumber || booking.id,
          status: 'REVIEW PAYMENT'
        }
      });

    } catch (verificationError) {
      console.error('[ERROR] Error during booking verification/update:', verificationError);
      return NextResponse.json(
        { error: 'Failed to process payment proof upload' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[ERROR] Error uploading payment proof:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

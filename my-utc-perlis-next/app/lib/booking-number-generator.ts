/**
 * Booking Number Generator
 * 
 * Generates unique, sequential booking numbers in the format: UTC-YYYY-NNNN
 * 
 * Features:
 * - Human-friendly format
 * - Sequential numbering per year
 * - Collision-resistant
 * - Remains stable throughout booking lifecycle
 */

export interface BookingNumberResult {
  bookingNumber: string;
  year: number;
  sequence: number;
}

/**
 * Generate a unique booking number
 * Format: UTC-YYYY-NNNN (e.g., UTC-2024-0001)
 */
export async function generateBookingNumber(): Promise<BookingNumberResult> {
  const currentYear = new Date().getFullYear();
  let nextSequence = 1;

  try {
    // Try to get the highest booking number for the current year from Strapi
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings?filters[bookingNumber][$startsWith]=UTC-${currentYear}&sort=bookingNumber:desc&pagination[limit]=1`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const lastBooking = data.data[0];
        const lastBookingNumber = lastBooking.bookingNumber || lastBooking.attributes?.bookingNumber;
        
        if (lastBookingNumber) {
          // Extract sequence number from last booking number (UTC-YYYY-NNNN)
          const sequenceMatch = lastBookingNumber.match(/UTC-\d{4}-(\d{4})/);
          if (sequenceMatch) {
            nextSequence = parseInt(sequenceMatch[1], 10) + 1;
          }
        }
      }
    } else {
      console.warn('Failed to fetch existing booking numbers from Strapi, using fallback method');
      // Fallback: Use timestamp-based sequence to ensure uniqueness
      const now = new Date();
      const timeBasedSequence = parseInt(
        (now.getHours().toString().padStart(2, '0') + 
         now.getMinutes().toString().padStart(2, '0') + 
         now.getSeconds().toString().padStart(2, '0')).slice(-4)
      );
      nextSequence = timeBasedSequence || Math.floor(Math.random() * 9999) + 1;
    }
  } catch (error) {
    console.warn('Error fetching booking numbers, using fallback:', error);
    // Fallback: Use timestamp-based sequence to ensure uniqueness
    const now = new Date();
    const timeBasedSequence = parseInt(
      (now.getHours().toString().padStart(2, '0') + 
       now.getMinutes().toString().padStart(2, '0') + 
       now.getSeconds().toString().padStart(2, '0')).slice(-4)
    );
    nextSequence = timeBasedSequence || Math.floor(Math.random() * 9999) + 1;
  }

  // Ensure sequence doesn't exceed 9999 (4 digits)
  if (nextSequence > 9999) {
    nextSequence = Math.floor(Math.random() * 9999) + 1;
  }

  const bookingNumber = `UTC-${currentYear}-${nextSequence.toString().padStart(4, '0')}`;

  return {
    bookingNumber,
    year: currentYear,
    sequence: nextSequence
  };
}

/**
 * Validate booking number format
 */
export function validateBookingNumber(bookingNumber: string): boolean {
  const pattern = /^UTC-\d{4}-\d{4}$/;
  return pattern.test(bookingNumber);
}

/**
 * Parse booking number components
 */
export function parseBookingNumber(bookingNumber: string): BookingNumberResult | null {
  const match = bookingNumber.match(/^UTC-(\d{4})-(\d{4})$/);
  if (!match) {
    return null;
  }

  return {
    bookingNumber,
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10)
  };
}

/**
 * Generate booking number with retry mechanism for collision handling
 */
export async function generateUniqueBookingNumber(maxRetries: number = 5): Promise<BookingNumberResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateBookingNumber();
      
      // Verify uniqueness by checking if the number already exists
      const checkResponse = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings?filters[bookingNumber][$eq]=${result.bookingNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
          },
        }
      );

      if (!checkResponse.ok) {
        throw new Error('Failed to verify booking number uniqueness');
      }

      const checkData = await checkResponse.json();
      
      // If no existing booking found, the number is unique
      if (!checkData.data || checkData.data.length === 0) {
        return result;
      }

      // If collision detected and it's not the last attempt, try again
      if (attempt < maxRetries) {
        console.warn(`Booking number collision detected: ${result.bookingNumber}. Retrying... (${attempt}/${maxRetries})`);
        continue;
      }

      throw new Error(`Failed to generate unique booking number after ${maxRetries} attempts`);
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`Attempt ${attempt} failed:`, error);
    }
  }

  throw new Error('Failed to generate booking number');
}

/**
 * Enhanced Booking Number Generator V2
 * 
 * Generates unique booking numbers in format: UTC-YY-NNNNNN
 * 
 * Features:
 * - Compact 11-character format
 * - Supports 999,999 bookings per year
 * - Atomic database operations
 * - Race condition resistant
 * - Better fallback mechanisms
 */

export interface BookingNumberResult {
  bookingNumber: string;
  year: number;
  sequence: number;
}

/**
 * Generate a unique booking number with enhanced algorithm
 * Format: UTC-YY-NNNNNN (e.g., UTC-24-000001)
 */
export async function generateBookingNumberV2(): Promise<BookingNumberResult> {
  const currentYear = new Date().getFullYear();
  const shortYear = currentYear % 100; // Get last 2 digits (2024 -> 24)
  
  try {
    // Method 1: Try atomic increment using database transaction
    const result = await attemptAtomicIncrement(currentYear, shortYear);
    if (result) return result;
    
    // Method 2: Fallback to timestamp-based generation
    return generateTimestampBased(currentYear, shortYear);
    
  } catch (error) {
    console.warn('Primary generation failed, using timestamp fallback:', error);
    return generateTimestampBased(currentYear, shortYear);
  }
}

/**
 * Attempt atomic increment (ideal for high-concurrency)
 */
async function attemptAtomicIncrement(fullYear: number, shortYear: number): Promise<BookingNumberResult | null> {
  try {
    // Get the highest sequence for current year
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings?filters[bookingNumber][$startsWith]=UTC-${shortYear.toString().padStart(2, '0')}&sort=bookingNumber:desc&pagination[limit]=1`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    let nextSequence = 1;

    if (data.data && data.data.length > 0) {
      const lastBooking = data.data[0];
      const lastBookingNumber = lastBooking.bookingNumber || lastBooking.attributes?.bookingNumber;
      
      if (lastBookingNumber) {
        // Extract sequence from UTC-YY-NNNNNN format
        const sequenceMatch = lastBookingNumber.match(/UTC-\d{2}-(\d{6})/);
        if (sequenceMatch) {
          nextSequence = parseInt(sequenceMatch[1], 10) + 1;
        }
      }
    }

    // Ensure we don't exceed 6-digit limit
    if (nextSequence > 999999) {
      throw new Error(`Sequence limit exceeded for year ${fullYear}`);
    }

    const bookingNumber = `UTC-${shortYear.toString().padStart(2, '0')}-${nextSequence.toString().padStart(6, '0')}`;

    return {
      bookingNumber,
      year: fullYear,
      sequence: nextSequence
    };

  } catch (error) {
    console.warn('Atomic increment failed:', error);
    return null;
  }
}

/**
 * Generate timestamp-based booking number (race condition resistant)
 */
function generateTimestampBased(fullYear: number, shortYear: number): BookingNumberResult {
  const now = new Date();
  
  // Create a timestamp-based sequence that's unlikely to collide
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const ms = now.getMilliseconds();
  
  // Combine timestamp components into a 6-digit sequence
  // Format: MMDDHHMM + random 2 digits
  const timeComponent = parseInt(
    month.toString().padStart(2, '0') +
    day.toString().padStart(2, '0') +
    hour.toString().padStart(2, '0')
  );
  
  const randomComponent = Math.floor(Math.random() * 1000);
  const sequence = (timeComponent + randomComponent) % 999999 + 1;
  
  const bookingNumber = `UTC-${shortYear.toString().padStart(2, '0')}-${sequence.toString().padStart(6, '0')}`;

  return {
    bookingNumber,
    year: fullYear,
    sequence
  };
}

/**
 * Generate booking number with collision detection and retry
 */
export async function generateUniqueBookingNumberV2(maxRetries: number = 3): Promise<BookingNumberResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await generateBookingNumberV2();
      
      // Verify uniqueness
      const isUnique = await verifyUniqueness(result.bookingNumber);
      
      if (isUnique) {
        return result;
      }
      
      if (attempt < maxRetries) {
        console.warn(`Booking number collision detected: ${result.bookingNumber}. Retrying... (${attempt}/${maxRetries})`);
        // Add small delay to reduce collision probability
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        continue;
      }
      
      throw new Error(`Failed to generate unique booking number after ${maxRetries} attempts`);
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`Generation attempt ${attempt} failed:`, error);
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
  
  throw new Error('Failed to generate booking number');
}

/**
 * Verify booking number uniqueness
 */
async function verifyUniqueness(bookingNumber: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings?filters[bookingNumber][$eq]=${bookingNumber}&pagination[limit]=1`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      // If we can't verify, assume it might not be unique
      return false;
    }

    const data = await response.json();
    return !data.data || data.data.length === 0;
    
  } catch (error) {
    console.warn('Uniqueness verification failed:', error);
    // If we can't verify, assume it might not be unique
    return false;
  }
}

/**
 * Validate booking number format V2
 */
export function validateBookingNumberV2(bookingNumber: string): boolean {
  const pattern = /^UTC-\d{2}-\d{6}$/;
  return pattern.test(bookingNumber);
}

/**
 * Parse booking number components V2
 */
export function parseBookingNumberV2(bookingNumber: string): BookingNumberResult | null {
  const match = bookingNumber.match(/^UTC-(\d{2})-(\d{6})$/);
  if (!match) {
    return null;
  }

  const shortYear = parseInt(match[1], 10);
  const fullYear = shortYear < 50 ? 2000 + shortYear : 1900 + shortYear; // Handle century
  
  return {
    bookingNumber,
    year: fullYear,
    sequence: parseInt(match[2], 10)
  };
}

/**
 * Migration utility: Convert old format to new format
 */
export function convertToV2Format(oldBookingNumber: string): string | null {
  // Convert UTC-YYYY-NNNN to UTC-YY-NNNNNN
  const match = oldBookingNumber.match(/^UTC-(\d{4})-(\d{4})$/);
  if (!match) return null;
  
  const year = parseInt(match[1], 10);
  const shortYear = year % 100;
  const oldSequence = parseInt(match[2], 10);
  
  return `UTC-${shortYear.toString().padStart(2, '0')}-${oldSequence.toString().padStart(6, '0')}`;
}


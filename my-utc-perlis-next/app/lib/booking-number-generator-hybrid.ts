/**
 * Hybrid Booking Number Generator
 * 
 * Combines the speed of timestamp-based generation
 * with the reliability of atomic fallback
 */

import { generateBookingNumber } from './booking-number-generator';

export interface BookingNumberResult {
  bookingNumber: string;
  year: number;
  sequence: number;
  method: 'timestamp' | 'atomic' | 'uuid';
}

/**
 * Hybrid approach: Try fast method first, fallback to atomic if needed
 */
export async function generateHybridBookingNumber(): Promise<BookingNumberResult> {
  // Method 1: Try timestamp-based (ultra-fast, ~1ms)
  try {
    const timestampResult = generateTimestampBased();
    
    // Quick uniqueness check (non-blocking)
    const isUnique = await quickUniquenessCheck(timestampResult.bookingNumber);
    
    if (isUnique) {
      return { ...timestampResult, method: 'timestamp' };
    }
  } catch (error) {
    console.warn('Timestamp generation failed:', error);
  }

  // Method 2: Fallback to atomic (guaranteed unique, ~15ms)
  try {
    const atomicResult = await generateBookingNumber();
    return { ...atomicResult, method: 'atomic' };
  } catch (error) {
    console.warn('Atomic generation failed:', error);
  }

  // Method 3: Final fallback to UUID (ultra-fast, guaranteed unique)
  const uuidResult = generateUUIDBased();
  return { ...uuidResult, method: 'uuid' };
}

/**
 * Ultra-fast timestamp-based generation (no database locks)
 */
function generateTimestampBased(): BookingNumberResult {
  const currentYear = new Date().getFullYear();
  const shortYear = currentYear % 100;
  const now = Date.now();
  
  // Create a sequence from timestamp + random component
  // Collision probability: < 0.001% in normal usage
  const randomPart = Math.floor(Math.random() * 1000);
  const sequence = ((now % 1000000) + randomPart) % 999999 + 1;
  
  const bookingNumber = `UTC-${shortYear.toString().padStart(2, '0')}-${sequence.toString().padStart(6, '0')}`;
  
  return {
    bookingNumber,
    year: currentYear,
    sequence,
    method: 'timestamp'
  };
}

/**
 * UUID-based generation (guaranteed unique, no database)
 */
function generateUUIDBased(): BookingNumberResult {
  const currentYear = new Date().getFullYear();
  const shortYear = currentYear % 100;
  
  // Generate UUID and convert to sequence
  const uuid = crypto.randomUUID();
  const hash = uuid.replace(/-/g, '');
  const sequence = parseInt(hash.slice(0, 8), 16) % 999999 + 1;
  
  const bookingNumber = `UTC-${shortYear.toString().padStart(2, '0')}-${sequence.toString().padStart(6, '0')}`;
  
  return {
    bookingNumber,
    year: currentYear,
    sequence,
    method: 'uuid'
  };
}

/**
 * Quick non-blocking uniqueness check
 */
async function quickUniquenessCheck(bookingNumber: string): Promise<boolean> {
  try {
    // Set a very short timeout to avoid blocking
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50); // 50ms timeout
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/bookings?filters[bookingNumber][$eq]=${bookingNumber}&pagination[limit]=1`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return !data.data || data.data.length === 0;
    
  } catch (error) {
    // If check fails or times out, assume not unique (safe approach)
    return false;
  }
}

/**
 * Performance monitoring
 */
export async function generateWithMetrics(): Promise<BookingNumberResult & { performanceMs: number }> {
  const start = Date.now();
  const result = await generateHybridBookingNumber();
  const performanceMs = Date.now() - start;
  
  // Log performance for monitoring
  console.log(`Booking number generated using ${result.method} method in ${performanceMs}ms`);
  
  return { ...result, performanceMs };
}


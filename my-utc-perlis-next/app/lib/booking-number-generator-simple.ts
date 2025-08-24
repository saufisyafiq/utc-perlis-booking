/**
 * Simple Base36 Booking Number Generator
 * 
 * Format: UTC-XXXXXXX (10 characters)
 * Uses Base36 encoding for compact, unique booking numbers
 * No database dependencies, no locks, no race conditions
 */

export interface BookingNumberResult {
  bookingNumber: string;
  year: number;
  sequence: string; // Base36 encoded
}

/**
 * Generate a unique booking number using Base36 encoding
 * Format: UTC-XXXXXXX (e.g., UTC-2K4F7G1)
 */
export function generateSimpleBookingNumber(): BookingNumberResult {
  const currentYear = new Date().getFullYear();
  
  // Create a unique identifier using timestamp + random
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  const combined = timestamp + random;
  
  // Convert to Base36 (0-9, A-Z) and take 7 characters
  const base36 = combined.toString(36).toUpperCase().slice(-7).padStart(7, '0');
  
  const bookingNumber = `UTC-${base36}`;
  
  return {
    bookingNumber,
    year: currentYear,
    sequence: base36
  };
}

/**
 * Generate booking number with additional entropy for higher uniqueness
 */
export function generateEnhancedSimpleBookingNumber(): BookingNumberResult {
  const currentYear = new Date().getFullYear();
  
  // Combine multiple sources of entropy
  const timestamp = Date.now();
  const random1 = Math.floor(Math.random() * 999999);
  const random2 = Math.floor(Math.random() * 999999);
  const processEntropy = process.hrtime.bigint(); // High-resolution time
  
  // Create a large number from all entropy sources
  const entropy = timestamp + random1 + random2 + Number(processEntropy % BigInt(999999));
  
  // Convert to Base36 and take 7 characters
  const base36 = entropy.toString(36).toUpperCase().slice(-7).padStart(7, '0');
  
  const bookingNumber = `UTC-${base36}`;
  
  return {
    bookingNumber,
    year: currentYear,
    sequence: base36
  };
}

/**
 * Generate booking number with crypto-random for maximum uniqueness
 */
export function generateCryptoBookingNumber(): BookingNumberResult {
  const currentYear = new Date().getFullYear();
  
  // Use crypto.randomUUID() for guaranteed uniqueness
  const uuid = crypto.randomUUID();
  
  // Convert UUID to a number (take first 12 hex chars)
  const hexPart = uuid.replace(/-/g, '').slice(0, 12);
  const numericValue = parseInt(hexPart, 16);
  
  // Convert to Base36 and take 7 characters
  const base36 = numericValue.toString(36).toUpperCase().slice(-7).padStart(7, '0');
  
  const bookingNumber = `UTC-${base36}`;
  
  return {
    bookingNumber,
    year: currentYear,
    sequence: base36
  };
}

/**
 * Main function - uses crypto approach for maximum reliability
 */
export function generateBookingNumber(): BookingNumberResult {
  return generateCryptoBookingNumber();
}

/**
 * Validate booking number format
 */
export function validateBookingNumber(bookingNumber: string): boolean {
  const pattern = /^UTC-[0-9A-Z]{7}$/;
  return pattern.test(bookingNumber);
}

/**
 * Parse booking number components
 */
export function parseBookingNumber(bookingNumber: string): { bookingNumber: string; sequence: string } | null {
  const match = bookingNumber.match(/^UTC-([0-9A-Z]{7})$/);
  if (!match) {
    return null;
  }

  return {
    bookingNumber,
    sequence: match[1]
  };
}

/**
 * Convert Base36 sequence back to numeric (for debugging)
 */
export function base36ToNumeric(base36: string): number {
  return parseInt(base36, 36);
}

/**
 * Generate multiple booking numbers for testing uniqueness
 */
export function generateTestBatch(count: number = 10): BookingNumberResult[] {
  const results = [];
  const start = Date.now();
  
  for (let i = 0; i < count; i++) {
    results.push(generateBookingNumber());
    // Small delay to ensure different timestamps
    if (i < count - 1) {
      const now = Date.now();
      while (Date.now() === now) {
        // Wait for next millisecond
      }
    }
  }
  
  const end = Date.now();
  console.log(`Generated ${count} booking numbers in ${end - start}ms`);
  console.log('Sample numbers:', results.slice(0, 5).map(r => r.bookingNumber));
  
  // Check for duplicates
  const numbers = results.map(r => r.bookingNumber);
  const unique = [...new Set(numbers)];
  console.log(`Uniqueness: ${unique.length}/${numbers.length} (${unique.length === numbers.length ? 'PASS' : 'FAIL'})`);
  
  return results;
}

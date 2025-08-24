import { format, isToday, isBefore, isAfter, startOfDay, parseISO, isValid, addMinutes } from 'date-fns';

export interface BookingValidationResult {
  isValid: boolean;
  error?: string;
  conflicts?: ConflictDetails[];
}

export interface ConflictDetails {
  conflictStart: string;
  conflictEnd: string;
  reason: string;
}

export interface BookedSlot {
  startTime: string; // "HH:MM" format
  endTime: string;   // "HH:MM" format
  bookingId?: string;
  eventName?: string;
}

export interface BookingRequest {
  startDate: string;   // "YYYY-MM-DD" format
  endDate: string;     // "YYYY-MM-DD" format
  startTime: string;   // "HH:MM" format
  endTime: string;     // "HH:MM" format
  attendance: number;
  facilityCapacity: number;
}

export interface PricingResult {
  totalPrice: number;
  breakdown: {
    basePrice: number;
    duration: number; // in hours
    packageType: 'PER_JAM' | 'SEPARUH_HARI' | 'SEHARI' | 'MULTI_DAY';
    dailyRate?: number;
    equipmentCost?: number;
  };
}

export class SimpleBookingLogic {
  // Configuration constants
  private static readonly OPERATING_START_HOUR = 8;  // 8:00 AM
  private static readonly OPERATING_END_HOUR = 22;   // 10:00 PM
  private static readonly MINIMUM_BOOKING_HOURS = 2; // 2 hours minimum
  private static readonly CURRENT_TIME_BUFFER = 30;  // 30 minutes buffer

  /**
   * Validate a booking request
   */
  static validateBooking(request: BookingRequest, existingBookings: BookedSlot[] = []): BookingValidationResult {
    const errors: string[] = [];
    const conflicts: ConflictDetails[] = [];

    // 1. Basic validation
    const basicValidation = this.validateBasicRequirements(request);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // 2. Time validation
    const timeValidation = this.validateTimeRange(request);
    if (!timeValidation.isValid) {
      return timeValidation;
    }

    // 3. Current time validation (if booking for today)
    const currentTimeValidation = this.validateCurrentTime(request);
    if (!currentTimeValidation.isValid) {
      return currentTimeValidation;
    }

    // 4. Check for conflicts with existing bookings
    const conflictValidation = this.validateConflicts(request, existingBookings);
    if (!conflictValidation.isValid) {
      return conflictValidation;
    }

    return { isValid: true };
  }

  /**
   * Calculate pricing for a booking
   */
  static calculatePricing(
    request: BookingRequest,
    rates: { hourlyRate: number; halfDayRate: number; fullDayRate: number },
    equipmentCost: number = 0
  ): PricingResult {
    const duration = this.calculateDuration(request);
    const isMultiDay = request.startDate !== request.endDate;
    
    let basePrice = 0;
    let packageType: 'PER_JAM' | 'SEPARUH_HARI' | 'SEHARI' | 'MULTI_DAY' = 'PER_JAM';

    if (isMultiDay) {
      // Multi-day booking
      const days = this.calculateDays(request.startDate, request.endDate);
      basePrice = days * rates.fullDayRate;
      packageType = 'MULTI_DAY';
    } else {
      // Single day booking - choose the best pricing
      const hourlyPrice = duration * rates.hourlyRate;
      const halfDayPrice = rates.halfDayRate;
      const fullDayPrice = rates.fullDayRate;

      if (duration >= 14) {
        // Full day (14 hours = 8am-10pm)
        basePrice = Math.min(hourlyPrice, fullDayPrice);
        packageType = 'SEHARI';
      } else if (duration >= 6) {
        // Half day
        basePrice = Math.min(hourlyPrice, halfDayPrice);
        packageType = 'SEPARUH_HARI';
      } else {
        // Hourly
        basePrice = hourlyPrice;
        packageType = 'PER_JAM';
      }
    }

    return {
      totalPrice: basePrice + equipmentCost,
      breakdown: {
        basePrice,
        duration,
        packageType,
        equipmentCost
      }
    };
  }

  /**
   * Get available time ranges for a specific date
   */
  static getAvailableTimeRanges(date: string, existingBookings: BookedSlot[]): Array<{start: string, end: string}> {
    const operatingStart = this.OPERATING_START_HOUR;
    const operatingEnd = this.OPERATING_END_HOUR;
    
    // Start with full operating hours
    const availableRanges: Array<{start: string, end: string}> = [];
    
    // Sort existing bookings by start time
    const sortedBookings = existingBookings
      .filter(booking => this.isToday(date) ? this.isValidForCurrentTime(booking.startTime) : true)
      .sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));

    let currentStart = operatingStart;
    
    for (const booking of sortedBookings) {
      const bookingStart = this.timeToMinutes(booking.startTime) / 60;
      const bookingEnd = this.timeToMinutes(booking.endTime) / 60;
      
      // If there's a gap before this booking, add it as available
      if (currentStart < bookingStart) {
        availableRanges.push({
          start: `${currentStart.toString().padStart(2, '0')}:00`,
          end: `${Math.floor(bookingStart).toString().padStart(2, '0')}:00`
        });
      }
      
      // Move current start to after this booking
      currentStart = Math.max(currentStart, bookingEnd);
    }
    
    // Add remaining time after last booking
    if (currentStart < operatingEnd) {
      availableRanges.push({
        start: `${currentStart.toString().padStart(2, '0')}:00`,
        end: `${operatingEnd.toString().padStart(2, '0')}:00`
      });
    }
    
    return availableRanges;
  }

  /**
   * Private validation methods
   */
  private static validateBasicRequirements(request: BookingRequest): BookingValidationResult {
    // Date validation
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    
    if (!isValid(startDate) || !isValid(endDate)) {
      return { isValid: false, error: 'Format tarikh tidak sah' };
    }

    // Cannot book past dates
    if (isBefore(startDate, startOfDay(new Date()))) {
      return { isValid: false, error: 'Tidak boleh membuat tempahan untuk tarikh yang telah lalu' };
    }

    // End date must be same or after start date
    if (isBefore(endDate, startDate)) {
      return { isValid: false, error: 'Tarikh tamat mestilah selepas atau sama dengan tarikh mula' };
    }

    // Attendance validation
    if (request.attendance < 1) {
      return { isValid: false, error: 'Bilangan kehadiran mestilah sekurang-kurangnya 1' };
    }

    if (request.attendance > request.facilityCapacity) {
      return { 
        isValid: false, 
        error: `Bilangan kehadiran (${request.attendance}) melebihi kapasiti fasiliti (${request.facilityCapacity})` 
      };
    }

    return { isValid: true };
  }

  private static validateTimeRange(request: BookingRequest): BookingValidationResult {
    const startMinutes = this.timeToMinutes(request.startTime);
    const endMinutes = this.timeToMinutes(request.endTime);
    
    // Basic time format validation
    if (startMinutes === -1 || endMinutes === -1) {
      return { isValid: false, error: 'Format masa tidak sah' };
    }

    // Check operating hours
    const operatingStartMinutes = this.OPERATING_START_HOUR * 60;
    const operatingEndMinutes = this.OPERATING_END_HOUR * 60;
    
    if (startMinutes < operatingStartMinutes || endMinutes > operatingEndMinutes) {
      return { 
        isValid: false, 
        error: `Masa operasi adalah dari ${this.OPERATING_START_HOUR}:00 hingga ${this.OPERATING_END_HOUR}:00` 
      };
    }

    // End time must be after start time
    if (endMinutes <= startMinutes) {
      return { isValid: false, error: 'Masa tamat mestilah selepas masa mula' };
    }

    // Check minimum duration
    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes < this.MINIMUM_BOOKING_HOURS * 60) {
      return { 
        isValid: false, 
        error: `Tempoh minimum adalah ${this.MINIMUM_BOOKING_HOURS} jam` 
      };
    }

    return { isValid: true };
  }

  private static validateCurrentTime(request: BookingRequest): BookingValidationResult {
    const now = new Date();
    const requestDate = new Date(request.startDate);
    const today = startOfDay(now);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Must book at least 1 day before
    if (requestDate < tomorrow) {
      return { 
        isValid: false, 
        error: 'Tempahan mesti dibuat sekurang-kurangnya 1 hari sebelum tarikh tempahan' 
      };
    }

    return { isValid: true };
  }

  private static validateConflicts(request: BookingRequest, existingBookings: BookedSlot[]): BookingValidationResult {
    const requestStart = this.timeToMinutes(request.startTime);
    const requestEnd = this.timeToMinutes(request.endTime);
    
    const conflicts: ConflictDetails[] = [];
    
    for (const booking of existingBookings) {
      const bookingStart = this.timeToMinutes(booking.startTime);
      const bookingEnd = this.timeToMinutes(booking.endTime);
      
      // Check if there's any overlap
      if (requestStart < bookingEnd && requestEnd > bookingStart) {
        conflicts.push({
          conflictStart: booking.startTime,
          conflictEnd: booking.endTime,
          reason: booking.eventName ? `Bertindih dengan acara: ${booking.eventName}` : 'Bertindih dengan tempahan sedia ada'
        });
      }
    }
    
    if (conflicts.length > 0) {
      return {
        isValid: false,
        error: 'Masa yang dipilih bertindih dengan tempahan sedia ada',
        conflicts
      };
    }

    return { isValid: true };
  }

  /**
   * Helper methods
   */
  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return -1;
    return hours * 60 + minutes;
  }

  private static isToday(dateString: string): boolean {
    return dateString === format(new Date(), 'yyyy-MM-dd');
  }

  private static isValidForCurrentTime(startTime: string): boolean {
    if (!this.isToday(format(new Date(), 'yyyy-MM-dd'))) return true;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const slotMinutes = this.timeToMinutes(startTime);
    
    return slotMinutes > currentMinutes + this.CURRENT_TIME_BUFFER;
  }

  private static calculateDuration(request: BookingRequest): number {
    const startMinutes = this.timeToMinutes(request.startTime);
    const endMinutes = this.timeToMinutes(request.endTime);
    return (endMinutes - startMinutes) / 60;
  }

  private static calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Format time for display
   */
  static formatTime(time: string): string {
    return time;
  }

  /**
   * Format duration for display
   */
  static formatDuration(hours: number): string {
    if (hours < 1) {
      return `${hours * 60} minit`;
    } else if (hours === 1) {
      return '1 jam';
    } else {
      return `${hours} jam`;
    }
  }

  /**
   * Get operating hours display
   */
  static getOperatingHours(): string {
    return `${this.OPERATING_START_HOUR}:00 - ${this.OPERATING_END_HOUR}:00`;
  }
} 
import { format, isToday, isBefore, isAfter, startOfDay, endOfDay, addHours, parseISO, isValid } from 'date-fns';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  displayTime: string;
  reason?: string;
}

export interface BookingValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface AvailabilityCheckParams {
  facilityId: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  packageType?: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY' | 'MULTI_DAY';
  excludeSessionId?: string;
}

export interface BookedTimeSlot {
  startTime: string;
  endTime: string;
}

export class BookingLogic {
  // Operating hours configuration
  private static readonly OPERATING_START_HOUR = 8; // 8:00 AM
  private static readonly OPERATING_END_HOUR = 22; // 10:00 PM
  private static readonly MINIMUM_BOOKING_DURATION = 1; // 1 hour
  private static readonly TIME_BUFFER_MINUTES = 30; // 30 minutes buffer for current time

  /**
   * Check if a date is valid for booking
   */
  static isValidBookingDate(date: Date): BookingValidationResult {
    const now = new Date();
    const today = startOfDay(now);
    const selectedDate = startOfDay(date);

    // Can't book for past dates
    if (isBefore(selectedDate, today)) {
      return {
        isValid: false,
        error: 'Tidak boleh membuat tempahan untuk tarikh yang telah lalu'
      };
    }

    // Can book for today and future dates
    return { isValid: true };
  }

  /**
   * Check if a time slot is valid for booking on a specific date
   */
  static isValidTimeSlot(date: Date, startTime: string, endTime: string): BookingValidationResult {
    const now = new Date();
    
    // Basic time format validation
    if (!this.isValidTimeFormat(startTime) || !this.isValidTimeFormat(endTime)) {
      return {
        isValid: false,
        error: 'Format masa tidak sah'
      };
    }

    // Check operating hours
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    const endMinutes = parseInt(endTime.split(':')[1]);
    
    if (startHour < this.OPERATING_START_HOUR || 
        (endHour > this.OPERATING_END_HOUR) || 
        (endHour === this.OPERATING_END_HOUR && endMinutes > 0)) {
      return {
        isValid: false,
        error: `Masa operasi adalah dari ${this.OPERATING_START_HOUR}:00 hingga ${this.OPERATING_END_HOUR}:00`
      };
    }

    // Check if end time is after start time
    if (this.timeToMinutes(endTime) <= this.timeToMinutes(startTime)) {
      return {
        isValid: false,
        error: 'Masa tamat mestilah selepas masa mula'
      };
    }

    // Check minimum duration
    const durationMinutes = this.timeToMinutes(endTime) - this.timeToMinutes(startTime);
    if (durationMinutes < this.MINIMUM_BOOKING_DURATION * 60) {
      return {
        isValid: false,
        error: `Tempoh minimum adalah ${this.MINIMUM_BOOKING_DURATION} jam`
      };
    }

    // For today's date, check if time slot has already passed
    if (isToday(date)) {
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const slotStartTime = this.timeToMinutes(startTime);
      
      // Add buffer time to prevent booking slots that are too close to current time
      if (slotStartTime <= currentTime + this.TIME_BUFFER_MINUTES) {
        return {
          isValid: false,
          error: 'Slot masa ini telah berlalu atau terlalu dekat dengan masa sekarang'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Generate available time slots for a specific date
   */
  static generateAvailableTimeSlots(
    date: Date, 
    bookedSlots: BookedTimeSlot[] = [],
    packageType: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY' | 'MULTI_DAY' = 'HOURLY'
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const now = new Date();
    const isCurrentDay = isToday(date);

    // For full day bookings, only show full day option
    if (packageType === 'FULL_DAY') {
      const startTime = `${this.OPERATING_START_HOUR.toString().padStart(2, '0')}:00`;
      const endTime = `${this.OPERATING_END_HOUR.toString().padStart(2, '0')}:00`;
      
      const validation = this.isValidTimeSlot(date, startTime, endTime);
      const hasConflict = this.hasTimeConflict(startTime, endTime, bookedSlots);
      
      slots.push({
        startTime,
        endTime,
        available: validation.isValid && !hasConflict,
        displayTime: `${this.OPERATING_START_HOUR}:00 - ${this.OPERATING_END_HOUR}:00 (Sehari Penuh)`,
        reason: hasConflict ? 'Slot sudah ditempah' : validation.error
      });
      
      return slots;
    }

    // For half day bookings
    if (packageType === 'HALF_DAY') {
      const morningStart = `${this.OPERATING_START_HOUR.toString().padStart(2, '0')}:00`;
      const morningEnd = '14:00';
      const afternoonStart = '14:00';
      const afternoonEnd = `${this.OPERATING_END_HOUR.toString().padStart(2, '0')}:00`;

      // Morning slot
      const morningValidation = this.isValidTimeSlot(date, morningStart, morningEnd);
      const morningConflict = this.hasTimeConflict(morningStart, morningEnd, bookedSlots);
      
      slots.push({
        startTime: morningStart,
        endTime: morningEnd,
        available: morningValidation.isValid && !morningConflict,
        displayTime: `${this.OPERATING_START_HOUR}:00 - 14:00 (Separuh Hari Pagi)`,
        reason: morningConflict ? 'Slot sudah ditempah' : morningValidation.error
      });

      // Afternoon slot
      const afternoonValidation = this.isValidTimeSlot(date, afternoonStart, afternoonEnd);
      const afternoonConflict = this.hasTimeConflict(afternoonStart, afternoonEnd, bookedSlots);
      
      slots.push({
        startTime: afternoonStart,
        endTime: afternoonEnd,
        available: afternoonValidation.isValid && !afternoonConflict,
        displayTime: `14:00 - ${this.OPERATING_END_HOUR}:00 (Separuh Hari Petang)`,
        reason: afternoonConflict ? 'Slot sudah ditempah' : afternoonValidation.error
      });

      return slots;
    }

    // For hourly bookings, generate hourly slots
    for (let hour = this.OPERATING_START_HOUR; hour < this.OPERATING_END_HOUR; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      const validation = this.isValidTimeSlot(date, startTime, endTime);
      const hasConflict = this.hasTimeConflict(startTime, endTime, bookedSlots);
      
      // Additional check for current day - skip slots that have passed
      let available = validation.isValid && !hasConflict;
      let reason = hasConflict ? 'Slot sudah ditempah' : validation.error;
      
      if (isCurrentDay) {
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const slotStartTime = hour * 60;
        
        if (slotStartTime <= currentTime + this.TIME_BUFFER_MINUTES) {
          available = false;
          reason = 'Slot masa telah berlalu';
        }
      }

      slots.push({
        startTime,
        endTime,
        available,
        displayTime: `${hour}:00 - ${hour + 1}:00`,
        reason
      });
    }

    return slots;
  }

  /**
   * Check if there's a time conflict with existing bookings
   */
  static hasTimeConflict(startTime: string, endTime: string, bookedSlots: BookedTimeSlot[]): boolean {
    const requestStart = this.timeToMinutes(startTime);
    const requestEnd = this.timeToMinutes(endTime);

    return bookedSlots.some(slot => {
      const bookedStart = this.timeToMinutes(slot.startTime);
      const bookedEnd = this.timeToMinutes(slot.endTime);
      
      // Check if time ranges overlap
      return requestStart < bookedEnd && requestEnd > bookedStart;
    });
  }

  /**
   * Get package type boundaries for a specific date
   */
  static getPackageTimeBoundaries(packageType: string, date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    switch (packageType) {
      case 'FULL_DAY':
        return {
          type: 'single' as const,
          data: {
            startTime: `${this.OPERATING_START_HOUR.toString().padStart(2, '0')}:00:00.000`,
            endTime: `${this.OPERATING_END_HOUR.toString().padStart(2, '0')}:00:00.000`,
            startDate: dateStr,
            endDate: dateStr
          }
        };
      case 'HALF_DAY':
        return {
          type: 'options' as const,
          data: [
            {
              startTime: `${this.OPERATING_START_HOUR.toString().padStart(2, '0')}:00:00.000`,
              endTime: '14:00:00.000',
              startDate: dateStr,
              endDate: dateStr,
              name: 'Morning'
            },
            {
              startTime: '14:00:00.000',
              endTime: `${this.OPERATING_END_HOUR.toString().padStart(2, '0')}:00:00.000`,
              startDate: dateStr,
              endDate: dateStr,
              name: 'Afternoon'
            }
          ]
        };
      default:
        return null;
    }
  }

  /**
   * Validate a complete booking request
   */
  static validateBookingRequest(data: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    attendance: number;
    facilityCapacity: number;
    packageType: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY' | 'MULTI_DAY';
  }): BookingValidationResult {
    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (!isValid(startDate) || !isValid(endDate)) {
      return {
        isValid: false,
        error: 'Format tarikh tidak sah'
      };
    }

    // Check if start date is valid
    const startDateValidation = this.isValidBookingDate(startDate);
    if (!startDateValidation.isValid) {
      return startDateValidation;
    }

    // Check if end date is after start date
    if (isBefore(endDate, startDate)) {
      return {
        isValid: false,
        error: 'Tarikh tamat mestilah selepas atau sama dengan tarikh mula'
      };
    }

    // For single day bookings, validate time slots
    if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
      const timeValidation = this.isValidTimeSlot(startDate, data.startTime, data.endTime);
      if (!timeValidation.isValid) {
        return timeValidation;
      }
    }

    // Validate attendance
    if (data.attendance < 1) {
      return {
        isValid: false,
        error: 'Bilangan kehadiran mestilah sekurang-kurangnya 1'
      };
    }

    if (data.attendance > data.facilityCapacity) {
      return {
        isValid: false,
        error: `Bilangan kehadiran (${data.attendance}) melebihi kapasiti fasiliti (${data.facilityCapacity})`
      };
    }

    return { isValid: true };
  }

  /**
   * Get next available time slot
   */
  static getNextAvailableSlot(
    date: Date, 
    bookedSlots: BookedTimeSlot[] = [],
    durationHours: number = 1
  ): TimeSlot | null {
    const slots = this.generateAvailableTimeSlots(date, bookedSlots, 'HOURLY');
    
    for (let i = 0; i <= slots.length - durationHours; i++) {
      const consecutiveSlots = slots.slice(i, i + durationHours);
      
      // Check if all consecutive slots are available
      if (consecutiveSlots.every(slot => slot.available)) {
        return {
          startTime: consecutiveSlots[0].startTime,
          endTime: consecutiveSlots[consecutiveSlots.length - 1].endTime,
          available: true,
          displayTime: `${consecutiveSlots[0].startTime} - ${consecutiveSlots[consecutiveSlots.length - 1].endTime}`
        };
      }
    }

    return null;
  }

  /**
   * Helper method to convert time string to minutes
   */
  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper method to validate time format
   */
  private static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Get current time in HH:MM format
   */
  static getCurrentTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Check if current time is within operating hours
   */
  static isWithinOperatingHours(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    return currentHour >= this.OPERATING_START_HOUR && currentHour < this.OPERATING_END_HOUR;
  }

  /**
   * Get formatted operating hours display
   */
  static getOperatingHoursDisplay(): string {
    return `${this.OPERATING_START_HOUR}:00 - ${this.OPERATING_END_HOUR}:00`;
  }
} 
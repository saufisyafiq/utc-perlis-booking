/**
 * Sport Pricing Logic
 * Handles day/night rate pricing for sport facilities
 */

export interface SportRates {
  dayRate?: number;    // 8am-7pm
  nightRate?: number;  // 8pm-12am
  // Fallback compatibility with regular rates
  hourlyRate?: number;
  halfDayRate?: number;
  fullDayRate?: number;
}

export interface SportBookingRequest {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

export interface SportPricingResult {
  totalPrice: number;
  breakdown: {
    dayHours: number;
    nightHours: number;
    dayPrice: number;
    nightPrice: number;
    totalHours: number;
    rateBreakdown: string;
  };
}

export class SportPricingLogic {
  // Time boundaries
  private static readonly DAY_START_HOUR = 8;   // 8:00 AM
  private static readonly DAY_END_HOUR = 19;    // 7:00 PM  
  private static readonly NIGHT_START_HOUR = 20; // 8:00 PM
  private static readonly NIGHT_END_HOUR = 24;   // 12:00 AM (midnight)

  /**
   * Convert time string to minutes since midnight
   */
  private static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convert minutes since midnight to hour (for boundary checking)
   */
  private static minutesToHour(minutes: number): number {
    return Math.floor(minutes / 60);
  }

  /**
   * Check if a time falls within day rate hours (8am-7pm)
   */
  private static isDayTime(hour: number): boolean {
    return hour >= this.DAY_START_HOUR && hour < this.DAY_END_HOUR;
  }

  /**
   * Check if a time falls within night rate hours (8pm-12am)
   */
  private static isNightTime(hour: number): boolean {
    return hour >= this.NIGHT_START_HOUR && hour < this.NIGHT_END_HOUR;
  }

  /**
   * Calculate day and night hours for a booking
   */
  private static calculateDayNightHours(startTime: string, endTime: string): {
    dayHours: number;
    nightHours: number;
    totalHours: number;
  } {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    
    let dayHours = 0;
    let nightHours = 0;
    
    // Calculate hour by hour
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
      const hour = this.minutesToHour(minutes);
      
      if (this.isDayTime(hour)) {
        dayHours++;
      } else if (this.isNightTime(hour)) {
        nightHours++;
      }
      // Hours outside both day and night (7pm-8pm) are not bookable for sports
    }
    
    return {
      dayHours,
      nightHours,
      totalHours: dayHours + nightHours
    };
  }

  /**
   * Validate if booking time is within allowed sport facility hours
   */
  static validateSportBookingTime(startTime: string, endTime: string): {
    isValid: boolean;
    error?: string;
  } {
    const startHour = this.minutesToHour(this.timeToMinutes(startTime));
    const endHour = this.minutesToHour(this.timeToMinutes(endTime));
    
    // Check if start time is within allowed hours
    if (!this.isDayTime(startHour) && !this.isNightTime(startHour)) {
      return {
        isValid: false,
        error: 'Masa mula mestilah dalam waktu operasi (8am-7pm atau 8pm-12am)'
      };
    }
    
    // Check if end time is within allowed hours  
    if (!this.isDayTime(endHour) && !this.isNightTime(endHour) && endHour !== 0) {
      return {
        isValid: false,
        error: 'Masa tamat mestilah dalam waktu operasi (8am-7pm atau 8pm-12am)'
      };
    }
    
    // Check for minimum 2-hour booking
    const { totalHours } = this.calculateDayNightHours(startTime, endTime);
    if (totalHours < 2) {
      return {
        isValid: false,
        error: 'Tempahan minimum adalah 2 jam'
      };
    }
    
    return { isValid: true };
  }

  /**
   * Calculate pricing for sport facility booking with day/night rates
   */
  static calculateSportPricing(
    request: SportBookingRequest,
    rates: SportRates
  ): SportPricingResult {
    // Only support single-day bookings for sports
    if (request.startDate !== request.endDate) {
      throw new Error('Multi-day bookings not supported for sport facilities');
    }

    const { dayHours, nightHours, totalHours } = this.calculateDayNightHours(
      request.startTime,
      request.endTime
    );

    // Use day/night rates if available, fallback to hourly rate
    const dayRate = rates.dayRate || rates.hourlyRate || 50;
    const nightRate = rates.nightRate || rates.hourlyRate || 70;

    const dayPrice = dayHours * dayRate;
    const nightPrice = nightHours * nightRate;
    const totalPrice = dayPrice + nightPrice;

    // Create rate breakdown string
    let rateBreakdown = '';
    if (dayHours > 0 && nightHours > 0) {
      rateBreakdown = `${dayHours} jam (hari) @ RM${dayRate} + ${nightHours} jam (malam) @ RM${nightRate}`;
    } else if (dayHours > 0) {
      rateBreakdown = `${dayHours} jam (hari) @ RM${dayRate}`;
    } else if (nightHours > 0) {
      rateBreakdown = `${nightHours} jam (malam) @ RM${nightRate}`;
    }

    return {
      totalPrice,
      breakdown: {
        dayHours,
        nightHours,
        dayPrice,
        nightPrice,
        totalHours,
        rateBreakdown
      }
    };
  }

  /**
   * Get rate information for display
   */
  static getRateInfo(rates: SportRates): {
    dayRate: number;
    nightRate: number;
    dayTimeRange: string;
    nightTimeRange: string;
  } {
    return {
      dayRate: rates.dayRate || rates.hourlyRate || 50,
      nightRate: rates.nightRate || rates.hourlyRate || 70,
      dayTimeRange: '8:00 AM - 7:00 PM',
      nightTimeRange: '8:00 PM - 12:00 AM'
    };
  }

  /**
   * Check if facility has day/night rates configured
   */
  static hasDayNightRates(rates: SportRates): boolean {
    return !!(rates.dayRate && rates.nightRate);
  }
}




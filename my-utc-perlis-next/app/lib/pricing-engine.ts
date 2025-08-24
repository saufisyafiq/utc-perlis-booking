export interface PricingRates {
  hourlyRate: number;
  halfDayRate: number;
  fullDayRate: number;
}

export interface EquipmentRates {
  [key: string]: number;
}

export interface PricingBreakdownItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: 'FACILITY' | 'EQUIPMENT';
}

export interface OptimalPricingResult {
  totalPrice: number;
  breakdown: PricingBreakdownItem[];
  savings?: number;
}

// Additional types for SmartPricingDisplay component
export interface BookingDay {
  date: string;
  startTime: string;
  endTime: string;
}

export interface PricingOption {
  id: string;
  name: string;
  description: string;
  totalPrice: number;
  breakdown: PricingBreakdownItem[];
  savings?: number;
  isRecommended?: boolean;
}

export interface UpgradeSuggestion {
  message: string;
  fromOption: string;
  toOption: string;
  savings: number;
  currentOption: {
    totalPrice: number;
  };
  suggestedOption: {
    totalPrice: number;
  };
}

export class PricingEngine {
  private rates: PricingRates;
  private equipmentRates: EquipmentRates;
  
  // Fixed package hours as per new requirements
  private readonly HALF_DAY_HOURS = 5;
  private readonly FULL_DAY_HOURS = 8;
  private readonly OPERATION_START_HOUR = 8; // 8 AM
  private readonly OPERATION_END_HOUR = 23; // 11:59 PM (23:59)
  private readonly TOTAL_OPERATION_HOURS = this.OPERATION_END_HOUR - this.OPERATION_START_HOUR + 1; // 16 hours

  constructor(rates: PricingRates, equipmentRates: EquipmentRates = {}) {
    this.rates = rates;
    this.equipmentRates = equipmentRates;
  }

  /**
   * Calculate the optimal pricing for a booking
   */
  calculateOptimalPricing(
    startDate: string,
    endDate: string,
    startTime: string,
    endTime: string,
    selectedEquipment: string[] = []
  ): OptimalPricingResult {
    console.log('🔍 Simplified pricing calculation:', { startDate, endDate, startTime, endTime, selectedEquipment });
    
    const isMultiDay = startDate !== endDate;
    
    if (isMultiDay) {
      return this.calculateMultiDayPricing(startDate, endDate, startTime, endTime, selectedEquipment);
    } else {
      return this.calculateSingleDayPricing(startTime, endTime, selectedEquipment);
    }
  }

  private calculateSingleDayPricing(startTime: string, endTime: string, selectedEquipment: string[]): OptimalPricingResult {
    const duration = this.calculateHours(startTime, endTime);
    console.log(`📍 Single day booking: ${duration} hours`);
    
    const facilityBreakdown = this.calculateBestFacilityPricing(duration);
    const equipmentBreakdown = this.calculateEquipmentPricing(selectedEquipment);
    
    const facilityTotal = facilityBreakdown.reduce((sum, item) => sum + item.totalPrice, 0);
    const equipmentTotal = equipmentBreakdown.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalPrice = facilityTotal + equipmentTotal;
    
    // Calculate savings compared to pure hourly rate
    const pureHourlyTotal = duration * this.rates.hourlyRate + equipmentTotal;
    const savings = pureHourlyTotal > totalPrice ? pureHourlyTotal - totalPrice : 0;
    
    console.log(`✅ Single day result: RM${totalPrice} (${duration} hours, savings: RM${savings})`);
    
    return {
      totalPrice,
      breakdown: [...facilityBreakdown, ...equipmentBreakdown],
      savings: savings > 0 ? savings : undefined
    };
  }

  private calculateMultiDayPricing(startDate: string, endDate: string, startTime: string, endTime: string, selectedEquipment: string[]): OptimalPricingResult {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`📍 Multi-day booking: ${daysDiff} days`);
    
    // For multi-day bookings, use full day package for each day
    const facilityBreakdown: PricingBreakdownItem[] = [{
      description: `Pakej satu hari (${daysDiff} hari)`,
      quantity: daysDiff,
      unitPrice: this.rates.fullDayRate,
      totalPrice: daysDiff * this.rates.fullDayRate,
      type: 'FACILITY'
    }];
    
    const equipmentBreakdown = this.calculateEquipmentPricing(selectedEquipment, daysDiff);
    
    const facilityTotal = facilityBreakdown.reduce((sum, item) => sum + item.totalPrice, 0);
    const equipmentTotal = equipmentBreakdown.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalPrice = facilityTotal + equipmentTotal;
    
    console.log(`✅ Multi-day result: RM${totalPrice} (${daysDiff} days)`);
    
    return {
      totalPrice,
      breakdown: [...facilityBreakdown, ...equipmentBreakdown]
    };
  }

  private calculateBestFacilityPricing(duration: number): PricingBreakdownItem[] {
    // Simple logic based on new requirements
    if (duration <= this.HALF_DAY_HOURS) {
      // 5 hours or less - could be hourly or half day
      const hourlyPrice = duration * this.rates.hourlyRate;
      const halfDayPrice = this.rates.halfDayRate;
      
      if (halfDayPrice < hourlyPrice) {
        return [{
          description: 'Pakej separuh hari (5 jam)',
          quantity: 1,
          unitPrice: this.rates.halfDayRate,
          totalPrice: this.rates.halfDayRate,
          type: 'FACILITY'
        }];
      } else {
        return [{
          description: 'Kadar per jam',
          quantity: duration,
          unitPrice: this.rates.hourlyRate,
          totalPrice: hourlyPrice,
          type: 'FACILITY'
        }];
      }
    } else if (duration <= this.FULL_DAY_HOURS) {
      // 6-8 hours - could be hourly, half day + hourly, or full day
      const options = [
        { type: 'hourly', price: duration * this.rates.hourlyRate },
        { type: 'half_day_plus', price: this.rates.halfDayRate + ((duration - this.HALF_DAY_HOURS) * this.rates.hourlyRate) },
        { type: 'full_day', price: this.rates.fullDayRate }
      ];
      
      const bestOption = options.reduce((best, current) => current.price < best.price ? current : best);
      
      switch (bestOption.type) {
        case 'hourly':
          return [{
            description: 'Kadar per jam',
            quantity: duration,
            unitPrice: this.rates.hourlyRate,
            totalPrice: bestOption.price,
            type: 'FACILITY'
          }];
        case 'half_day_plus':
          return [
            {
              description: 'Pakej separuh hari (5 jam)',
              quantity: 1,
              unitPrice: this.rates.halfDayRate,
              totalPrice: this.rates.halfDayRate,
              type: 'FACILITY'
            },
            {
              description: 'Jam tambahan',
              quantity: duration - this.HALF_DAY_HOURS,
              unitPrice: this.rates.hourlyRate,
              totalPrice: (duration - this.HALF_DAY_HOURS) * this.rates.hourlyRate,
              type: 'FACILITY'
            }
          ];
        case 'full_day':
          return [{
            description: 'Pakej satu hari (8 jam)',
            quantity: 1,
            unitPrice: this.rates.fullDayRate,
            totalPrice: this.rates.fullDayRate,
            type: 'FACILITY'
          }];
      }
    } else {
      // More than 8 hours - use full day + hourly for remaining hours
      const extraHours = duration - this.FULL_DAY_HOURS;
      return [
        {
          description: 'Pakej satu hari (8 jam)',
          quantity: 1,
          unitPrice: this.rates.fullDayRate,
          totalPrice: this.rates.fullDayRate,
          type: 'FACILITY'
        },
        {
          description: 'Jam tambahan',
          quantity: extraHours,
          unitPrice: this.rates.hourlyRate,
          totalPrice: extraHours * this.rates.hourlyRate,
          type: 'FACILITY'
        }
      ];
    }
    
    // Fallback to hourly
    return [{
      description: 'Kadar per jam',
      quantity: duration,
      unitPrice: this.rates.hourlyRate,
      totalPrice: duration * this.rates.hourlyRate,
      type: 'FACILITY'
    }];
  }

  private calculateEquipmentPricing(selectedEquipment: string[], days: number = 1): PricingBreakdownItem[] {
    return selectedEquipment.map(equipment => {
      const dailyRate = this.equipmentRates[equipment] || 0;
      const totalPrice = dailyRate * days;
      
      return {
        description: days > 1 ? `${equipment} (${days} hari)` : equipment,
        quantity: days,
        unitPrice: dailyRate,
        totalPrice,
        type: 'EQUIPMENT'
      };
    });
  }

  private calculateHours(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return Math.ceil((endMinutes - startMinutes) / 60);
  }
}

// Helper function to create pricing engine with facility data
export function createPricingEngine(facilityData: any): PricingEngine {
  const rates: PricingRates = {
    hourlyRate: facilityData.rates?.hourlyRate || 50,
    halfDayRate: facilityData.rates?.halfDayRate || 250,
    fullDayRate: facilityData.rates?.fullDayRate || 400
  };
  
  const equipmentRates: EquipmentRates = facilityData.equipmentRates || {};
  
  return new PricingEngine(rates, equipmentRates);
} 
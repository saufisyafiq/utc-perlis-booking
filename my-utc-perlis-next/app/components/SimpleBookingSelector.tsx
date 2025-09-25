'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { SimpleBookingLogic, BookingRequest, BookedSlot, PricingResult } from '../lib/simple-booking-logic';

interface SimpleBookingSelectorProps {
  selectedDate: Date;
  existingBookings: BookedSlot[];
  facilityRates: {
    hourlyRate: number;
    halfDayRate: number;
    fullDayRate: number;
  };
  facilityCapacity: number;
  onBookingChange: (booking: BookingRequest & { isValid: boolean; price: number; packageType: string }) => void;
  equipmentCost?: number;
}

export default function SimpleBookingSelector({
  selectedDate,
  existingBookings,
  facilityRates,
  facilityCapacity,
  onBookingChange,
  equipmentCost = 0
}: SimpleBookingSelectorProps) {
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [attendance, setAttendance] = useState(1);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [pricing, setPricing] = useState<PricingResult | null>(null);

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Generate time options (every hour)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 8; hour <= 22; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      options.push(timeString);
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Memoize booking request to prevent object recreation
  const bookingRequest = useMemo(() => ({
    startDate: dateString,
    endDate: dateString,
    startTime,
    endTime,
    attendance,
    facilityCapacity
  }), [dateString, startTime, endTime, attendance, facilityCapacity]);

  // Validate booking when request or existing bookings change
  useEffect(() => {
    const validation = SimpleBookingLogic.validateBooking(bookingRequest, existingBookings);
    setValidationResult(validation);
  }, [bookingRequest, existingBookings]);

  // Calculate pricing when validation changes or rates change
  useEffect(() => {
    if (validationResult?.isValid) {
      try {
        // Use the same accurate pricing engine as Step 2 and Step 4
        const { createPricingEngine } = require('../lib/pricing-engine');
        const pricingEngine = createPricingEngine({
          rates: facilityRates,
          equipmentRates: {} // Equipment handled separately
        });
        
        const result = pricingEngine.calculateOptimalPricing(
          bookingRequest.startDate,
          bookingRequest.endDate,
          bookingRequest.startTime,
          bookingRequest.endTime,
          [] // No equipment in this calculation
        );
        
        // Convert pricing-engine result to SimpleBookingLogic format for compatibility
        const facilityTotal = result.breakdown
          .filter((item: any) => item.type === 'FACILITY')
          .reduce((sum: number, item: any) => sum + item.totalPrice, 0);
        
        // Calculate duration manually
        const timeToMinutes = (time: string): number => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        const duration = Math.ceil((timeToMinutes(bookingRequest.endTime) - timeToMinutes(bookingRequest.startTime)) / 60);
        
        const currentPricing = {
          totalPrice: facilityTotal + equipmentCost,
          breakdown: {
            basePrice: facilityTotal,
            duration: duration,
            packageType: (result.breakdown.length > 1 ? 'SEPARUH_HARI' : 
              (facilityTotal === facilityRates.fullDayRate ? 'SEHARI' : 
               (facilityTotal === facilityRates.halfDayRate ? 'SEPARUH_HARI' : 'PER_JAM'))) as 'PER_JAM' | 'SEPARUH_HARI' | 'SEHARI' | 'MULTI_DAY',
            equipmentCost,
            detailedBreakdown: result.breakdown
              .filter((item: any) => item.type === 'FACILITY')
              .map((item: any) => 
                item.quantity > 1 
                  ? `${item.description}: RM${item.unitPrice} × ${item.quantity} = RM${item.totalPrice}`
                  : `${item.description}: RM${item.totalPrice}`
              ).join(' + '),
            savings: result.savings
          }
        };
        
        setPricing(currentPricing);
      } catch (error) {
        console.error('Error using pricing engine in SimpleBookingSelector:', error);
        // Fallback to original logic
        const currentPricing = SimpleBookingLogic.calculatePricing(bookingRequest, facilityRates, equipmentCost);
        setPricing(currentPricing);
      }
    } else {
      setPricing(null);
    }
  }, [validationResult, bookingRequest, facilityRates, equipmentCost]);

  // Notify parent component when data changes
  useEffect(() => {
    onBookingChange({
      ...bookingRequest,
      isValid: validationResult?.isValid || false,
      price: pricing?.totalPrice || 0,
      packageType: pricing?.breakdown.packageType || 'PER_JAM'
    });
  }, [bookingRequest, validationResult, pricing, onBookingChange]);

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    
    // Auto-adjust end time if it's before start time
    const startHour = parseInt(time.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    
    if (endHour <= startHour) {
      const newEndHour = startHour + 2; // Add 2 hours minimum
      
      if (newEndHour <= 22) {
        setEndTime(`${newEndHour.toString().padStart(2, '0')}:00`);
      }
    }
  };

  const availableRanges = SimpleBookingLogic.getAvailableTimeRanges(dateString, existingBookings);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Tempahan untuk {format(selectedDate, 'dd MMMM yyyy')}
        </h3>

        {/* Operating Hours Display */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">
                Masa Operasi: {SimpleBookingLogic.getOperatingHours()}
              </p>
              <p className="text-xs text-blue-600">
                Tempahan mesti dibuat sekurang-kurangnya 1 hari sebelum tarikh tempahan
              </p>
            </div>
          </div>
        </div>

        {/* Existing Bookings Display */}
        {existingBookings.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="text-sm font-medium text-red-800 mb-2">
              🚫 Masa Yang Telah Ditempah
            </h4>
            <div className="space-y-1">
              {existingBookings.map((booking, index) => (
                <div key={index} className="text-sm text-red-700">
                  {booking.startTime} - {booking.endTime}
                  {booking.eventName && <span className="ml-2 text-red-600">({booking.eventName})</span>}
                </div>
              ))}
            </div>
          </div>
        )}



        {/* Booking Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Masa Mula
              </label>
              <select
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Masa Tamat
              </label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bilangan Kehadiran (Maksimum: {facilityCapacity})
            </label>
            <input
              type="number"
              min="1"
              max={facilityCapacity}
              value={attendance === 0 ? '' : attendance}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string for user to clear input completely
                if (value === '') {
                  setAttendance(0); // Set to 0 temporarily to allow clearing
                } else {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue >= 0) {
                    setAttendance(numValue);
                  }
                }
              }}
              onBlur={(e) => {
                // Ensure valid value on blur - if empty or invalid, set to 1
                const value = parseInt(e.target.value);
                if (isNaN(value) || value < 1) {
                  setAttendance(1);
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Validation Results */}
        {validationResult && !validationResult.isValid && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 13.5c-.77.833-.27 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  Tempahan Tidak Sah
                </p>
                <p className="text-sm text-red-700">
                  {validationResult.error}
                </p>
                {validationResult.conflicts && (
                  <div className="mt-2 text-xs text-red-600">
                    <p className="font-medium">Konflik dengan:</p>
                    {validationResult.conflicts.map((conflict: any, index: number) => (
                      <p key={index}>
                        • {conflict.conflictStart} - {conflict.conflictEnd}: {conflict.reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Display */}
        {validationResult?.isValid && pricing && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-green-800">
                  ✅ Tempahan Sah
                </h4>
                <p className="text-xs text-green-600">
                  {pricing.breakdown.detailedBreakdown || `Tempoh: ${SimpleBookingLogic.formatDuration(pricing.breakdown.duration)} | Pakej: ${pricing.breakdown.packageType}`}
                </p>
                {(pricing.breakdown as any).savings && (pricing.breakdown as any).savings > 0 && (
                  <p className="text-xs text-yellow-600 font-medium mt-1">
                    💰 Jimat: RM{((pricing.breakdown as any).savings).toFixed(2)} (berbanding kadar per jam)
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-700">
                  RM{pricing.totalPrice.toFixed(2)}
                </p>
                <p className="text-xs text-green-600">
                  {pricing.breakdown.equipmentCost && pricing.breakdown.equipmentCost > 0 
                    ? `RM${pricing.breakdown.basePrice.toFixed(2)} + RM${pricing.breakdown.equipmentCost.toFixed(2)}`
                    : `RM${pricing.breakdown.basePrice.toFixed(2)}`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Rules */}
        <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            ⚠️ Peraturan Tempahan
          </h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Tempoh minimum: 2 jam</li>
            <li>• Masa operasi: {SimpleBookingLogic.getOperatingHours()}</li>
            <li>• Tidak boleh bertindih dengan tempahan sedia ada</li>
            <li>• Tempahan mesti dibuat sekurang-kurangnya 1 hari sebelum tarikh tempahan</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 
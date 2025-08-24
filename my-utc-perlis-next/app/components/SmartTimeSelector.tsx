'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { BookingLogic, TimeSlot, BookedTimeSlot } from '../lib/booking-logic';

interface SmartTimeSelectorProps {
  selectedDate: Date;
  bookedTimeSlots: Array<{
    startTime: string;
    endTime: string;
  }>;
  onTimeSelect: (startTime: string, endTime: string, duration: number) => void;
  operatingStartTime: string;
  operatingEndTime: string;
  minDuration: number;
  maxDuration: number;
}

export default function SmartTimeSelector({ 
  selectedDate, 
  bookedTimeSlots, 
  onTimeSelect, 
  operatingStartTime,
  operatingEndTime,
  minDuration, 
  maxDuration 
}: SmartTimeSelectorProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(minDuration);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [nextAvailable, setNextAvailable] = useState<TimeSlot | null>(null);
  const [packageType, setPackageType] = useState<'HOURLY' | 'HALF_DAY' | 'FULL_DAY' | 'MULTI_DAY'>('HOURLY');

  // Generate available durations within the allowed range
  const availableDurations = Array.from({ length: maxDuration - minDuration + 1 }, (_, i) => i + minDuration);

  // Update available slots when date, duration, or booked slots change
  useEffect(() => {
    const bookedSlots: BookedTimeSlot[] = bookedTimeSlots.map(slot => ({
      startTime: slot.startTime.replace('.000', ''),
      endTime: slot.endTime.replace('.000', '')
    }));

    // Determine package type based on duration
    let currentPackageType: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY' | 'MULTI_DAY' = 'HOURLY';
    if (selectedDuration >= 14) {
      currentPackageType = 'FULL_DAY';
    } else if (selectedDuration >= 6) {
      currentPackageType = 'HALF_DAY';
    }
    
    setPackageType(currentPackageType);

    // Generate available slots using the centralized logic
    const slots = BookingLogic.generateAvailableTimeSlots(
      selectedDate,
      bookedSlots,
      currentPackageType
    );

    // Filter slots based on selected duration for hourly bookings
    if (currentPackageType === 'HOURLY') {
      const filteredSlots = slots.filter(slot => {
        // For hourly bookings, check if we can book consecutive slots
        const slotHour = parseInt(slot.startTime.split(':')[0]);
        const endHour = slotHour + selectedDuration;
        
        // Check if we have enough consecutive available slots
        if (endHour > 22) return false; // Past operating hours
        
        // Check all consecutive slots are available
        for (let i = 0; i < selectedDuration; i++) {
          const checkHour = slotHour + i;
          const checkSlot = slots.find(s => s.startTime === `${checkHour.toString().padStart(2, '0')}:00`);
          if (!checkSlot || !checkSlot.available) {
            return false;
          }
        }
        return true;
      });
      
      setAvailableSlots(filteredSlots);
    } else {
      setAvailableSlots(slots);
    }

    // Find next available slot
    const nextSlot = BookingLogic.getNextAvailableSlot(selectedDate, bookedSlots, selectedDuration);
    setNextAvailable(nextSlot);

    // Reset selected slot when duration changes
    setSelectedSlot(null);
  }, [selectedDate, selectedDuration, bookedTimeSlots]);

  const handleDurationChange = (duration: number) => {
    setSelectedDuration(duration);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    
    let endTime = slot.endTime;
    
    // For hourly bookings, calculate end time based on duration
    if (packageType === 'HOURLY') {
      const startHour = parseInt(slot.startTime.split(':')[0]);
      const endHour = startHour + selectedDuration;
      endTime = `${endHour.toString().padStart(2, '0')}:00`;
    }
    
    setSelectedSlot({
      ...slot,
      endTime
    });
    
    onTimeSelect(slot.startTime, endTime, selectedDuration);
  };

  const handleQuickSelect = () => {
    if (nextAvailable) {
      handleSlotSelect(nextAvailable);
    }
  };

  const isCurrentDay = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const currentTime = BookingLogic.getCurrentTime();
  const isWithinOperatingHours = BookingLogic.isWithinOperatingHours();

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Pilih Tempoh & Masa untuk {format(selectedDate, 'dd MMMM yyyy')}
        </h3>

        {/* Current Time Display for Today */}
        {isCurrentDay && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">
                  Masa Sekarang: {currentTime}
                </p>
                <p className="text-xs text-blue-600">
                  {isWithinOperatingHours ? 
                    'Dalam masa operasi' : 
                    `Masa operasi: ${BookingLogic.getOperatingHoursDisplay()}`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Duration Selection for Hourly Bookings */}
        {packageType === 'HOURLY' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tempoh Sewaan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {availableDurations.map(duration => (
                <button
                  key={duration}
                  onClick={() => handleDurationChange(duration)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    selectedDuration === duration
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {duration} Jam
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Next Available Suggestion */}
        {nextAvailable && !selectedSlot && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-green-800">
                  💡 Cadangan Slot Tersedia
                </h4>
                <p className="text-sm text-green-600">
                  {nextAvailable.displayTime}
                </p>
              </div>
              <button
                onClick={handleQuickSelect}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Pilih Slot Ini
              </button>
            </div>
          </div>
        )}

        {/* Time Slots Grid */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">
            {packageType === 'HOURLY' ? 'Slot Masa Tersedia' : 'Pakej Tersedia'}
          </h4>
          
          {availableSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2">
                {isCurrentDay ? 
                  'Tiada slot tersedia untuk hari ini' : 
                  'Tiada slot tersedia untuk tarikh ini'
                }
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Sila pilih tarikh atau tempoh yang berbeza
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableSlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => handleSlotSelect(slot)}
                  disabled={!slot.available}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    selectedSlot?.startTime === slot.startTime
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : slot.available
                      ? 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                      : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                  title={slot.reason || (slot.available ? 'Tersedia' : 'Tidak tersedia')}
                >
                  <div className="text-center">
                    <div className="font-semibold">
                      {slot.displayTime}
                    </div>
                    {!slot.available && slot.reason && (
                      <div className="text-xs mt-1 text-gray-500">
                        {slot.reason}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Slot Display */}
        {selectedSlot && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              ✅ Slot Dipilih
            </h4>
            <div className="text-sm text-blue-700">
              <p><strong>Masa:</strong> {selectedSlot.displayTime}</p>
              <p><strong>Tempoh:</strong> {selectedDuration} jam</p>
              {packageType !== 'HOURLY' && (
                <p><strong>Pakej:</strong> {packageType.replace('_', ' ')}</p>
              )}
            </div>
          </div>
        )}

        {/* Booking Rules Notice */}
        <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            ⚠️ Peraturan Tempahan
          </h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Masa operasi: {BookingLogic.getOperatingHoursDisplay()}</li>
            <li>• Tempoh minimum: {minDuration} jam</li>
            <li>• Tempahan mesti dibuat sekurang-kurangnya 30 minit sebelum masa yang dipilih</li>
            {isCurrentDay && (
              <li>• Slot masa yang telah berlalu tidak boleh ditempah</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
} 
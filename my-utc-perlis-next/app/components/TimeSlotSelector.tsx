'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface BookedTimeSlot {
  startTime: string;
  endTime: string;
}

interface TimeSlotGroup {
  isAvailable: boolean;
  slots: TimeSlot[];
}

interface TimeSlotSelectorProps {
  selectedDate: Date | null;
  bookedTimeSlots: BookedTimeSlot[];
  onTimeSlotSelect: (startTime: string, endTime: string) => void;
  minDuration?: number; // minimum booking duration in hours
  maxDuration?: number; // maximum booking duration in hours
  operatingStartTime?: string; // format: "HH:MM"
  operatingEndTime?: string; // format: "HH:MM"
}

export default function TimeSlotSelector({
  selectedDate,
  bookedTimeSlots,
  onTimeSlotSelect,
  minDuration = 1,
  maxDuration = 12,
  operatingStartTime = "08:00",
  operatingEndTime = "22:00"
}: TimeSlotSelectorProps) {
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
  const [bookingDuration, setBookingDuration] = useState<number>(minDuration);

  // Helper function to parse time string to minutes for comparison
  const parseTimeString = (timeString: string): number => {
    // Handle various time formats
    let hours = 0;
    let minutes = 0;
    
    if (!timeString) return 0;
    
    // Check if it contains seconds and milliseconds
    if (timeString.includes('.')) {
      // Format: "HH:MM:SS.sss"
      const [time] = timeString.split('.');
      const parts = time.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    } else if (timeString.includes(':')) {
      // Format: "HH:MM" or "HH:MM:SS"
      const parts = timeString.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    }
    
    return hours * 60 + minutes;
  };

  // Generate available time slots when selectedDate or bookedTimeSlots change
  useEffect(() => {
    if (!selectedDate) {
      setAvailableTimeSlots([]);
      return;
    }

    // Check if there's a full-day booking for this date
    const hasFullDayBooking = bookedTimeSlots.some(slot => 
      (slot.startTime === "00:00:00.000" && slot.endTime === "23:59:00.000") ||
      (slot.startTime === "08:00:00.000" && slot.endTime === "23:59:00.000")
    );
    
    // If the entire day is booked, show no available slots
    if (hasFullDayBooking) {
      console.log('Full day booking detected - no slots available');
      setAvailableTimeSlots([]);
      return;
    }

    console.log('Booked time slots:', bookedTimeSlots);
    
    // Convert booked time slots to proper format for comparison
    const formattedBookedSlots = bookedTimeSlots.map(slot => {
      console.log(`Processing booked slot: ${slot.startTime} - ${slot.endTime}`);
      return {
        start: parseTimeString(slot.startTime),
        end: parseTimeString(slot.endTime)
      };
    });

    console.log('Formatted booked slots:', formattedBookedSlots);
    
    // Generate hourly time slots from operating hours
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = operatingStartTime.split(':').map(Number);
    const [endHour, endMinute] = operatingEndTime.split(':').map(Number);

    // Start from operating start time and create hourly slots
    for (let hour = startHour; hour < endHour; hour++) {
      // Format current slot time
      const slotStartTime = `${hour.toString().padStart(2, '0')}:00`;
      const slotEndTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      
      const slotStart = parseTimeString(slotStartTime);
      const slotEnd = parseTimeString(slotEndTime);
      
      console.log(`Checking slot ${slotStartTime}-${slotEndTime}`);

      // Check if this slot overlaps with any booked slot
      const isOverlapping = formattedBookedSlots.some(bookedSlot => {
        // Check for any overlap
        const hasOverlap = (
          (slotStart >= bookedSlot.start && slotStart < bookedSlot.end) ||
          (slotEnd > bookedSlot.start && slotEnd <= bookedSlot.end) ||
          (slotStart <= bookedSlot.start && slotEnd >= bookedSlot.end)
        );
        
        if (hasOverlap) {
          console.log(`Slot ${slotStartTime}-${slotEndTime} overlaps with booked slot ${Math.floor(bookedSlot.start/60)}:${bookedSlot.start%60}-${Math.floor(bookedSlot.end/60)}:${bookedSlot.end%60}`);
        }
        
        return hasOverlap;
      });

      slots.push({
        startTime: slotStartTime,
        endTime: slotEndTime,
        isAvailable: !isOverlapping
      });
    }

    setAvailableTimeSlots(slots);
    // Reset selections when date changes
    setSelectedStartTime(null);
    setSelectedEndTime(null);
  }, [selectedDate, bookedTimeSlots, operatingStartTime, operatingEndTime]);

  // Update end time when start time or duration changes
  useEffect(() => {
    if (selectedStartTime && bookingDuration) {
      const [hours, minutes] = selectedStartTime.split(':').map(Number);
      const endHours = hours + bookingDuration;
      const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      setSelectedEndTime(endTime);
      
      // Call the parent's callback
      onTimeSlotSelect(selectedStartTime, endTime);
    }
  }, [selectedStartTime, bookingDuration, onTimeSlotSelect]);

  // Handle time slot selection
  const handleTimeSlotClick = (slot: TimeSlot) => {
    if (!slot.isAvailable) return;
    
    setSelectedStartTime(slot.startTime);
    
    // Calculate if the selected duration will clash with booked slots
    const startTimeMinutes = parseTimeString(slot.startTime);
    const endTimeMinutes = startTimeMinutes + (bookingDuration * 60);
    
    // Check for any overlap with booked slots
    const hasOverlap = bookedTimeSlots.some(bookedSlot => {
      const bookedStartMinutes = parseTimeString(bookedSlot.startTime);
      const bookedEndMinutes = parseTimeString(bookedSlot.endTime);
      
      return (
        (startTimeMinutes < bookedEndMinutes && endTimeMinutes > bookedStartMinutes)
      );
    });
    
    if (hasOverlap) {
      // Find a duration that doesn't overlap
      let validDuration = minDuration;
      while (validDuration <= maxDuration) {
        const potentialEndMinutes = startTimeMinutes + (validDuration * 60);
        const hasOverlapWithDuration = bookedTimeSlots.some(bookedSlot => {
          const bookedStartMinutes = parseTimeString(bookedSlot.startTime);
          const bookedEndMinutes = parseTimeString(bookedSlot.endTime);
          
          return (
            (startTimeMinutes < bookedEndMinutes && potentialEndMinutes > bookedStartMinutes)
          );
        });
        
        if (!hasOverlapWithDuration) {
          setBookingDuration(validDuration);
          break;
        }
        
        validDuration++;
      }
    }
  };

  // Group time slots by available/unavailable for better UI
  const groupedTimeSlots = (): TimeSlotGroup[] => {
    const groups: TimeSlotGroup[] = [];
    let currentGroup: TimeSlot[] = [];
    let lastStatus: boolean | null = null;
    
    availableTimeSlots.forEach((slot, index) => {
      if (lastStatus === null || lastStatus === slot.isAvailable) {
        currentGroup.push(slot);
      } else {
        groups.push({
          isAvailable: lastStatus,
          slots: [...currentGroup]
        });
        currentGroup = [slot];
      }
      
      lastStatus = slot.isAvailable;
      
      // Push the last group
      if (index === availableTimeSlots.length - 1) {
        groups.push({
          isAvailable: lastStatus,
          slots: [...currentGroup]
        });
      }
    });
    
    return groups;
  };

  if (!selectedDate) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
        Pilih tarikh untuk melihat masa yang tersedia
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-blue-50 border-b">
        <h3 className="text-lg font-semibold text-blue-800">
          Masa Tersedia {selectedDate ? format(selectedDate, 'dd MMMM yyyy') : ''}
        </h3>
      </div>
      
      <div className="p-4">
        {availableTimeSlots.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            Tiada slot masa tersedia
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tempoh Sewaan (jam)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: maxDuration - minDuration + 1 }, (_, i) => i + minDuration).map(duration => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => setBookingDuration(duration)}
                    className={`py-2 px-3 text-sm font-medium rounded ${
                      bookingDuration === duration
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {duration} Jam
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">Pilih Masa Mula:</h4>
              <div className="grid grid-cols-4 gap-2">
                {availableTimeSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => handleTimeSlotClick(slot)}
                    disabled={!slot.isAvailable}
                    className={`
                      py-2 px-3 text-sm font-medium rounded
                      ${!slot.isAvailable 
                        ? 'bg-red-100 text-red-800 cursor-not-allowed opacity-60' 
                        : selectedStartTime === slot.startTime
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }
                    `}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            </div>
            
            {selectedStartTime && selectedEndTime && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Tempahan Dipilih:</h4>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-gray-600">Mula:</span>{' '}
                    <span className="font-semibold">{selectedStartTime}</span>
                  </div>
                  <div className="text-gray-600">→</div>
                  <div>
                    <span className="text-gray-600">Tamat:</span>{' '}
                    <span className="font-semibold">{selectedEndTime}</span>
                  </div>
                  <div className="bg-blue-600 text-white py-1 px-3 rounded-full text-sm font-medium">
                    {bookingDuration} Jam
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameMonth, addMonths, subMonths } from 'date-fns';

interface AvailabilityData {
  dates: {
    [date: string]: {
      available: boolean;
      partiallyAvailable: boolean;
      bookedTimeSlots: Array<{
        startTime: string;
        endTime: string;
      }>;
    };
  };
}

interface AvailabilityCalendarProps {
  facilityId: string;
  selectedStartDate?: Date | null;
  selectedEndDate?: Date | null;
  onDateSelect?: (date: Date, availability: {
    available: boolean;
    partiallyAvailable: boolean;
    bookedTimeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  }) => void;
}

export default function AvailabilityCalendar({ facilityId, selectedStartDate, selectedEndDate, onDateSelect }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Debugging flag
  const [debugMode] = useState<boolean>(false);

  // Fetch availability data when month changes
  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const month = format(currentMonth, 'M');
        const year = format(currentMonth, 'yyyy');
        
        console.log(`Fetching availability for facility ${facilityId} for ${month}/${year}`);
        const response = await fetch(`/api/facilities/availability?facilityId=${facilityId}&month=${month}&year=${year}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Availability API error:', errorData);
          throw new Error('Failed to fetch availability data');
        }
        
        const data = await response.json();
        console.log('Availability data received:', data);
        
        // Debug: Log all dates in the response
        if (debugMode && data.dates) {
          console.log('Available dates in response:');
          Object.keys(data.dates).sort().forEach(date => {
            console.log(`Date: ${date}, Available: ${data.dates[date].available}, Partially: ${data.dates[date].partiallyAvailable}, Slots: ${data.dates[date].bookedTimeSlots.length}`);
          });
          
          // Verify if all days in current month are present
          const monthStart = startOfMonth(currentMonth);
          const monthEnd = endOfMonth(currentMonth);
          const daysInMonth = monthEnd.getDate();
          
          console.log(`Current month: ${format(currentMonth, 'MMMM yyyy')} with ${daysInMonth} days`);
          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const formattedDate = format(date, 'yyyy-MM-dd');
            console.log(`Day ${day}: ${formattedDate} - ${data.dates[formattedDate] ? 'Found' : 'Missing'}`);
          }
        }
        
        setAvailability(data);
      } catch (error) {
        console.error('Error fetching availability:', error);
        setError('Failed to load availability data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAvailability();
  }, [facilityId, currentMonth, debugMode]);

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleDateClick = (day: Date) => {
    // Only allow selecting future dates
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (day < now) return;
    
    // Check if date is available before allowing selection
    const dateString = format(day, 'yyyy-MM-dd');
    const dateAvailability = availability?.dates[dateString];
    
    // Don't allow selection of unavailable dates or dates with full day bookings
    if (dateAvailability && !dateAvailability.available && !dateAvailability.partiallyAvailable) {
      console.log(`Date ${dateString} is unavailable - blocking selection`);
      return;
    }
    
    // Check for full day booking
    const hasFullDayBooking = dateAvailability?.bookedTimeSlots.some(slot => 
      (slot.startTime === "00:00:00.000" && slot.endTime === "23:59:00.000")
    );
    
    if (hasFullDayBooking) {
      console.log(`Date ${dateString} has full day booking - blocking selection`);
      return;
    }
    
    setSelectedDate(day);
    
    // Call the onDateSelect callback if provided
    if (onDateSelect && availability) {
      if (dateAvailability) {
        // If the date is in the API response, use that data
        console.log(`Selected date ${dateString} found in API data`);
        onDateSelect(day, dateAvailability);
      } else {
        // If the date isn't in the API response (e.g., last day of month),
        // create a default availability object assuming it's available
        const defaultAvailability = {
          available: true,
          partiallyAvailable: false,
          bookedTimeSlots: []
        };
        
        console.log(`Creating default availability for date ${dateString} that was not in API response`);
        onDateSelect(day, defaultAvailability);
      }
    }
  };

  // Generate calendar days
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = monthStart;
    const endDate = monthEnd;
    
    const dateFormat = 'd';
    const rows = [];
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
    const startDay = getDay(monthStart);
    
    let formattedDays = [];
    
    // Add empty cells for days before the start of the month
    for (let i = 0; i < startDay; i++) {
      formattedDays.push(<div key={`empty-${i}`} className="border p-2 text-center text-gray-400"></div>);
    }
    
    // Add days of the month
    for (const day of days) {
      const formattedDate = format(day, 'yyyy-MM-dd');
      const isSelected = selectedDate !== null && format(selectedDate, 'yyyy-MM-dd') === formattedDate;
      const isStartDate = selectedStartDate && format(selectedStartDate, 'yyyy-MM-dd') === formattedDate;
      const isEndDate = selectedEndDate && format(selectedEndDate, 'yyyy-MM-dd') === formattedDate;
      const isInRange = selectedStartDate && selectedEndDate && day >= selectedStartDate && day <= selectedEndDate;
      const today = isToday(day);
      const isCurrentMonth = isSameMonth(day, currentMonth);
      
      // Check if the day is in the past
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const isPastDay = day < now;
      
      // Get availability status for this day
      let availabilityStatus = 'unavailable';
      let tooltipText = 'Tidak tersedia atau tiada data';
      let hasFullDayBooking = false;
      
      // Debug: check if the date exists in availability data
      if (debugMode) {
        console.log(`Checking availability for date ${formattedDate}: ${availability && availability.dates[formattedDate] ? 'Found' : 'Not found'}`);
      }
      
      // If we have availability data and this date is in it
      if (availability && availability.dates[formattedDate]) {
        const dateAvailability = availability.dates[formattedDate];
        
        // Check for full day booking
        hasFullDayBooking = dateAvailability.bookedTimeSlots.some(slot => 
          (slot.startTime === "00:00:00.000" && slot.endTime === "23:59:00.000")
        );
        
        if (dateAvailability.available && !dateAvailability.partiallyAvailable) {
          availabilityStatus = 'available';
          tooltipText = 'Tersedia sepanjang hari';
        } else if (dateAvailability.partiallyAvailable) {
          availabilityStatus = 'partially-available';
          tooltipText = `Sebahagian masa tersedia (${dateAvailability.bookedTimeSlots.length} slot ditempah)`;
        } else {
          availabilityStatus = 'unavailable';
          tooltipText = hasFullDayBooking ? 
            'Tidak tersedia (tempahan hari penuh)' : 
            'Tidak tersedia (ditempah sepenuhnya)';
        }
      } else if (availability) {
        // If we have availability data but this date is not in it, mark as available
        // This handles any dates that might be missing in the API response
        availabilityStatus = 'available';
        tooltipText = 'Tersedia sepanjang hari';
        
        if (debugMode) {
          console.warn(`Date ${formattedDate} is missing from availability data, assuming available`);
        }
      }
      
      // For debugging - only log if the date is in the current month
      if (debugMode && isCurrentMonth) {
        console.log(`Date ${formattedDate}: ${availabilityStatus}, slots: ${
          availability?.dates[formattedDate]?.bookedTimeSlots?.length || 0
        }, full day: ${hasFullDayBooking ? 'yes' : 'no'}`);
      }
      
      // Past days are always unavailable
      if (isPastDay) {
        availabilityStatus = 'past';
        tooltipText = 'Tarikh lepas';
      }
      
      // Determine if date is clickable
      const isClickable = !isPastDay && availabilityStatus !== 'unavailable' && !hasFullDayBooking;
      
      const dayStyles = `
        border p-2 text-center relative
        ${!isCurrentMonth ? 'text-gray-400' : ''}
        ${isSelected ? 'bg-blue-100 border-blue-400' : ''}
        ${isStartDate ? 'bg-green-200 border-green-400' : ''}
        ${isEndDate ? 'bg-green-200 border-green-400' : ''}
        ${isInRange && !isStartDate && !isEndDate ? 'bg-green-100 border-green-200' : ''}
        ${today ? 'font-bold' : ''}
        ${isPastDay ? 'text-gray-400 cursor-not-allowed bg-gray-50' : ''}
        ${hasFullDayBooking && !isPastDay ? 'bg-red-100 text-red-700 cursor-not-allowed' : ''}
        ${availabilityStatus === 'unavailable' && !isPastDay && !hasFullDayBooking ? 'bg-red-50 text-red-600 cursor-not-allowed' : ''}
        ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
        ${availabilityStatus === 'available' && !isInRange && isClickable ? 'hover:bg-green-50' : ''}
        ${availabilityStatus === 'partially-available' && !isInRange && isClickable ? 'hover:bg-yellow-50' : ''}
      `;
      
      formattedDays.push(
        <div 
          key={day.toString()} 
          className={dayStyles}
          onClick={() => isClickable && handleDateClick(day)}
          title={tooltipText}
        >
          <span>{format(day, dateFormat)}</span>
          {!isPastDay && (
            <div className={`w-3 h-3 rounded-full absolute bottom-1 right-1
              ${availabilityStatus === 'available' ? 'bg-green-500' : ''}
              ${availabilityStatus === 'partially-available' ? 'bg-yellow-500' : ''}
              ${availabilityStatus === 'unavailable' || hasFullDayBooking ? 'bg-red-500' : ''}
            `}></div>
          )}
        </div>
      );
    }
    
    // Split days into rows of 7 (for weekdays)
    let i = 0;
    while (i < formattedDays.length) {
      rows.push(<div key={i} className="grid grid-cols-7">{formattedDays.slice(i, i + 7)}</div>);
      i += 7;
    }
    
    return rows;
  };

  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-blue-50 border-b">
        <button 
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-blue-100 transition"
        >
          <svg className="w-5 h-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-blue-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button 
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-blue-100 transition"
        >
          <svg className="w-5 h-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div className="p-4">
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="flex justify-center items-center h-64 text-red-500">
            <p>{error}</p>
          </div>
        )}
        
        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-7 mb-2 text-sm text-center font-medium text-gray-600">
              <div>Ahad</div>
              <div>Isnin</div>
              <div>Selasa</div>
              <div>Rabu</div>
              <div>Khamis</div>
              <div>Jumaat</div>
              <div>Sabtu</div>
            </div>
            
            <div className="space-y-1">
              {renderCalendar()}
            </div>
            
            <div className="flex justify-center mt-4 space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span>Tersedia</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <span>Sebahagian</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span>Ditempah</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 
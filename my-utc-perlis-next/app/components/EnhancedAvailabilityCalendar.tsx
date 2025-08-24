'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameMonth, addMonths, subMonths, isAfter, isBefore } from 'date-fns';

// Simple Card components (since we don't have shadcn/ui setup)
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-lg shadow-md border border-border ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = "default", 
  size = "default",
  className = "" 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  variant?: "default" | "outline";
  size?: "default" | "sm";
  className?: string;
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variantClasses = variant === "outline" 
    ? "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700" 
    : "bg-blue-600 text-white hover:bg-blue-700";
  const sizeClasses = size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 py-2";
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
    >
      {children}
    </button>
  );
};

const XCircle = ({ className = "" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface AvailabilityData {
  dates: {
    [date: string]: {
      available: boolean;
      partiallyAvailable: boolean;
      bookedTimeSlots: Array<{
        startTime: string;
        endTime: string;
      }>;
      suggestedPricing?: {
        hourly: number;
        halfDay: number;
        fullDay: number;
      };
      availableHours?: number;
      totalHours?: number;
    };
  };
}

interface DateDetails {
  date: Date;
  dateString: string;
  isSelected: boolean;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
  availabilityStatus: 'available' | 'partially-available' | 'unavailable' | 'past';
  availableHours: number;
  totalHours: number;
  bookedSlots: number;
  pricing?: {
    hourlyRate?: number;
    halfDayRate?: number;
    fullDayRate?: number;
  };
}

interface EnhancedAvailabilityCalendarProps {
  facilityId: string;
  facilityRates?: {
    hourlyRate?: number;
    halfDayRate?: number;
    fullDayRate?: number;
  };
  onDateSelect?: (date: Date, details: DateDetails) => void;
  selectedDateRange?: { start: Date | null; end: Date | null };
  allowMultiSelect?: boolean;
  showPricing?: boolean;
  showDetailedTooltips?: boolean;
  operatingHours?: { start: string; end: string };
}

export default function EnhancedAvailabilityCalendar({ 
  facilityId, 
  facilityRates,
  onDateSelect,
  selectedDateRange,
  allowMultiSelect = false,
  showPricing = true,
  showDetailedTooltips = true,
  operatingHours = { start: "08:00", end: "22:00" }
}: EnhancedAvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: Date | null; end: Date | null }>(
    selectedDateRange || { start: null, end: null }
  );
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: string }>({
    visible: false, x: 0, y: 0, content: ''
  });

  // Calculate total operating hours per day
  const calculateTotalOperatingHours = (): number => {
    const startTime = operatingHours.start.split(':').map(Number);
    const endTime = operatingHours.end.split(':').map(Number);
    const startMinutes = startTime[0] * 60 + startTime[1];
    const endMinutes = endTime[0] * 60 + endTime[1];
    return (endMinutes - startMinutes) / 60;
  };

  const totalOperatingHours = calculateTotalOperatingHours();

  // Fetch availability data when month changes
  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const month = format(currentMonth, 'M');
        const year = format(currentMonth, 'yyyy');
        
        const response = await fetch(`/api/facilities/availability?facilityId=${facilityId}&month=${month}&year=${year}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch availability data');
        }
        
        const data = await response.json();
        
        // Enhance data with pricing and hour calculations
        const enhancedData = { ...data };
        Object.keys(enhancedData.dates).forEach(dateKey => {
          const dateData = enhancedData.dates[dateKey];
          const bookedHours = dateData.bookedTimeSlots.reduce((total: number, slot: any) => {
            const startTime = slot.startTime.split(':').map(Number);
            const endTime = slot.endTime.split(':').map(Number);
            const startMinutes = startTime[0] * 60 + startTime[1];
            const endMinutes = endTime[0] * 60 + endTime[1];
            return total + ((endMinutes - startMinutes) / 60);
          }, 0);
          
          enhancedData.dates[dateKey] = {
            ...dateData,
            availableHours: Math.max(0, totalOperatingHours - bookedHours),
            totalHours: totalOperatingHours,
            suggestedPricing: facilityRates
          };
        });
        
        setAvailability(enhancedData);
      } catch (error) {
        console.error('Error fetching availability:', error);
        setError('Failed to load availability data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAvailability();
  }, [facilityId, currentMonth, facilityRates, totalOperatingHours]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleDateClick = (date: Date, details: DateDetails) => {
    if (details.isPast || details.availabilityStatus === 'unavailable') return;
    
    if (allowMultiSelect) {
      if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
        // Start new range
        setSelectedRange({ start: date, end: null });
      } else if (selectedRange.start && !selectedRange.end) {
        // Complete range
        if (isAfter(date, selectedRange.start)) {
          setSelectedRange({ start: selectedRange.start, end: date });
        } else {
          setSelectedRange({ start: date, end: selectedRange.start });
        }
      }
    } else {
      setSelectedDate(date);
    }
    
    onDateSelect?.(date, details);
  };

  const handleMouseEnter = (event: React.MouseEvent, details: DateDetails) => {
    if (!showDetailedTooltips) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipContent = generateTooltipContent(details);
    
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      content: tooltipContent
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: '' });
  };

  const generateTooltipContent = (details: DateDetails): string => {
    let content = `${format(details.date, 'EEEE, dd MMMM yyyy')}\n\n`;
    
    switch (details.availabilityStatus) {
      case 'available':
        content += '✅ Tersedia sepanjang hari';
        break;
      case 'partially-available':
        content += '⚠️ Sebahagian masa tersedia';
        break;
      case 'unavailable':
        content += '❌ Tidak tersedia';
        break;
      case 'past':
        content += '📅 Tarikh lepas';
        break;
    }

    if (details.availabilityStatus !== 'past') {
      content += `\n🕒 ${details.availableHours}h tersedia dari ${details.totalHours}h`;
      
      if (details.bookedSlots > 0) {
        content += `\n📋 ${details.bookedSlots} slot ditempah`;
      }
      
      if (showPricing && details.pricing) {
        content += '\n\n💰 Kadar harga:';
        if (details.pricing.hourlyRate) {
          content += `\n• Per jam: RM${details.pricing.hourlyRate}`;
        }
        if (details.pricing.halfDayRate) {
          content += `\n• Separuh hari: RM${details.pricing.halfDayRate}`;
        }
        if (details.pricing.fullDayRate) {
          content += `\n• Sehari penuh: RM${details.pricing.fullDayRate}`;
        }
      }
    }

    return content;
  };

  const getDateDetails = (day: Date): DateDetails => {
    const dateString = format(day, 'yyyy-MM-dd');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const isPast = isBefore(day, now);
    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isSelected = selectedDate ? format(selectedDate, 'yyyy-MM-dd') === dateString : false;
    
    let availabilityStatus: DateDetails['availabilityStatus'] = 'unavailable';
    let availableHours = 0;
    let bookedSlots = 0;
    let pricing = facilityRates;
    
    if (isPast) {
      availabilityStatus = 'past';
    } else if (availability && availability.dates[dateString]) {
      const dateData = availability.dates[dateString];
      
      // Calculate available hours
      const bookedHours = dateData.bookedTimeSlots.reduce((total, slot) => {
        const startTime = slot.startTime.split(':').map(Number);
        const endTime = slot.endTime.split(':').map(Number);
        const startMinutes = startTime[0] * 60 + startTime[1];
        const endMinutes = endTime[0] * 60 + endTime[1];
        return total + ((endMinutes - startMinutes) / 60);
      }, 0);
      
      availableHours = Math.max(0, totalOperatingHours - bookedHours);
      bookedSlots = dateData.bookedTimeSlots.length;
      
      if (dateData.available && !dateData.partiallyAvailable) {
        availabilityStatus = 'available';
      } else if (dateData.partiallyAvailable) {
        availabilityStatus = 'partially-available';
      } else {
        availabilityStatus = 'unavailable';
      }
    } else if (availability) {
      availabilityStatus = 'available';
      availableHours = totalOperatingHours;
    }

    return {
      date: day,
      dateString,
      isSelected,
      isToday: isToday(day),
      isPast,
      isCurrentMonth,
      availabilityStatus,
      availableHours,
      totalHours: totalOperatingHours,
      bookedSlots,
      pricing
    };
  };

  const getDateStyles = (details: DateDetails): string => {
    const baseStyles = "relative p-3 text-center cursor-pointer border border-gray-200 min-h-[80px] flex flex-col justify-between transition-all duration-200 rounded-lg";
    
    let statusStyles = "";
    let interactionStyles = "";
    
    // Status-based styles
    switch (details.availabilityStatus) {
      case 'available':
        statusStyles = "bg-green-50 hover:bg-green-100 border-green-200 text-green-800";
        break;
      case 'partially-available':
        statusStyles = "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-800";
        break;
      case 'unavailable':
        statusStyles = "bg-red-50 border-red-200 cursor-not-allowed text-red-800";
        break;
      case 'past':
        statusStyles = "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100";
        break;
    }
    
    // Selection styles
    if (details.isSelected) {
      interactionStyles += " ring-2 ring-blue-500 bg-blue-100";
    }
    
    if (details.isToday) {
      interactionStyles += " font-bold ring-2 ring-purple-300";
    }
    
    if (!details.isCurrentMonth) {
      interactionStyles += " opacity-50";
    }
    
    return `${baseStyles} ${statusStyles} ${interactionStyles}`;
  };

  const getAvailabilityIcon = (status: DateDetails['availabilityStatus']) => {
    switch (status) {
      case 'available':
        return '✅';
      case 'partially-available':
        return '⚠️';
      case 'unavailable':
        return '❌';
      case 'past':
        return '📅';
      default:
        return '';
    }
  };

  // Generate calendar days
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = getDay(monthStart);
    
    let formattedDays = [];
    
    // Add empty cells for days before the start of the month
    for (let i = 0; i < startDay; i++) {
      formattedDays.push(
        <div key={`empty-${i}`} className="border border-gray-200 p-3 bg-gray-50 rounded-lg"></div>
      );
    }
    
    // Add days of the month
    for (const day of days) {
      const details = getDateDetails(day);
      
      formattedDays.push(
        <div 
          key={day.toString()}
          className={getDateStyles(details)}
          onClick={() => handleDateClick(day, details)}
          onMouseEnter={(e) => handleMouseEnter(e, details)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex justify-between items-start mb-1">
            <span className="text-lg font-medium">
              {format(day, 'd')}
            </span>
            <span className="text-sm">
              {getAvailabilityIcon(details.availabilityStatus)}
            </span>
          </div>
          
          {details.availabilityStatus !== 'past' && (
            <div className="text-xs space-y-1">
              {details.availableHours > 0 && (
                <div className="bg-background bg-opacity-70 rounded px-1 py-0.5">
                  {details.availableHours}h tersedia
                </div>
              )}
              {details.bookedSlots > 0 && (
                <div className="bg-background bg-opacity-70 rounded px-1 py-0.5">
                  {details.bookedSlots} tempahan
                </div>
              )}
              {showPricing && details.pricing?.hourlyRate && (
                <div className="bg-background bg-opacity-70 rounded px-1 py-0.5 font-medium">
                  RM{details.pricing.hourlyRate}/j
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    
    // Split days into rows of 7
    const rows = [];
    let i = 0;
    while (i < formattedDays.length) {
      rows.push(
        <div key={i} className="grid grid-cols-7 gap-2">
          {formattedDays.slice(i, i + 7)}
        </div>
      );
      i += 7;
    }
    
    return rows;
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Muat Semula
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={prevMonth}
            disabled={isLoading}
          >
            ← Bulan Sebelum
          </Button>
          
          <CardTitle className="text-lg">
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={nextMonth}
            disabled={isLoading}
          >
            Bulan Seterusnya →
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'].map(day => (
                <div key={day} className="text-center font-semibold text-gray-700 py-2 text-sm bg-gray-100 rounded">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="space-y-2">
              {renderCalendar()}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-6 mt-6 pt-4 border-t bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span className="text-sm font-medium">Tersedia</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span className="text-sm font-medium">Sebahagian</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">❌</span>
                <span className="text-sm font-medium">Ditempah</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <span className="text-sm font-medium">Hari ini</span>
              </div>
            </div>

            {/* Statistics */}
            {availability && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Statistik Bulan Ini</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {Object.values(availability.dates).filter(d => d.available && !d.partiallyAvailable).length}
                    </div>
                    <div className="text-gray-600">Hari Tersedia</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      {Object.values(availability.dates).filter(d => d.partiallyAvailable).length}
                    </div>
                    <div className="text-gray-600">Sebahagian</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600">
                      {Object.values(availability.dates).filter(d => !d.available && !d.partiallyAvailable).length}
                    </div>
                    <div className="text-gray-600">Penuh</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {Object.values(availability.dates).reduce((sum, d) => sum + d.bookedTimeSlots.length, 0)}
                    </div>
                    <div className="text-gray-600">Jumlah Tempahan</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 
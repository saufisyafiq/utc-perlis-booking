'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface PackageOption {
  type: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY';
  name: string;
  description: string;
  basePrice: number;
  available: boolean;
  conflictReason?: string;
  alternatives?: AlternativeOption[];
}

interface AlternativeOption {
  type: string;
  startTime: string;
  endTime: string;
  displayTime: string;
  available: boolean;
}

interface PackageSelectorProps {
  facilityId: string;
  selectedDate: Date | null;
  onPackageSelect: (packageType: string, details: any) => void;
  facilityRates: {
    hourlyRate?: number;
    halfDayRate?: number;
    fullDayRate?: number;
  };
  sessionId: string;
}

export default function PackageSelector({ 
  facilityId, 
  selectedDate, 
  onPackageSelect, 
  facilityRates,
  sessionId 
}: PackageSelectorProps) {
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedHalfDayPeriod, setSelectedHalfDayPeriod] = useState<'morning' | 'afternoon'>('morning');
  const [selectedHourlySlot, setSelectedHourlySlot] = useState<AlternativeOption | null>(null);
  const [currentHold, setCurrentHold] = useState<Date | null>(null);

  // Check package availability when date changes
  useEffect(() => {
    if (!selectedDate || !facilityId) return;

    const checkAvailability = async () => {
      setLoading(true);
      try {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        
        // Check each package type
        const packageChecks: Array<{
          type: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY';
          name: string;
          description: string;
          basePrice: number;
        }> = [
          {
            type: 'FULL_DAY' as const,
            name: 'Satu Hari Penuh',
            description: '8:00 AM - 10:00 PM',
            basePrice: facilityRates.fullDayRate || 400
          },
          {
            type: 'HALF_DAY' as const,
            name: 'Separuh Hari',
            description: 'Pagi (8:00 AM - 2:00 PM) atau Petang (2:00 PM - 10:00 PM)',
            basePrice: facilityRates.halfDayRate || 250
          },
          {
            type: 'HOURLY' as const,
            name: 'Per Jam',
            description: 'Minimum 1 jam, maksimum 12 jam',
            basePrice: facilityRates.hourlyRate || 50
          }
        ];

        const availabilityPromises = packageChecks.map(async (pkg) => {
          const response = await fetch('/api/bookings/availability-check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              facilityId,
              packageType: pkg.type,
              startDate: dateString,
              sessionId,
              action: 'check'
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to check ${pkg.type} availability`);
          }

          const data = await response.json();
          
          return {
            ...pkg,
            available: data.available,
            conflictReason: data.conflictReason,
            alternatives: data.alternatives || []
          };
        });

        const results = await Promise.all(availabilityPromises);
        setPackages(results);
      } catch (error) {
        console.error('Error checking package availability:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAvailability();
  }, [selectedDate, facilityId, facilityRates, sessionId]);

  // Hold a package when selected
  const holdPackage = async (packageType: string, details: any = {}) => {
    if (!selectedDate) return;

    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      const response = await fetch('/api/bookings/availability-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId,
          packageType,
          startDate: dateString,
          sessionId,
          action: 'hold',
          ...details
        })
      });

      if (!response.ok) {
        throw new Error('Failed to hold package');
      }

      const data = await response.json();
      
      if (data.available && data.holdExpiry) {
        setCurrentHold(new Date(data.holdExpiry));
        onPackageSelect(packageType, {
          ...details,
          package: data.package,
          holdExpiry: data.holdExpiry
        });
      }
    } catch (error) {
      console.error('Error holding package:', error);
    }
  };

  // Release current hold
  const releaseHold = async () => {
    try {
      await fetch('/api/bookings/availability-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId,
          sessionId,
          action: 'release'
        })
      });
      
      setCurrentHold(null);
      setSelectedPackage(null);
    } catch (error) {
      console.error('Error releasing hold:', error);
    }
  };

  const handlePackageSelect = (packageType: string) => {
    // Release any existing hold first
    if (currentHold) {
      releaseHold();
    }

    setSelectedPackage(packageType);

    if (packageType === 'FULL_DAY') {
      holdPackage('FULL_DAY');
    } else if (packageType === 'HALF_DAY') {
      // Don't hold yet, wait for period selection
    } else if (packageType === 'HOURLY') {
      // Don't hold yet, wait for time slot selection
    }
  };

  const handleHalfDayPeriodSelect = (period: 'morning' | 'afternoon') => {
    setSelectedHalfDayPeriod(period);
    holdPackage('HALF_DAY', { halfDayPeriod: period });
  };

  const handleHourlySlotSelect = (slot: AlternativeOption) => {
    setSelectedHourlySlot(slot);
    holdPackage('HOURLY', {
      startTime: slot.startTime,
      endTime: slot.endTime
    });
  };

  if (!selectedDate) {
    return (
      <div className="p-4 text-center text-gray-500">
        Sila pilih tarikh terlebih dahulu
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Memeriksa ketersediaan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pilih Pakej Sewaan</h3>
      
      {/* Hold Timer */}
      {currentHold && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⏰ Pakej ditahan sehingga {format(currentHold, 'HH:mm:ss')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {packages.map((pkg) => (
          <div
            key={pkg.type}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedPackage === pkg.type
                ? 'border-blue-500 bg-blue-50'
                : pkg.available
                ? 'border-gray-200 hover:border-gray-300'
                : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
            }`}
            onClick={() => pkg.available && handlePackageSelect(pkg.type)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{pkg.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                <p className="text-lg font-bold text-blue-600 mt-2">
                  RM{pkg.basePrice}
                  {pkg.type === 'HOURLY' && '/jam'}
                </p>
              </div>
              
              <div className="flex items-center ml-4">
                {pkg.available ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Tersedia
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                    Tidak Tersedia
                  </span>
                )}
              </div>
            </div>

            {!pkg.available && pkg.conflictReason && (
              <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                <p className="text-sm text-red-700">
                  {pkg.conflictReason === 'existing_booking' 
                    ? 'Sudah ada tempahan pada masa ini'
                    : 'Sedang ditahan oleh pengguna lain'
                  }
                </p>
              </div>
            )}

            {/* Half Day Period Selection */}
            {selectedPackage === pkg.type && pkg.type === 'HALF_DAY' && pkg.available && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Pilih Masa:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHalfDayPeriodSelect('morning');
                    }}
                    className={`p-2 rounded border text-sm ${
                      selectedHalfDayPeriod === 'morning'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Pagi (8:00 AM - 2:00 PM)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHalfDayPeriodSelect('afternoon');
                    }}
                    className={`p-2 rounded border text-sm ${
                      selectedHalfDayPeriod === 'afternoon'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Petang (2:00 PM - 10:00 PM)
                  </button>
                </div>
              </div>
            )}

            {/* Hourly Slot Selection */}
            {selectedPackage === pkg.type && pkg.type === 'HOURLY' && pkg.available && pkg.alternatives && pkg.alternatives.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Pilih Slot Masa:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {pkg.alternatives.map((slot, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHourlySlotSelect(slot);
                      }}
                      className={`p-2 rounded border text-sm ${
                        selectedHourlySlot?.startTime === slot.startTime
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {slot.displayTime}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {packages.every(pkg => !pkg.available) && (
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Tiada pakej tersedia untuk tarikh ini.</p>
          <p className="text-sm text-gray-500 mt-1">
            Sila pilih tarikh lain atau hubungi kami untuk maklumat lanjut.
          </p>
        </div>
      )}
    </div>
  );
} 
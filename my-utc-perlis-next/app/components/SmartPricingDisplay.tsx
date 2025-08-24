'use client';

import { useState, useEffect } from 'react';
import { PricingEngine, PricingOption, UpgradeSuggestion, BookingDay } from '../lib/pricing-engine';

interface SmartPricingDisplayProps {
  bookingDays: BookingDay[];
  facilityRates: {
    hourlyRate: number;
    halfDayRate: number;
    fullDayRate: number;
    halfDayHours?: number;
    fullDayHours?: number;
  };
  equipmentRates?: Record<string, number>;
  selectedEquipment?: string[];
  onPricingSelect?: (option: PricingOption) => void;
}

export default function SmartPricingDisplay({
  bookingDays,
  facilityRates,
  equipmentRates = {},
  selectedEquipment = [],
  onPricingSelect
}: SmartPricingDisplayProps) {
  const [pricingEngine] = useState(() => new PricingEngine(facilityRates, equipmentRates));
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
  const [upgradeSuggestions, setUpgradeSuggestions] = useState<UpgradeSuggestion[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (bookingDays.length > 0) {
      // Calculate pricing for each booking day
      const allOptions: PricingOption[] = [];
      
      bookingDays.forEach((day, index) => {
        const result = pricingEngine.calculateOptimalPricing(
          day.date,
          day.date,
          day.startTime,
          day.endTime,
          selectedEquipment
        );
        
        const option: PricingOption = {
          id: `day-${index}`,
          name: `Tempahan ${day.date}`,
          description: `${day.startTime} - ${day.endTime}`,
          totalPrice: result.totalPrice,
          breakdown: result.breakdown,
          savings: result.savings,
          isRecommended: index === 0
        };
        
        allOptions.push(option);
      });
      
      setPricingOptions(allOptions);
      setUpgradeSuggestions([]); // No upgrade suggestions for now
      
      // Auto-select the first option
      if (allOptions.length > 0) {
        setSelectedOption(allOptions[0].id);
        onPricingSelect?.(allOptions[0]);
      }
    }
  }, [bookingDays, selectedEquipment, pricingEngine, onPricingSelect]);

  const handleOptionSelect = (option: PricingOption) => {
    setSelectedOption(option.id);
    onPricingSelect?.(option);
  };

  const formatCurrency = (amount: number) => `RM${amount.toFixed(2)}`;

  if (bookingDays.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center">
        <div className="text-gray-500 mb-2">💰</div>
        <p className="text-gray-600">Pilih masa tempahan untuk melihat harga</p>
      </div>
    );
  }

  const packageInfo = {
    hourly: { rate: facilityRates.hourlyRate },
    halfDay: { hours: facilityRates.halfDayHours || 5, rate: facilityRates.halfDayRate },
    fullDay: { hours: facilityRates.fullDayHours || 8, rate: facilityRates.fullDayRate }
  };

  return (
    <div className="space-y-6">
      {/* Package Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">📦 Maklumat Pakej</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-blue-800">Per Jam</div>
            <div className="text-blue-600">{formatCurrency(packageInfo.hourly.rate)}/jam</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-blue-800">Separuh Hari</div>
            <div className="text-blue-600">{packageInfo.halfDay.hours} jam - {formatCurrency(packageInfo.halfDay.rate)}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-blue-800">Sehari Penuh</div>
            <div className="text-blue-600">{packageInfo.fullDay.hours} jam - {formatCurrency(packageInfo.fullDay.rate)}</div>
          </div>
        </div>
      </div>

      {/* Upgrade Suggestions - Currently disabled */}
      {/* {upgradeSuggestions.length > 0 && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-green-600 mt-1">💡</div>
              <div className="flex-1">
                <h4 className="font-medium text-green-800 mb-1">Cadangan Jimat</h4>
                <p className="text-green-700 text-sm">Tiada cadangan jimat pada masa ini</p>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Pricing Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Pilihan Harga</h3>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {showComparison ? 'Sembunyikan' : 'Bandingkan'} Pilihan
          </button>
        </div>

        <div className="grid gap-4">
          {pricingOptions.map((option) => (
            <div
              key={option.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedOption === option.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleOptionSelect(option)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{option.name}</h4>
                    {option.isRecommended && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        Disyorkan
                      </span>
                    )}
                    {option.savings && option.savings > 0 && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        Jimat {formatCurrency(option.savings)}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{option.description}</p>
                  
                  {showComparison && (
                    <div className="mt-3 space-y-1">
                      <h5 className="font-medium text-gray-700 text-sm">Pecahan Harga:</h5>
                      {option.breakdown.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm text-gray-600">
                          <span>{item.description}</span>
                          <span>{formatCurrency(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(option.totalPrice)}
                  </div>
                  {selectedOption === option.id && (
                    <div className="text-blue-600 text-sm font-medium mt-1">
                      ✓ Dipilih
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Option Summary */}
      {selectedOption && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Ringkasan Tempahan</h4>
          {(() => {
            const option = pricingOptions.find(o => o.id === selectedOption);
            if (!option) return null;

            return (
              <div className="space-y-3">
                {/* Daily breakdown */}
                <div className="grid gap-2">
                  {option.breakdown.filter(item => item.type === 'FACILITY').map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <span className="font-medium">{item.description}</span>
                        <span className="text-gray-600 ml-2">
                          ({item.quantity} unit @ {formatCurrency(item.unitPrice)})
                        </span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>

                {/* Equipment costs */}
                {selectedEquipment.length > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <h5 className="font-medium text-gray-700 mb-2">Peralatan Tambahan:</h5>
                    {option.breakdown
                      .filter(item => item.type === 'EQUIPMENT')
                      .map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.description}</span>
                          <span>{formatCurrency(item.totalPrice)}</span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Total */}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Jumlah Keseluruhan:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatCurrency(option.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
} 
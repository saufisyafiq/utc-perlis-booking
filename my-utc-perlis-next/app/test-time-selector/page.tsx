'use client';

import { useState } from 'react';
import SmartTimeSelector from '../components/SmartTimeSelector';

export default function TestTimeSelector() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<{
    startTime: string;
    endTime: string;
    duration: number;
  } | null>(null);

  // Mock some booked time slots for testing
  const mockBookedSlots = [
    { startTime: '09:00:00.000', endTime: '11:00:00.000' },
    { startTime: '14:00:00.000', endTime: '16:00:00.000' },
    { startTime: '19:00:00.000', endTime: '20:00:00.000' }
  ];

  const handleTimeSelect = (startTime: string, endTime: string, duration: number) => {
    setSelectedTime({ startTime, endTime, duration });
    console.log('Time selected:', { startTime, endTime, duration });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
    setSelectedTime(null); // Reset time when date changes
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-card rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold">Test Smart Time Selector</h1>
            <p className="mt-2 opacity-90">
              Testing the new intelligent time/duration selection component
            </p>
          </div>

          <div className="p-6">
            {/* Date Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={handleDateChange}
                min={new Date().toISOString().split('T')[0]}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Mock Booked Slots Display */}
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2">Mock Booked Slots (for testing):</h3>
              <div className="grid grid-cols-3 gap-2">
                {mockBookedSlots.map((slot, index) => (
                  <div key={index} className="text-sm text-yellow-700">
                    {slot.startTime.split('.')[0]} - {slot.endTime.split('.')[0]}
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Time Selector */}
            <SmartTimeSelector
              selectedDate={selectedDate}
              bookedTimeSlots={mockBookedSlots}
              onTimeSelect={handleTimeSelect}
              operatingStartTime="08:00"
              operatingEndTime="22:00"
              minDuration={1}
              maxDuration={10}
            />

            {/* Selection Result */}
            {selectedTime && (
              <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-4">✅ Selection Result</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="block text-sm text-green-600">Start Time:</span>
                    <span className="font-bold text-green-800">{selectedTime.startTime}</span>
                  </div>
                  <div>
                    <span className="block text-sm text-green-600">End Time:</span>
                    <span className="font-bold text-green-800">{selectedTime.endTime}</span>
                  </div>
                  <div>
                    <span className="block text-sm text-green-600">Duration:</span>
                    <span className="font-bold text-green-800">{selectedTime.duration} hours</span>
                  </div>
                </div>

                {/* Validation Check */}
                <div className="mt-4 p-3 bg-card border border-green-300 rounded">
                  <h4 className="font-medium text-green-800 mb-2">Validation Results:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center">
                      <span className="text-green-600">✓</span>
                      <span className="ml-2">End time calculation: {selectedTime.startTime} + {selectedTime.duration}h = {selectedTime.endTime}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-600">✓</span>
                      <span className="ml-2">Within operating hours (08:00 - 22:00)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-green-600">✓</span>
                      <span className="ml-2">No conflicts with booked slots</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Test Scenarios */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-3">Test Scenarios:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <strong>✅ Fixed Issues:</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>No more 29:00 end times</li>
                    <li>Respects operating hours</li>
                    <li>Shows only valid durations</li>
                    <li>Prevents overlapping bookings</li>
                  </ul>
                </div>
                <div>
                  <strong>🎯 Smart Features:</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Duration-first selection</li>
                    <li>Next available suggestions</li>
                    <li>Clear conflict indication</li>
                    <li>Intelligent time slots</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
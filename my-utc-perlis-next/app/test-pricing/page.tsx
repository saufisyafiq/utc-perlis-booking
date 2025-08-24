"use client";

import { useState } from 'react';
import { createPricingEngine } from '../lib/pricing-engine';

export default function TestPricing() {
  const [result, setResult] = useState<any>(null);
  const [testScenario, setTestScenario] = useState<string>('');

  // Sample facility data
  const facilityData = {
    name: 'Bilik Mesyuarat A',
    rates: {
      hourlyRate: 50,
      halfDayRate: 200,
      fullDayRate: 300
    },
    equipmentRates: {
      'Laptop': 20,
      'Projector': 30,
      'Microphone': 15
    }
  };

  const testScenarios = [
    {
      name: 'Test 1: 3 hours (should be hourly)',
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      startTime: '09:00',
      endTime: '12:00',
      equipment: []
    },
    {
      name: 'Test 2: 5 hours (should be half day)',
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      startTime: '09:00',
      endTime: '14:00',
      equipment: []
    },
    {
      name: 'Test 3: 8 hours (should be full day)',
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      startTime: '09:00',
      endTime: '17:00',
      equipment: []
    },
    {
      name: 'Test 4: 12 hours (should be full day + hourly)',
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      startTime: '08:00',
      endTime: '20:00',
      equipment: []
    },
    {
      name: 'Test 5: 16 hours full operation (should be full day + hourly)',
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      startTime: '08:00',
      endTime: '23:59',
      equipment: []
    },
    {
      name: 'Test 6: 6 hours with equipment (should choose best option)',
      startDate: '2024-01-15',
      endDate: '2024-01-15',
      startTime: '09:00',
      endTime: '15:00',
      equipment: ['Laptop', 'Projector']
    },
    {
      name: 'Test 7: Multi-day booking (2 days)',
      startDate: '2024-01-15',
      endDate: '2024-01-16',
      startTime: '09:00',
      endTime: '17:00',
      equipment: []
    }
  ];

  const runTest = (scenario: any) => {
    try {
      const pricingEngine = createPricingEngine(facilityData);
      const result = pricingEngine.calculateOptimalPricing(
        scenario.startDate,
        scenario.endDate,
        scenario.startTime,
        scenario.endTime,
        scenario.equipment
      );

      setResult(result);
      setTestScenario(scenario.name);
      
      console.log(`Test: ${scenario.name}`);
      console.log('Result:', result);
      
    } catch (error) {
      console.error('Error running test:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
  };

  const calculateHours = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return Math.ceil((endMinutes - startMinutes) / 60);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Simplified Pricing Engine Test</h1>
      
      {/* Pricing Rules */}
      <div className="mb-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">New Pricing Rules</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Half Day Package:</strong> Fixed 5 hours</p>
          <p><strong>Full Day Package:</strong> Fixed 8 hours</p>
          <p><strong>Operation Hours:</strong> 8:00 AM - 11:59 PM (16 hours total)</p>
          <p><strong>Logic:</strong> System chooses the most cost-effective option</p>
          <p><strong>Full Operation:</strong> 1 day package + hourly rates for remaining hours</p>
        </div>
      </div>

      {/* Sample Facility Data */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Sample Facility Rates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">Facility Rates</h3>
            <ul className="text-sm space-y-1">
              <li>Hourly: RM{facilityData.rates.hourlyRate}</li>
              <li>Half Day (5 hours): RM{facilityData.rates.halfDayRate}</li>
              <li>Full Day (8 hours): RM{facilityData.rates.fullDayRate}</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Equipment Rates (per day)</h3>
            <ul className="text-sm space-y-1">
              {Object.entries(facilityData.equipmentRates).map(([item, rate]) => (
                <li key={item}>{item}: RM{rate}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Test Scenarios */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Scenarios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testScenarios.map((scenario, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <h3 className="font-semibold text-sm mb-2">{scenario.name}</h3>
              <div className="text-xs text-gray-600 mb-2">
                <p>Date: {scenario.startDate} {scenario.startDate !== scenario.endDate ? `- ${scenario.endDate}` : ''}</p>
                <p>Time: {scenario.startTime} - {scenario.endTime}</p>
                <p>Duration: {scenario.startDate === scenario.endDate ? calculateHours(scenario.startTime, scenario.endTime) : 'Multi-day'} hours</p>
                {scenario.equipment.length > 0 && <p>Equipment: {scenario.equipment.join(', ')}</p>}
              </div>
              <button
                onClick={() => runTest(scenario)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Run Test
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Result: {testScenario}</h2>
          
          {result.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">Error: {result.error}</p>
            </div>
          ) : (
            <div className="p-6 bg-card rounded-lg shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg text-green-600 mb-2">
                    Total Price: RM{result.totalPrice.toFixed(2)}
                  </h3>
                  
                  {result.savings && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800">
                        💰 Savings: RM{result.savings.toFixed(2)} (compared to hourly rate)
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Price Breakdown</h3>
                  <div className="space-y-2">
                    {result.breakdown.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.description}
                          {item.quantity > 1 && ` (${item.quantity}x)`}
                        </span>
                        <span className="font-medium">
                          RM{item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Raw JSON for debugging */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600">View Raw Result</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
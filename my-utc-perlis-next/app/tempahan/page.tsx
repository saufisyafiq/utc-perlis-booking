"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import SimpleBookingSelector from '../components/SimpleBookingSelector';
import { SimpleBookingLogic } from '../lib/simple-booking-logic';

interface BookingFormData {
  applicantName: string;
  department: string;
  address: string;
  email: string;
  phoneNumber: string;
  purpose: string;
  eventName: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  attendance: number;
  packageType: 'HOURLY' | 'HALF_DAY' | 'FULL_DAY' | 'MULTI_DAY';
  rental: {
    additionalEquipment: {
      laptop: boolean;
      webCam: boolean;
      [key: string]: boolean;
    };
  };
  food: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    supper: boolean;
    mineralWater: number;
  };
  sessionId: string;
}

interface FacilityData {
  id: string;
  name: string;
  capacity: number;
  documentId: string;
  rates: {
    hourlyRate?: number;
    halfDayRate?: number;
    fullDayRate?: number;
  };
  equipmentRates?: {
    [key: string]: number;
  };
  minimumDuration?: number;
  image?: Array<{
    id: number;
    url: string;
    formats: {
      large?: {
        url: string;
      };
      medium?: {
        url: string;
      };
      small?: {
        url: string;
      };
      thumbnail?: {
        url: string;
      };
    };
  }>;
}

function BookingFormContent() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BookingFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [priceBreakdown, setPriceBreakdown] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [facilityData, setFacilityData] = useState<FacilityData| null>(null);
  const [capacityError, setCapacityError] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string>('');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [sessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [bookingData, setBookingData] = useState<any>(null);
  const searchParams = useSearchParams();
  const facilityId = searchParams.get('facilityId');
  
  // New states for availability
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [dateAvailability, setDateAvailability] = useState<{
    available: boolean;
    partiallyAvailable: boolean;
    bookedTimeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  } | null>(null);

  // New state to track actual duration in hours
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  
  // File attachment states
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileUploadError, setFileUploadError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Fetch facility data
  useEffect(() => {
    const fetchFacility = async () => {
      if (!facilityId) return;
      try {
        // For debugging - log the fetch URL
        console.log(`Fetching from: ${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/facilities?filters[documentId][$eq]=${facilityId}&populate=*`);
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/facilities?filters[documentId][$eq]=${facilityId}&populate=*`, {
          cache: 'no-store'
        });
        
        if (!res.ok) throw new Error('Failed to fetch facility');
        
        const responseData = await res.json();
        console.log('Facility API response:', responseData);
        
        if (responseData.data && responseData.data.length > 0) {
          // Log the facility data to see its structure
          console.log('Facility data:', responseData.data[0]);
          setFacilityData(responseData.data[0]);
        }
      } catch (error) {
        console.error('Error fetching facility:', error);
      }
    };
    fetchFacility();
  }, [facilityId]);

  const [today, setToday] = useState('');

  // Initialize date on client side only
  useEffect(() => {
    const now = new Date();
    const formattedToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
    setToday(formattedToday);
    
      // Set sessionId in the form
  setValue('sessionId', sessionId);
}, [sessionId, setValue]);

// Map package type to form enum
const mapToFormPackageType = useCallback((packageType: string): 'HOURLY' | 'HALF_DAY' | 'FULL_DAY' | 'MULTI_DAY' => {
  switch (packageType) {
    case 'PER_JAM':
      return 'HOURLY';
    case 'SEPARUH_HARI':
      return 'HALF_DAY';
    case 'SEHARI':
      return 'FULL_DAY';
    case 'MULTI_DAY':
      return 'MULTI_DAY';
    default:
      return 'HOURLY';
  }
}, []);

// Memoize the onBookingChange callback to prevent infinite re-renders
const handleBookingChange = useCallback((booking: any) => {
  setValue('startTime', booking.startTime);
  setValue('endTime', booking.endTime);
  setValue('startDate', booking.startDate);
  setValue('endDate', booking.endDate);
  setValue('attendance', booking.attendance);
  setValue('packageType', mapToFormPackageType(booking.packageType || 'PER_JAM'));
  
  // Don't set the price directly from booking - let calculatePrice handle it
  // This allows equipment and water costs to be included
  setBookingData(booking);
  console.log('Booking data updated:', booking);
}, [setValue, mapToFormPackageType]);

// Memoize facility rates to prevent object recreation
const memoizedFacilityRates = useMemo(() => ({
  hourlyRate: facilityData?.rates?.hourlyRate || 50,
  halfDayRate: facilityData?.rates?.halfDayRate || 250,
  fullDayRate: facilityData?.rates?.fullDayRate || 400
}), [facilityData?.rates?.hourlyRate, facilityData?.rates?.halfDayRate, facilityData?.rates?.fullDayRate]);

// Memoize existing bookings to prevent array recreation
const memoizedExistingBookings = useMemo(() => {
  if (!dateAvailability?.bookedTimeSlots) return [];
  return dateAvailability.bookedTimeSlots.map(slot => ({
    startTime: slot.startTime.replace('.000', ''),
    endTime: slot.endTime.replace('.000', '')
  }));
}, [dateAvailability?.bookedTimeSlots]);

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const startTimeForm = watch('startTime');
  const endTime = watch('endTime');
  const peralatanTambahan = watch('rental.additionalEquipment');
  const bilanganKehadiran = watch('attendance');
  const mineralWater = watch('food.mineralWater') || 0;

  // Calculate days difference
  const calculateDaysDifference = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Reset time part to compare only dates
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return start.getTime() === end.getTime() ? 0 : 1;
  };

  // Calculate price using the simplified pricing engine
  const calculatePrice = useCallback(() => {
    if (!facilityData || !startDate || !endDate || !startTimeForm || !endTime) {
      return;
    }

    // Get selected equipment
    const selectedEquipment: string[] = [];
    if (peralatanTambahan && facilityData.equipmentRates) {
      Object.entries(facilityData.equipmentRates).forEach(([equipment, rate]) => {
        const equipmentKey = equipment.toLowerCase().replace(/\s+/g, '');
        if (peralatanTambahan[equipmentKey]) {
          selectedEquipment.push(equipment);
        }
      });
    }

    // Calculate water cost (RM1.00 per bottle)
    const waterCost = mineralWater * 1.00;

    // Use the simplified pricing engine
    try {
      const { createPricingEngine } = require('../lib/pricing-engine');
      const pricingEngine = createPricingEngine(facilityData);
      
      const result = pricingEngine.calculateOptimalPricing(
        startDate,
        endDate,
        startTimeForm,
        endTime,
        selectedEquipment
      );

      // Add water cost to total
      const totalWithWater = result.totalPrice + waterCost;
      setTotalPrice(totalWithWater);
      
      // Create a simple breakdown for display
      const breakdown = result.breakdown.map((item: any) => 
        item.quantity > 1 
          ? `${item.description}: RM${item.unitPrice} × ${item.quantity} = RM${item.totalPrice}`
          : `${item.description}: RM${item.totalPrice}`
      );
      
      // Add water cost to breakdown if applicable
      if (waterCost > 0) {
        breakdown.push(`Air Mineral: RM1.00 × ${mineralWater} = RM${waterCost.toFixed(2)}`);
      }
      
      // Add savings note if applicable
      if (result.savings && result.savings > 0) {
        breakdown.push(`💰 Jimat: RM${result.savings.toFixed(2)} (berbanding kadar per jam)`);
      }
      
      setPriceBreakdown(breakdown.join('\n'));
      
    } catch (error) {
      console.error('Error calculating simplified pricing:', error);
      // Fallback to backend-style calculation
      if (startTimeForm && endTime) {
        // Use exact backend logic for time calculation
        const parseTimeToMinutes = (timeString: string): number => {
          const [hours, minutes] = timeString.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const startMinutes = parseTimeToMinutes(startTimeForm);
        const endMinutes = parseTimeToMinutes(endTime);
        const hours = Math.ceil((endMinutes - startMinutes) / 60);
        
        if (hours > 0) {
        const hourlyRate = facilityData.rates?.hourlyRate || 50;
          const basePrice = hours * hourlyRate;
        let equipmentPrice = 0;
        
        selectedEquipment.forEach(equipment => {
          const rate = facilityData.equipmentRates?.[equipment] || 0;
          equipmentPrice += rate;
        });
        
        const totalFallback = basePrice + equipmentPrice + waterCost;
        setTotalPrice(totalFallback);
        
          const fallbackBreakdown = [`Sewa Fasiliti (${hours} jam): RM${basePrice}`];
        if (equipmentPrice > 0) {
          fallbackBreakdown.push(`Peralatan: RM${equipmentPrice}`);
        }
        if (waterCost > 0) {
          fallbackBreakdown.push(`Air Mineral: RM${waterCost.toFixed(2)}`);
        }
        
        setPriceBreakdown(fallbackBreakdown.join('\n'));
        }
      }
    }
  }, [facilityData, startDate, endDate, startTimeForm, endTime, peralatanTambahan, mineralWater, selectedDuration]);

  // Reset times when dates change
  useEffect(() => {
    setValue('startTime', '');
    setValue('endTime', '');
  }, [startDate, endDate]);

  // Add capacity validation using centralized logic
  useEffect(() => {
    if (facilityData && bilanganKehadiran) {
      const validationResult = SimpleBookingLogic.validateBooking({
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0],
        startTime: startTimeForm || '08:00',
        endTime: endTime || '09:00',
        attendance: bilanganKehadiran,
        facilityCapacity: facilityData.capacity
      }, []);

      if (!validationResult.isValid && validationResult.error?.includes('kapasiti')) {
        setCapacityError(validationResult.error);
      } else {
        setCapacityError('');
      }
    }
  }, [bilanganKehadiran, facilityData, startDate, endDate, startTimeForm, endTime]);

  // Add animated loading and validation indication for better UX
  useEffect(() => {
    // Add a small loading delay for UX
    if (facilityData && startDate && endDate) {
      calculatePrice();
    }
  }, [calculatePrice, facilityData, startDate, endDate, startTimeForm, endTime, peralatanTambahan, mineralWater]);

  // Additional useEffect to ensure price calculation when step changes to 4
  useEffect(() => {
    if (activeStep === 4 && facilityData && startDate && endDate && startTimeForm && endTime) {
      setTimeout(() => calculatePrice(), 100);
    }
  }, [activeStep, calculatePrice, facilityData, startDate, endDate, startTimeForm, endTime]);

  // Handle multi-day booking automatic time setting
  useEffect(() => {
    if (selectedEndDate && selectedDate) {
      // Multi-day booking - set standard operating hours
      setValue('startTime', '08:00');
      setValue('endTime', '22:00');
      setValue('packageType', 'MULTI_DAY');
      setStartTime('08:00');
      setSelectedDuration(14); // 14 hours per day
    }
  }, [selectedDate, selectedEndDate, setValue]);

  // Helper function to determine if a section is complete
  const isSectionComplete = (section: number): boolean => {
    switch (section) {
      case 1:
        return !!(watch('applicantName') && watch('department') && watch('address') && watch('phoneNumber') && watch('email'));
      case 2:
        return !!(watch('purpose') && watch('eventName') && watch('startDate') && watch('endDate') && watch('attendance') && watch('packageType'));
      case 3:
        return true; // Equipment is optional
      default:
        return false;
    }
  };

  // Helper function to validate specific steps
  const validateStep = (step: number): string[] => {
    const stepErrors: string[] = [];
    
    switch (step) {
      case 1:
        if (!watch('applicantName')) stepErrors.push('Nama diperlukan');
        if (!watch('department')) stepErrors.push('Jabatan diperlukan');
        if (!watch('address')) stepErrors.push('Alamat diperlukan');
        if (!watch('phoneNumber')) stepErrors.push('No. Telefon diperlukan');
        if (!watch('email')) stepErrors.push('Alamat Emel diperlukan');
        
        // Additional validation for format
        if (watch('applicantName') && watch('applicantName').length < 2) stepErrors.push('Nama mestilah sekurang-kurangnya 2 aksara');
        if (watch('department') && watch('department').length < 2) stepErrors.push('Jabatan mestilah sekurang-kurangnya 2 aksara');
        if (watch('address') && watch('address').length < 10) stepErrors.push('Alamat mestilah sekurang-kurangnya 10 aksara');
        if (watch('phoneNumber') && !/^[0-9+\-() ]{8,15}$/.test(watch('phoneNumber'))) stepErrors.push('Format no. telefon tidak sah');
        if (watch('email') && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(watch('email'))) stepErrors.push('Format email tidak sah');
        break;
        
      case 2:
        if (!watch('purpose')) stepErrors.push('Tujuan diperlukan');
        if (!watch('eventName')) stepErrors.push('Nama acara diperlukan');
        if (!selectedDate) stepErrors.push('Tarikh diperlukan');
        if (!bookingData?.isValid) stepErrors.push('Masa tempahan tidak sah');
        break;
        
      case 3:
        // Equipment is optional, no validation needed
        break;
        
      case 4:
        // Food is optional, no validation needed
        break;
    }
    
    return stepErrors;
  };

  // Helper function to get all validation errors
  const getAllValidationErrors = (): { [key: number]: string[] } => {
    const allErrors: { [key: number]: string[] } = {};
    for (let i = 1; i <= 4; i++) {
      const stepErrors = validateStep(i);
      if (stepErrors.length > 0) {
        allErrors[i] = stepErrors;
      }
    }
    return allErrors;
  };

  const onSubmit = async (data: BookingFormData) => {
    console.log('🚀 FORM SUBMIT TRIGGERED!');
    console.log('Form submitted with data:', data);
    console.log('Booking data:', bookingData);
    console.log('Selected date:', selectedDate);
    console.log('Active step:', activeStep);
    
    // Only validate on final submission (step 4)
    if (activeStep === 4) {
      // Check for validation errors across all steps
      const allErrors = getAllValidationErrors();
      const hasErrors = Object.keys(allErrors).length > 0;
      
      if (hasErrors) {
        console.log('Form has validation errors:', allErrors);
        
        // Find the first step with errors
        const firstErrorStep = Math.min(...Object.keys(allErrors).map(Number));
        
        // Navigate to the first step with errors
        setActiveStep(firstErrorStep);
        
        // Show a simple error message
        setSubmitError(`Sila betulkan maklumat di Langkah ${firstErrorStep} sebelum menghantar`);
        
        // Scroll to top to show the error
        window.scrollTo(0, 0);
        return;
      }
    }
    
    // Validate that we have booking data from the selector
    if (!bookingData || !bookingData.isValid) {
      console.log('Invalid booking data:', bookingData);
      setSubmitError('Sila pilih masa tempahan yang sah');
      setActiveStep(2); // Navigate to booking step
      return;
    }
    
    // Additional validation: Check if selected dates are available
    if (!selectedDate) {
      console.log('No selected date');
      setSubmitError('Sila pilih tarikh untuk tempahan');
      setActiveStep(2); // Navigate to booking step
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);
    
    try {
      // Map package types back to schema format
      const mapPackageType = (packageType: string): string => {
        switch (packageType) {
          case 'PER_JAM':
            return 'HOURLY';
          case 'SEPARUH_HARI':
            return 'HALF_DAY';
          case 'SEHARI':
            return 'FULL_DAY';
          case 'MULTI_DAY':
            return 'MULTI_DAY';
          default:
            return 'HOURLY';
        }
      };

      // Map duration for rentDetails
      const mapDuration = (packageType: string): string => {
        switch (packageType) {
          case 'PER_JAM':
            return 'PER_JAM';
          case 'SEPARUH_HARI':
            return '1/2_HARI';
          case 'SEHARI':
            return '1_HARI';
          case 'MULTI_DAY':
            return 'MULTI_HARI';
          default:
            return 'PER_JAM';
        }
      };

      // Calculate the frontend total price to send to backend
      let frontendTotalPrice = totalPrice;
      
      // If totalPrice is 0, calculate it using the same logic as the display
      if (frontendTotalPrice === 0) {
        let calculatedTotal = 0;
        
        // Add facility cost if we have booking data - using backend logic
        if (startTimeForm && endTime && facilityData?.rates) {
          const parseTimeToMinutes = (timeString: string): number => {
            const [hours, minutes] = timeString.split(':').map(Number);
            return hours * 60 + minutes;
          };
          
          const startMinutes = parseTimeToMinutes(startTimeForm);
          const endMinutes = parseTimeToMinutes(endTime);
          const hours = Math.ceil((endMinutes - startMinutes) / 60);
          
          if (hours > 0) {
            const hourlyRate = facilityData.rates.hourlyRate || 50;
            calculatedTotal += hours * hourlyRate;
          }
        }
        
        // Add equipment cost
        if (peralatanTambahan && facilityData?.equipmentRates) {
          Object.entries(facilityData.equipmentRates).forEach(([equipment, rate]) => {
            const equipmentKey = equipment.toLowerCase().replace(/\s+/g, '');
            if (peralatanTambahan[equipmentKey]) {
              calculatedTotal += rate;
            }
          });
        }
        
        // Add water cost
        if (mineralWater > 0) {
          calculatedTotal += mineralWater * 1.00;
        }
        
        frontendTotalPrice = calculatedTotal;
      }

      console.log('💰 Frontend sending price:', {
        totalPriceState: totalPrice,
        calculatedPrice: frontendTotalPrice,
        hasEquipment: peralatanTambahan ? Object.keys(peralatanTambahan).filter(key => peralatanTambahan[key]).length : 0,
        waterCost: mineralWater * 1.00
      });

      // Prepare booking data for Strapi
      const strapiBookingData = {
        applicantName: data.applicantName,
        department: data.department,
        address: data.address,
        email: data.email,
        phoneNumber: data.phoneNumber,
        purpose: data.purpose,
        eventName: data.eventName,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        attendance: bookingData.attendance,
        packageType: mapPackageType(bookingData.packageType || 'PER_JAM'),
        rental: {
          duration: mapDuration(bookingData.packageType || 'PER_JAM'),
          additionalEquipment: data.rental?.additionalEquipment || {}
        },
        food: data.food || {},
        facilityId: facilityData?.documentId || facilityId,
        sessionId: data.sessionId,
        frontendCalculatedPrice: frontendTotalPrice // Send the frontend-calculated total
      };

      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add booking data as JSON string
      formData.append('data', JSON.stringify(strapiBookingData));
      
      // Add files
      attachedFiles.forEach((file, index) => {
        formData.append(`dokumen_berkaitan`, file);
      });

      // Submit the booking
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        body: formData, // Use FormData instead of JSON
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to submit booking');
      }

      const result = await response.json();
      if (result.success) {
        setSubmitSuccess(true);
        
        // Show success message with file upload info
        let successMessage = 'Tempahan anda telah berjaya dihantar.';
        if (result.filesUploaded > 0) {
          successMessage += ` ${result.filesUploaded} fail dokumen juga telah berjaya dimuat naik.`;
        }
        setSubmitSuccessMessage(successMessage);
        setSubmitError(''); // Clear any previous errors
        
        // Prepare success page URL with booking details
        const successParams = new URLSearchParams({
          bookingNumber: result.bookingNumber || 'N/A',
          name: data.applicantName,
          email: data.email,
          eventName: data.eventName,
          facility: facilityData?.name || 'N/A',
          startDate: bookingData.startDate,
          endDate: bookingData.endDate,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          totalPrice: frontendTotalPrice.toString()
        });
        
        // Reset form after successful submission and redirect with details
        setTimeout(() => {
          window.location.href = `/tempahan/success?${successParams.toString()}`;
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to submit booking');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    const currentStepErrors = validateStep(activeStep);
    
    if (currentStepErrors.length > 0) {
      console.log(`Step ${activeStep} has validation errors:`, currentStepErrors);
      
      // Show error message
      setSubmitError(`Sila betulkan ralat berikut: ${currentStepErrors.join(', ')}`);
      
      // Clear error after 5 seconds
      setTimeout(() => setSubmitError(''), 5000);
      
      // Trigger form validation to show field-specific errors
      handleSubmit(() => {})();
      return;
    }
    
    // Clear any previous errors
    setSubmitError('');
    
    // Proceed to next step
    const newStep = Math.min(activeStep + 1, 4);
    setActiveStep(newStep);
    
    // If moving to final step, recalculate price to ensure it's displayed
    if (newStep === 4) {
      setTimeout(() => calculatePrice(), 200);
    }
    
    window.scrollTo(0, 0);
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const renderStepIndicator = () => {
    return (
      <div className="mb-8">
        <ol className="flex items-center w-full text-sm font-medium text-center text-gray-500 sm:text-base">
          {[1, 2, 3, 4].map(step => {
            const isCompleted = activeStep > step;
            const isActive = activeStep === step;
            
            return (
              <li key={step} className={`flex md:w-full items-center ${
                isActive 
                  ? 'text-blue-600' 
                  : isCompleted 
                    ? 'text-green-600' 
                    : 'text-gray-500'
              }`}>
                <span className={`flex items-center justify-center w-8 h-8 mr-2 ${
                  isActive 
                    ? 'bg-blue-100' 
                    : isCompleted 
                      ? 'bg-green-100' 
                      : 'bg-gray-100'
                } rounded-full shrink-0`}>
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5 text-green-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 12">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 5.917 5.724 10.5 15 1.5"/>
                    </svg>
                  ) : (
                    step
                  )}
                </span>
                <span className="hidden md:inline-flex">
                  {step === 1 && 'Maklumat Pemohon'}
                  {step === 2 && 'Maklumat Tempahan'}
                  {step === 3 && 'Fasiliti Sewaan'}
                  {step === 4 && 'Makanan & Minuman'}
                </span>
                <span className="md:hidden">
                  {step === 1 && 'Pemohon'}
                  {step === 2 && 'Tempahan'}
                  {step === 3 && 'Fasiliti'}
                  {step === 4 && 'Makanan'}
                </span>
                
                {/* Show connector lines between steps except for the last one */}
                {step < 4 && (
                  <div className="flex-auto border-t-2 transition duration-500 ease-in-out border-gray-300 mx-2"></div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  // Debug image URL when facility data changes
  useEffect(() => {
    if (facilityData?.image && facilityData.image.length > 0) {
      console.log('Image data:', facilityData.image[0]);
      console.log('Image URL:', `${process.env.NEXT_PUBLIC_STRAPI_API_URL}${
        facilityData.image[0].formats?.medium?.url || 
        facilityData.image[0].formats?.small?.url || 
        facilityData.image[0].formats?.thumbnail?.url || 
        facilityData.image[0].url
      }`);
    }
  }, [facilityData]);

  // Handle date selection from the calendar with range support
  const handleDateSelect = (date: Date, availability: {
    available: boolean;
    partiallyAvailable: boolean;
    bookedTimeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  }) => {
    if (!selectedDate || selectedEndDate) {
      // Starting new selection
      setSelectedDate(date);
      setSelectedEndDate(null);
      setValue('startDate', format(date, 'yyyy-MM-dd'));
      setValue('endDate', format(date, 'yyyy-MM-dd'));
    } else {
      // Completing range selection
      if (date > selectedDate) {
        setSelectedEndDate(date);
        setValue('endDate', format(date, 'yyyy-MM-dd'));
      } else if (date < selectedDate) {
        // If selected date is before start date, swap them
        setSelectedEndDate(selectedDate);
        setSelectedDate(date);
        setValue('startDate', format(date, 'yyyy-MM-dd'));
        setValue('endDate', format(selectedDate, 'yyyy-MM-dd'));
      } else {
        // Same date clicked - reset to single day
        setSelectedEndDate(null);
        setValue('endDate', format(date, 'yyyy-MM-dd'));
      }
    }
    
    setDateAvailability(availability);
    
    // Reset time values when date changes
    setValue('startTime', '');
    setValue('endTime', '');
  };
  
  // Handle time slot selection
  const handleTimeSelect = (startTime: string, endTime: string, duration: number) => {
    setValue('startTime', startTime);
    setValue('endTime', endTime);
    setStartTime(startTime);
    setSelectedDuration(duration); // Track actual duration
    
    // For single-day bookings, use smart package selection
    if (duration >= 8) {
      setValue('packageType', 'FULL_DAY');
      // For full day, use operating hours
      setValue('startTime', '08:00');
      setValue('endTime', '22:00');
      setStartTime('08:00');
      setSelectedDuration(14);
    } else if (duration >= 4) {
      setValue('packageType', 'HALF_DAY');
    } else {
      setValue('packageType', 'HOURLY');
    }
    
    // Recalculate price immediately
    setTimeout(() => calculatePrice(), 100);
  };

  // File handling functions
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];

    if (file.size > maxSize) {
      return 'Saiz fail tidak boleh melebihi 10MB';
    }

    if (!allowedTypes.includes(file.type)) {
      return 'Format fail tidak disokong. Sila gunakan PDF, DOC, DOCX, atau gambar (JPEG, PNG, GIF)';
    }

    return null;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        // Check if file already exists
        const exists = attachedFiles.some(existingFile => 
          existingFile.name === file.name && existingFile.size === file.size
        );
        if (!exists) {
          newFiles.push(file);
        } else {
          errors.push(`${file.name}: Fail sudah dilampirkan`);
        }
      }
    });

    if (errors.length > 0) {
      setFileUploadError(errors.join('\n'));
      setTimeout(() => setFileUploadError(''), 5000);
    } else {
      setFileUploadError('');
    }

    if (newFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileRemove = (fileToRemove: File) => {
    setAttachedFiles(prev => prev.filter(file => file !== fileToRemove));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File): string => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type === 'application/pdf') return '📄';
    if (file.type.includes('word') || file.type.includes('document')) return '📝';
    return '📎';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Permohonan Tempahan {facilityData?.name}</h1>
      
      {/* Facility Details Card */}
      {facilityData && (
        <div className="mb-8 bg-card rounded-lg shadow-md overflow-hidden border border-border">
          <div className="flex flex-col md:flex-row">
            <div className="p-6 md:w-2/3 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{facilityData.name}</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-gray-700">Kapasiti <strong className="text-gray-900">{facilityData.capacity}</strong> orang</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-700">Tempoh minimum: <strong className="text-gray-900">{facilityData.minimumDuration || 1}</strong> jam</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold uppercase text-blue-700 mb-2">Kadar Sewaan</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card p-3 rounded border border-blue-100 text-center">
                    <div className="text-xs text-gray-500 mb-1">Per Jam</div>
                    <div className="font-bold text-blue-600">RM {facilityData.rates.hourlyRate}</div>
                  </div>
                  <div className="bg-card p-3 rounded border border-blue-100 text-center">
                    <div className="text-xs text-gray-500 mb-1">Separuh Hari</div>
                    <div className="font-bold text-blue-600">RM {facilityData.rates.halfDayRate}</div>
                  </div>
                  <div className="bg-card p-3 rounded border border-blue-100 text-center">
                    <div className="text-xs text-gray-500 mb-1">Satu Hari</div>
                    <div className="font-bold text-blue-600">RM {facilityData.rates.fullDayRate}</div>
                  </div>
                </div>
              </div>
            </div>
            {facilityData.image && facilityData.image.length > 0 && (
              <div className="md:w-1/3 relative">
                <Image 
                  src={`${process.env.NEXT_PUBLIC_STRAPI_API_URL}${
                    facilityData.image[0].formats?.medium?.url || 
                    facilityData.image[0].formats?.small?.url || 
                    facilityData.image[0].formats?.thumbnail?.url || 
                    facilityData.image[0].url
                  }`} 
                  alt={facilityData.name} 
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute bottom-0 right-0 bg-blue-500 text-white px-4 py-2 text-sm font-semibold">
                  Tempahan Baru
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {renderStepIndicator()}
      
      <form onSubmit={handleSubmit(onSubmit, (errors) => {
        console.log('❌ FORM VALIDATION ERRORS:', errors);
        console.log('Current form values:', watch());
      })} className="space-y-6">
        {/* Debug section - Remove this in production */}
        

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {submitError}</span>
          </div>
        )}


        
        {submitSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Success!</strong>
            <span className="block sm:inline"> {submitSuccessMessage} Redirecting...</span>
          </div>
        )}
        
        {!facilityData && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-lg">Memuat data fasiliti...</p>
          </div>
        )}
        
        {facilityData && (
          <>
        {/* Maklumat Pemohon */}
            <section className={`bg-gray-50 p-6 rounded-lg ${activeStep !== 1 ? 'hidden' : ''}`}>
          <h2 className="text-xl font-semibold mb-4">A. Maklumat Pemohon</h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-1">Nama</label>
              <input
                type="text"
                {...register('applicantName', { 
                  required: 'Nama diperlukan',
                  minLength: { value: 2, message: 'Nama mestilah sekurang-kurangnya 2 aksara' },
                  maxLength: { value: 100, message: 'Nama tidak boleh melebihi 100 aksara' }
                })}
                className="w-full p-2 border rounded"
              />
              {errors.applicantName && <span className="text-red-500 text-sm">{errors.applicantName.message}</span>}
            </div>

            <div>
              <label className="block mb-1">Jabatan / Agensi</label>
              <input
                type="text"
                {...register('department', { 
                  required: 'Jabatan diperlukan',
                  minLength: { value: 2, message: 'Jabatan mestilah sekurang-kurangnya 2 aksara' },
                  maxLength: { value: 200, message: 'Jabatan tidak boleh melebihi 200 aksara' }
                })}
                className="w-full p-2 border rounded"
              />
              {errors.department && <span className="text-red-500 text-sm">{errors.department.message}</span>}
            </div>

            <div>
              <label className="block mb-1">Alamat</label>
              <textarea
                {...register('address', { 
                  required: 'Alamat diperlukan',
                  minLength: { value: 10, message: 'Alamat mestilah sekurang-kurangnya 10 aksara' },
                  maxLength: { value: 500, message: 'Alamat tidak boleh melebihi 500 aksara' }
                })}
                className="w-full p-2 border rounded"
                rows={3}
              />
              {errors.address && <span className="text-red-500 text-sm">{errors.address.message}</span>}
            </div>

            <div>
              <label className="block mb-1">No. Telefon</label>
              <input
                type="tel"
                {...register('phoneNumber', { 
                  required: 'No. Telefon diperlukan',
                  pattern: {
                    value: /^[0-9+\-() ]{8,15}$/,
                    message: 'Format no. telefon tidak sah (8-15 digit, boleh guna +, -, (), spasi)'
                  }
                })}
                className="w-full p-2 border rounded"
                placeholder="cth: 012-345-6789"
              />
              {errors.phoneNumber && <span className="text-red-500 text-sm">{errors.phoneNumber.message}</span>}
            </div>

            <div>
              <label className="block mb-1">Alamat Emel</label>
              <input
                type="email"
                {...register('email', { 
                  required: 'Alamat Emel diperlukan',
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: 'Format email tidak sah'
                  }
                })}
                className="w-full p-2 border rounded"
                placeholder="cth: nama@email.com"
              />
              {errors.email && <span className="text-red-500 text-sm">{errors.email.message}</span>}
            </div>
          </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  <span>Seterusnya</span>
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                  </svg>
                </button>
              </div>
        </section>

        {/* Maklumat Tempahan */}
            <section className={`bg-gray-50 p-6 rounded-lg ${activeStep !== 2 ? 'hidden' : ''}`}>
          <h2 className="text-xl font-semibold mb-4">B. Maklumat Tempahan</h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-1">Tujuan Kegunaan</label>
              <input
                type="text"
                {...register('purpose', { 
                  required: 'Tujuan diperlukan',
                  minLength: { value: 5, message: 'Tujuan mestilah sekurang-kurangnya 5 aksara' },
                  maxLength: { value: 500, message: 'Tujuan tidak boleh melebihi 500 aksara' }
                })}
                className="w-full p-2 border rounded"
              />
              {errors.purpose && <span className="text-red-500 text-sm">{errors.purpose.message}</span>}
            </div>

            <div>
              <label className="block mb-1">Nama Acara</label>
              <input
                type="text"
                {...register('eventName', { 
                  required: 'Nama acara diperlukan',
                  minLength: { value: 2, message: 'Nama acara mestilah sekurang-kurangnya 2 aksara' },
                  maxLength: { value: 200, message: 'Nama acara tidak boleh melebihi 200 aksara' }
                })}
                className="w-full p-2 border rounded"
              />
              {errors.eventName && <span className="text-red-500 text-sm">{errors.eventName.message}</span>}
            </div>

            {/* Unified Date & Time Selection */}
            <div className="mt-6 mb-6">
              <label className="block mb-2 text-lg font-medium">Pilih Tarikh & Masa</label>
              
              {/* Date Selection Instructions */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Cara memilih:</strong> Klik pada tarikh untuk tempahan satu hari, atau klik tarikh kedua untuk tempahan multi-hari.
                  Klik tarikh yang sama dua kali untuk reset.
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  <strong>Nota:</strong> Tempahan mesti dibuat sekurang-kurangnya 1 hari sebelum tarikh tempahan. 
                  Masa operasi: {SimpleBookingLogic.getOperatingHours()}
                </p>
              </div>



              {/* Selected Date Range Display */}
              {selectedDate && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Tempahan Dipilih</h4>
                  {selectedEndDate ? (
                    <div>
                      <div className="text-lg font-semibold text-green-800">
                        📅 Tempahan Multi-Hari: {format(selectedDate, 'dd MMM')} - {format(selectedEndDate, 'dd MMM yyyy')}
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        Jumlah: {Math.ceil((selectedEndDate.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} hari
                      </div>
                      <div className="mt-2 text-sm text-green-700">
                        ⏰ <strong>Masa:</strong> 8:00 AM - 10:00 PM setiap hari (automatik)
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-lg font-semibold text-green-800">
                        📅 Tempahan Satu Hari: {format(selectedDate, 'dd MMMM yyyy')}
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        Sila pilih masa di sebelah kanan, atau klik tarikh lain untuk tempahan multi-hari
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendar for date selection */}
                <div>
                  {facilityId && (
                    <AvailabilityCalendar
                      facilityId={facilityId}
                      selectedStartDate={selectedDate}
                      selectedEndDate={selectedEndDate}
                      onDateSelect={handleDateSelect}
                    />
                  )}
                </div>
                
                {/* Time slot selection - only for single-day bookings */}
                <div>
                  {selectedDate && dateAvailability && !selectedEndDate && (
                    <SimpleBookingSelector
                      selectedDate={selectedDate}
                      existingBookings={memoizedExistingBookings}
                      facilityRates={memoizedFacilityRates}
                      facilityCapacity={facilityData?.capacity || 100}
                      onBookingChange={handleBookingChange}
                    />
                  )}
                  
                  {/* Multi-day booking info */}
                  {selectedDate && selectedEndDate && (
                    <div className="bg-card rounded-lg border border-border p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Tempahan Multi-Hari
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-medium text-green-800 mb-2">Masa Operasi Standard</h4>
                          <div className="text-sm text-green-700">
                            <div className="flex justify-between items-center mb-2">
                              <span>Masa Mula:</span>
                              <span className="font-semibold">8:00 AM</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                              <span>Masa Tamat:</span>
                              <span className="font-semibold">10:00 PM</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Jam Per Hari:</span>
                              <span className="font-semibold">14 jam</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800">
                            <strong>Automatik:</strong> Untuk tempahan multi-hari, sistem akan menggunakan 
                            masa operasi penuh (8:00 AM - 10:00 PM) untuk setiap hari tempahan.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEndDate(null);
                            setValue('endDate', format(selectedDate, 'yyyy-MM-dd'));
                            setValue('startTime', '');
                            setValue('endTime', '');
                          }}
                          className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200 transition-colors"
                        >
                          🔄 Tukar ke Tempahan Satu Hari
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Placeholder when no date selected */}
                  {!selectedDate && (
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
                      <div className="text-gray-400 mb-2">📅</div>
                      <p className="text-gray-600">Sila pilih tarikh dari kalendar</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hidden form fields for dates and times (will be set automatically) */}
            <input type="hidden" {...register('startDate', { required: true })} />
            <input type="hidden" {...register('endDate', { required: true })} />
            <input type="hidden" {...register('startTime', { required: true })} />
            <input type="hidden" {...register('endTime', { required: true })} />
            <input type="hidden" {...register('packageType', { required: true })} />
            <input type="hidden" {...register('sessionId', { required: true })} />


          </div>
              
              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
                >
                  <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
                  </svg>
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  <span>Seterusnya</span>
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                  </svg>
                </button>
              </div>
        </section>

        {/* Fasiliti Sewaan */}
            <section className={`bg-gray-50 p-6 rounded-lg ${activeStep !== 3 ? 'hidden' : ''}`}>
          <h2 className="text-xl font-semibold mb-4">C. Fasiliti Sewaan</h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-2">Peralatan Tambahan</label>
              {facilityData?.equipmentRates && Object.entries(facilityData.equipmentRates).map(([equipment, rate]) => {
                const equipmentKey = equipment.toLowerCase().replace(/\s+/g, '');
                return (
                  <div key={equipment} className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id={equipment}
                      {...register(`rental.additionalEquipment.${equipmentKey}`)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      onChange={(e) => {
                        setValue(`rental.additionalEquipment.${equipmentKey}`, e.target.checked);
                        // Trigger price calculation after a short delay to ensure state updates
                        setTimeout(() => calculatePrice(), 100);
                      }}
                    />
                    <label htmlFor={equipment} className="text-gray-700 flex-1">
                      {equipment}
                    </label>
                    <span className="text-blue-600 font-semibold">
                      RM{rate}
                    </span>
                  </div>
                );
              })}

              {/* Equipment Cost Summary */}
              {facilityData?.equipmentRates && peralatanTambahan && (() => {
                let equipmentTotal = 0;
                const selectedItems: string[] = [];
                Object.entries(facilityData.equipmentRates).forEach(([equipment, rate]) => {
                  const equipmentKey = equipment.toLowerCase().replace(/\s+/g, '');
                  if (peralatanTambahan[equipmentKey]) {
                    equipmentTotal += rate;
                    selectedItems.push(equipment);
                  }
                });
                
                if (equipmentTotal > 0) {
                  return (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">
                        📋 Peralatan Dipilih
                      </h4>
                      <div className="space-y-1">
                        {selectedItems.map((item, index) => (
                          <div key={index} className="text-sm text-blue-700 flex justify-between">
                            <span>{item}</span>
                            <span>RM{facilityData.equipmentRates![item]}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-blue-200 mt-2 pt-2">
                        <div className="text-sm font-semibold text-blue-800 flex justify-between">
                          <span>Jumlah Peralatan:</span>
                          <span>RM{equipmentTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

                  {(!facilityData?.equipmentRates || Object.keys(facilityData.equipmentRates).length === 0) && (
                    <p className="text-gray-500 italic">Tiada peralatan tambahan untuk fasiliti ini.</p>
                  )}
            </div>
          </div>
              
              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
                >
                  <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
                  </svg>
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  <span>Seterusnya</span>
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                  </svg>
                </button>
              </div>
        </section>

        {/* Makanan dan Minuman */}
            <section className={`bg-gray-50 p-6 rounded-lg ${activeStep !== 4 ? 'hidden' : ''}`}>
          <h2 className="text-xl font-semibold mb-4">D. Maklumat Tempahan Makanan dan Minuman</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  {...register('food.breakfast')}
                  className="mr-2"
                />
                Makan Pagi
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  {...register('food.lunch')}
                  className="mr-2"
                />
                Makan Tengahari
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  {...register('food.dinner')}
                  className="mr-2"
                />
                Makan Petang
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  {...register('food.supper')}
                  className="mr-2"
                />
                Makan Malam
              </label>
            </div>

            <div>
              <label className="block mb-1">Air Mineral (RM1.00/botol)</label>
              <input
                type="number"
                {...register('food.mineralWater', { 
                  min: { value: 0, message: 'Bilangan air mineral tidak boleh negatif' },
                  valueAsNumber: true
                })}
                className="w-full p-2 border rounded"
                min="0"
                defaultValue={0}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setValue('food.mineralWater', value);
                  // Trigger price calculation after a short delay to ensure state updates
                  setTimeout(() => calculatePrice(), 100);
                }}
              />
              {errors.food?.mineralWater && <span className="text-red-500 text-sm">{errors.food.mineralWater.message}</span>}
            </div>

            {/* File Attachment Section */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <label className="block mb-2 text-lg font-medium">Dokumen Berkaitan (Pilihan)</label>
              <p className="text-sm text-gray-600 mb-4">
                Muat naik dokumen sokongan seperti surat rasmi, proposal, atau gambar berkaitan acara.
                Format yang disokong: PDF, DOC, DOCX, JPEG, PNG, GIF (Maksimum: 10MB setiap fail)
              </p>

              {/* File Upload Area */}
              <div 
                className={`
                  relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer
                  ${isDragOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpeg,.jpg,.png,.gif"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
                
                <div className="space-y-3">
                  <div className="text-4xl">📎</div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      Klik untuk muat naik atau seret fail ke sini
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      PDF, DOC, DOCX, gambar hingga 10MB
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Pilih Fail
                  </button>
                </div>
              </div>

              {/* File Upload Error */}
              {fileUploadError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <div className="text-red-400 mr-2">⚠️</div>
                    <div className="text-red-700 text-sm whitespace-pre-line">
                      {fileUploadError}
                    </div>
                  </div>
                </div>
              )}

              {/* Attached Files List */}
              {attachedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">📁</span>
                    Fail Dilampirkan ({attachedFiles.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {attachedFiles.map((file, index) => (
                      <div 
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:bg-muted"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="text-2xl flex-shrink-0">
                            {getFileIcon(file)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileRemove(file);
                          }}
                          className="flex-shrink-0 ml-3 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                          title="Buang fail"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      ✅ {attachedFiles.length} fail berjaya dilampirkan dan akan dihantar bersama permohonan tempahan.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DEBUG: Show current total price */}
          {/* <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800">
              🔍 Debug Info (Remove in production)
            </h4>
            <div className="text-sm text-yellow-700 mb-3">
              <div>Total Price: RM{totalPrice} {totalPrice === 0 ? '(Using Fallback Calculation)' : '(Main Pricing Engine)'}</div>
              <div>Start Date: {startDate}</div>
              <div>End Date: {endDate}</div>
              <div>Start Time (Form): {startTimeForm}</div>
              <div>Start Time (State): {startTime}</div>
              <div>End Time: {endTime}</div>
              <div>Equipment Selected: {peralatanTambahan ? Object.keys(peralatanTambahan).filter(key => peralatanTambahan[key]).length : 0}</div>
              <div>Water Bottles: {mineralWater}</div>
              <div>Has Facility Data: {!!facilityData}</div>
              {startTimeForm && endTime && (
                <div>Duration: {(() => {
                  const parseTimeToMinutes = (timeString: string): number => {
                    const [hours, minutes] = timeString.split(':').map(Number);
                    return hours * 60 + minutes;
                  };
                  const startMinutes = parseTimeToMinutes(startTimeForm);
                  const endMinutes = parseTimeToMinutes(endTime);
                  return Math.ceil((endMinutes - startMinutes) / 60);
                })()} hours (backend logic)</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => calculatePrice()}
              className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
            >
              🔄 Recalculate Price
            </button>
          </div> */}

        {(totalPrice > 0 || 
          (startTimeForm && endTime && facilityData) || 
          (peralatanTambahan && Object.keys(peralatanTambahan).some(key => peralatanTambahan[key])) ||
          mineralWater > 0) && (
                <div className="mt-6 p-0 bg-card rounded-lg border border-border overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4">
                    <h3 className="font-semibold text-lg flex items-center">
                      
                      Harga Terbaik untuk Anda
                    </h3>
                    <p className="text-green-100 text-sm">Sistem telah mengira harga paling optimum</p>
                  </div>
                  <div className="p-4">
                    {/* Total Price - Prominent Display */}
                    <div className="text-center py-4 mb-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-3xl font-bold text-green-700 mb-1">
                        RM {(() => {
                          // If totalPrice is 0, calculate a basic total including facility and equipment
                          if (totalPrice === 0) {
                            let calculatedTotal = 0;
                            
                            // Add facility cost if we have booking data - using backend logic
                            if (startTimeForm && endTime && facilityData?.rates) {
                              // Parse times to minutes (same as backend)
                              const parseTimeToMinutes = (timeString: string): number => {
                                const [hours, minutes] = timeString.split(':').map(Number);
                                return hours * 60 + minutes;
                              };
                              
                              const startMinutes = parseTimeToMinutes(startTimeForm);
                              const endMinutes = parseTimeToMinutes(endTime);
                              const hours = Math.ceil((endMinutes - startMinutes) / 60);
                              
                              if (hours > 0) {
                                const hourlyRate = facilityData.rates.hourlyRate || 50;
                                calculatedTotal += hours * hourlyRate;
                              }
                            }
                            
                            // Add equipment cost
                            if (peralatanTambahan && facilityData?.equipmentRates) {
                              Object.entries(facilityData.equipmentRates).forEach(([equipment, rate]) => {
                                const equipmentKey = equipment.toLowerCase().replace(/\s+/g, '');
                                if (peralatanTambahan[equipmentKey]) {
                                  calculatedTotal += rate;
                                }
                              });
                            }
                            
                            // Add water cost
                            if (mineralWater > 0) {
                              calculatedTotal += mineralWater * 1.00;
                            }
                            
                            return calculatedTotal.toFixed(2);
                          }
                          return totalPrice.toFixed(2);
                        })()}
                      </div>
                      <div className="text-green-600 text-sm">
                        {totalPrice === 0 ? 'Harga tempahan termasuk fasiliti dan peralatan' : 'Harga terbaik untuk tempahan anda'}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-2 mb-4">
                      <h4 className="font-medium text-gray-700 text-sm mb-2">Pecahan Harga:</h4>
                      {(() => {
                        // If we have priceBreakdown, use it
                        if (priceBreakdown && priceBreakdown.trim()) {
                          return priceBreakdown.split('\n').map((line, index) => {
                        if (line.includes('💰 Jimat:')) {
                          return (
                            <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm">
                              <span className="text-yellow-800 font-medium">{line}</span>
                            </div>
                          );
                        }
                        
                        const parts = line.split(': RM');
                        if (parts.length === 2) {
                          return (
                            <div key={index} className="flex justify-between text-sm py-1">
                              <span className="text-gray-600">{parts[0]}</span>
                              <span className="font-medium text-gray-900">RM{parts[1]}</span>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={index} className="text-sm text-gray-600 py-1">
                            {line}
                          </div>
                        );
                          });
                        }
                        
                        // Fallback: show detailed breakdown if available
                        const breakdownItems: React.ReactElement[] = [];
                        
                        // Add facility cost breakdown - using backend logic
                        if (startTimeForm && endTime && facilityData?.rates) {
                          // Parse times to minutes (same as backend)
                          const parseTimeToMinutes = (timeString: string): number => {
                            const [hours, minutes] = timeString.split(':').map(Number);
                            return hours * 60 + minutes;
                          };
                          
                          const startMinutes = parseTimeToMinutes(startTimeForm);
                          const endMinutes = parseTimeToMinutes(endTime);
                          const hours = Math.ceil((endMinutes - startMinutes) / 60);
                          
                          if (hours > 0) {
                            const hourlyRate = facilityData.rates.hourlyRate || 50;
                            const facilityCost = hours * hourlyRate;
                            breakdownItems.push(
                              <div key="facility" className="flex justify-between text-sm py-1">
                                <span className="text-gray-600">Sewa Fasiliti ({hours} jam)</span>
                                <span className="font-medium text-gray-900">RM{facilityCost}</span>
                              </div>
                            );
                          }
                        }
                        
                        // Add equipment breakdown
                        if (peralatanTambahan && facilityData?.equipmentRates) {
                          Object.entries(facilityData.equipmentRates).forEach(([equipment, rate]) => {
                            const equipmentKey = equipment.toLowerCase().replace(/\s+/g, '');
                            if (peralatanTambahan[equipmentKey]) {
                              breakdownItems.push(
                                <div key={equipment} className="flex justify-between text-sm py-1">
                                  <span className="text-gray-600">{equipment}</span>
                                  <span className="font-medium text-gray-900">RM{rate}</span>
                                </div>
                              );
                            }
                          });
                        }
                        
                        // Add water cost breakdown
                        if (mineralWater > 0) {
                          breakdownItems.push(
                            <div key="water" className="flex justify-between text-sm py-1">
                              <span className="text-gray-600">Air Mineral ({mineralWater} botol)</span>
                              <span className="font-medium text-gray-900">RM{(mineralWater * 1.00).toFixed(2)}</span>
                            </div>
                          );
                        }
                        
                        if (breakdownItems.length > 0) {
                          return breakdownItems;
                        }
                        
                        return (
                          <div className="text-sm text-gray-600 py-1">
                            Sila lengkapkan maklumat tempahan untuk melihat pecahan harga
                          </div>
                        );
                      })()}

                    </div>

                    <div className="bg-blue-50 rounded-lg p-3">
                     
                      <p className="mt-1 text-xs text-blue-700">
                        *Tidak termasuk harga makanan dan minuman (jika berkenaan)
                      </p>
                    </div>
                  </div>
          </div>
        )}

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
                >
                  <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
                  </svg>
                  <span>Kembali</span>
                </button>
          <button
            type="submit"
            disabled={isSubmitting}
            onClick={() => {
              console.log('Submit button clicked!');
              console.log('Active step:', activeStep);
              console.log('Is submitting:', isSubmitting);
              console.log('Booking data:', bookingData);
              console.log('Selected date:', selectedDate);
            }}
                  className="flex items-center bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Menghantar...
                    </div>
                  ) : (
                    <>
                      Hantar Permohonan
                      <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </>
                  )}
          </button>
        </div>
            </section>
          </>
        )}
      </form>
    </div>
  );
}

export default function BookingForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Memuatkan...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <BookingFormContent />
    </Suspense>
  );
}

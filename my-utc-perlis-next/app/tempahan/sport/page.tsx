"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import AvailabilityCalendar from '../../components/AvailabilityCalendar';
import SimpleBookingSelector from '../../components/SimpleBookingSelector';
import { SimpleBookingLogic } from '../../lib/simple-booking-logic';
import { SportPricingLogic, SportRates } from '../../lib/sport-pricing-logic';
import { getStrapiApiUrl, buildStrapiUrl, buildStrapiMediaUrl, validateConfig } from '../../../lib/config';

interface SportBookingFormData {
  applicantName: string;
  email: string;
  phoneNumber: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  sessionId: string;
}

interface FacilityData {
  id: string;
  name: string;
  capacity: number;
  documentId: string;
  type: string;
  rates: {
    // Sport facility day/night rates
    dayRate?: number;
    nightRate?: number;
    // Fallback compatibility rates
    hourlyRate?: number;
    halfDayRate?: number;
    fullDayRate?: number;
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

function SportBookingFormContent() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SportBookingFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [priceBreakdown, setPriceBreakdown] = useState<string>('');
  const [facilityData, setFacilityData] = useState<FacilityData | null>(null);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string>('');
  const [activeStep, setActiveStep] = useState<number>(1);
  const [sessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [bookingData, setBookingData] = useState<any>(null);
  
  // Payment proof upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const facilityId = searchParams.get('facilityId');
  
  // Date and availability states
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

  const [selectedDuration, setSelectedDuration] = useState<number>(0);

  // Fetch facility data
  useEffect(() => {
    const fetchFacility = async () => {
      if (!facilityId) return;
      
      const configValidation = validateConfig();
      if (!configValidation.isValid) {
        console.error('❌ Configuration validation failed:', configValidation.errors);
        setSubmitError('Configuration error: Unable to connect to server. Please contact administrator.');
        return;
      }
      
      const apiUrl = buildStrapiUrl(`api/facilities?filters[documentId][$eq]=${facilityId}&populate=*`);
      if (!apiUrl) {
        console.error('❌ Unable to build API URL - Strapi API URL not configured');
        setSubmitError('Configuration error: Unable to connect to server. Please contact administrator.');
        return;
      }
      
      try {
        console.log(`Fetching facility from: ${apiUrl}`);
        
        const res = await fetch(apiUrl, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch facility: ${res.status}`);
        }
        
        const result = await res.json();
        console.log('✅ Facility data received:', result);
        
        if (result.data && result.data.length > 0) {
          const facility = result.data[0];
          
          // Verify this is a sport facility
          if (facility.type !== 'SPORT') {
            setSubmitError('This facility is not a sport facility. Please use the regular booking form.');
            return;
          }
          
          setFacilityData({
            id: facility.id,
            name: facility.name,
            capacity: facility.capacity,
            documentId: facility.documentId,
            type: facility.type,
            rates: facility.rates || {},
            minimumDuration: facility.minimumDuration || 2,
            image: facility.image || []
          });
        } else {
          setSubmitError('Facility not found');
        }
      } catch (error) {
        console.error('❌ Error fetching facility:', error);
        setSubmitError('Failed to load facility information. Please try again.');
      }
    };

    fetchFacility();
  }, [facilityId]);

  // Set session ID
  useEffect(() => {
    setValue('sessionId', sessionId);
  }, [sessionId, setValue]);

  // Map booking data to form values
  const handleBookingChange = useCallback((booking: any) => {
    setValue('startTime', booking.startTime);
    setValue('endTime', booking.endTime);
    setValue('startDate', booking.startDate);
    setValue('endDate', booking.endDate);
    
    setBookingData(booking);
    console.log('Sport booking data updated:', booking);
  }, [setValue]);

  // Memoize facility rates
  const memoizedFacilityRates = useMemo(() => ({
    hourlyRate: facilityData?.rates?.hourlyRate || 0,
    halfDayRate: facilityData?.rates?.halfDayRate || 250,
    fullDayRate: facilityData?.rates?.fullDayRate || 400
  }), [facilityData?.rates?.hourlyRate, facilityData?.rates?.halfDayRate, facilityData?.rates?.fullDayRate]);

  // Check if facility supports hourly bookings
  const supportsHourlyBooking = useMemo(() => {
    return facilityData?.rates?.hourlyRate && facilityData.rates.hourlyRate > 0;
  }, [facilityData?.rates?.hourlyRate]);

  // Memoize existing bookings
  const memoizedExistingBookings = useMemo(() => {
    if (!dateAvailability?.bookedTimeSlots) return [];
    return dateAvailability.bookedTimeSlots.map(slot => ({
      startTime: slot.startTime.replace('.000', ''),
      endTime: slot.endTime.replace('.000', '')
    }));
  }, [dateAvailability?.bookedTimeSlots]);

  // Calculate price using sport pricing logic
  const calculatePrice = useCallback(() => {
    if (!bookingData || !facilityData) {
      setTotalPrice(0);
      setPriceBreakdown('');
      return;
    }

    try {
      // Use sport-specific pricing if day/night rates are available
      if (SportPricingLogic.hasDayNightRates(facilityData.rates)) {
        const sportPricing = SportPricingLogic.calculateSportPricing(
          {
            startDate: bookingData.startDate,
            endDate: bookingData.endDate,
            startTime: bookingData.startTime,
            endTime: bookingData.endTime
          },
          facilityData.rates as SportRates
        );

        setTotalPrice(sportPricing.totalPrice);
        setPriceBreakdown(sportPricing.breakdown.rateBreakdown);
      } else {
        // Fallback to regular pricing logic
        const pricing = SimpleBookingLogic.calculatePricing(
          {
            startDate: bookingData.startDate,
            endDate: bookingData.endDate,
            startTime: bookingData.startTime,
            endTime: bookingData.endTime
          },
          memoizedFacilityRates,
          0 // No equipment cost for sports
        );

        setTotalPrice(pricing.totalPrice);
        const breakdown = `${pricing.breakdown.duration} jam @ RM${(pricing.breakdown.basePrice / pricing.breakdown.duration).toFixed(2)}/jam`;
        setPriceBreakdown(breakdown);
      }
    } catch (error) {
      console.error('Error calculating sport pricing:', error);
      setTotalPrice(0);
      setPriceBreakdown('Error calculating price');
    }
  }, [bookingData, facilityData, memoizedFacilityRates]);

  // Recalculate price when booking data changes
  useEffect(() => {
    calculatePrice();
  }, [calculatePrice]);

  // Validation for each step
  const validateStep = (step: number): string[] => {
    const stepErrors: string[] = [];
    
    switch (step) {
      case 1:
        if (!watch('applicantName')) stepErrors.push('Nama diperlukan');
        if (!watch('email')) stepErrors.push('Alamat Emel diperlukan');
        if (!watch('phoneNumber')) stepErrors.push('No. Telefon diperlukan');
        
        // Format validation
        if (watch('applicantName') && watch('applicantName').length < 2) stepErrors.push('Nama mestilah sekurang-kurangnya 2 aksara');
        if (watch('phoneNumber') && !/^[0-9+\-() ]{8,15}$/.test(watch('phoneNumber'))) stepErrors.push('Format no. telefon tidak sah');
        if (watch('email') && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(watch('email'))) stepErrors.push('Format email tidak sah');
        break;
        
      case 2:
        if (!selectedDate) stepErrors.push('Tarikh diperlukan');
        if (!bookingData?.isValid) stepErrors.push('Masa tempahan tidak sah');
        break;
        
      case 3:
        if (!uploadFile) stepErrors.push('Bukti pembayaran diperlukan');
        break;
    }
    
    return stepErrors;
  };

  // Check if step is valid
  const isStepValid = (step: number): boolean => {
    return validateStep(step).length === 0;
  };

  // Navigation functions
  const nextStep = () => {
    const currentStepErrors = validateStep(activeStep);
    
    if (currentStepErrors.length > 0) {
      setSubmitError(currentStepErrors.join(', '));
      handleSubmit(() => {})();
      return;
    }
    
    setSubmitError('');
    const newStep = Math.min(activeStep + 1, 3);
    setActiveStep(newStep);
  };

  const prevStep = () => {
    const newStep = Math.max(activeStep - 1, 1);
    setActiveStep(newStep);
  };

  // Form submission
  const onSubmit = async (data: SportBookingFormData) => {
    console.log('🏀 SPORT BOOKING SUBMIT TRIGGERED!');
    console.log('Form submitted with data:', data);
    console.log('Booking data:', bookingData);
    
    if (activeStep === 3) {
      const allErrors = [];
      for (let step = 1; step <= 3; step++) {
        allErrors.push(...validateStep(step));
      }
      
      if (allErrors.length > 0) {
        setSubmitError('Please fix the following errors: ' + allErrors.join(', '));
        return;
      }
      
      if (!bookingData || !bookingData.isValid) {
        setSubmitError('Invalid booking data. Please select a valid time slot.');
        return;
      }
      
      setIsSubmitting(true);
      setSubmitError('');
      
      try {
        const formData = new FormData();
        
        // Sport booking specific data
        formData.append('name', data.applicantName);
        formData.append('email', data.email);
        formData.append('phoneNo', data.phoneNumber);
        formData.append('jabatan', 'Sport Booking'); // Default for sports
        formData.append('address', 'Not Required'); // Default for sports
        formData.append('purpose', 'Sport Activity');
        formData.append('eventName', `${facilityData?.name} Booking`);
        formData.append('startDate', data.startDate);
        formData.append('endDate', data.endDate);
        formData.append('startTime', data.startTime);
        formData.append('endTime', data.endTime);
        formData.append('attendance', '1'); // Default for sports
        formData.append('totalPrice', totalPrice.toString());
        formData.append('packageType', bookingData.packageType || 'PER_JAM');
        formData.append('rentDetails', JSON.stringify({})); // No equipment for sports
        formData.append('meal', JSON.stringify({})); // No food for sports
        formData.append('facilityId', facilityData!.documentId);
        formData.append('sessionId', data.sessionId);
        
        // Add payment proof file
        if (uploadFile) {
          formData.append('payment_proof', uploadFile);
        }
        
        // Submit the booking
        const response = await fetch('/api/bookings/create', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create booking');
        }
        
        console.log('✅ Sport booking created successfully:', result);
        
        // Success
        setSubmitSuccess(true);
        let successMessage = `Tempahan berjaya dibuat! Nombor rujukan: ${result.bookingNumber}`;
        if (uploadFile) {
          successMessage += ` Bukti pembayaran telah diterima.`;
        }
        setSubmitSuccessMessage(successMessage);
        setSubmitError('');
        
      } catch (error) {
        console.error('❌ Error submitting sport booking:', error);
        setSubmitError(error instanceof Error ? error.message : 'Failed to submit booking. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      nextStep();
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Saiz fail tidak boleh melebihi 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Format fail tidak disokong. Sila gunakan JPEG, PNG, GIF atau PDF');
      return;
    }

    setUploadFile(file);
    setUploadError('');
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              activeStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {step}
            </div>
            {step < 3 && (
              <div className={`w-16 h-1 ${
                activeStep > step ? 'bg-blue-600' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Tempahan Berjaya!</h2>
              <p className="text-gray-600 mb-6">{submitSuccessMessage}</p>
              <div className="space-y-2">
                <button
                  onClick={() => window.location.href = '/tempahan/status'}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Semak Status Tempahan
                </button>
                <br />
                <button
                  onClick={() => window.location.href = '/fasiliti'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Kembali ke Senarai Fasiliti
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!facilityData && !submitError) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Memuatkan maklumat fasiliti...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Tempahan Fasiliti Sukan</h1>
                <p className="text-blue-100 mt-2">
                  {facilityData ? facilityData.name : 'Loading...'}
                </p>
              </div>
              {facilityData?.image && facilityData.image.length > 0 && (
                <div className="hidden md:block">
                  <Image
                    src={buildStrapiMediaUrl(facilityData.image[0].url) || ''}
                    alt={facilityData.name}
                    width={120}
                    height={80}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {renderStepIndicator()}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {submitError}</span>
                </div>
              )}

              {/* Step 1: Personal Information */}
              <section className={`${activeStep !== 1 ? 'hidden' : ''}`}>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 flex items-center">
                    <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                    Maklumat Peribadi
                  </h2>
                  <p className="text-sm text-gray-600">Sila isi maklumat peribadi anda</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Nama <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('applicantName', { 
                        required: 'Nama diperlukan',
                        minLength: { value: 2, message: 'Nama mestilah sekurang-kurangnya 2 aksara' },
                        maxLength: { value: 100, message: 'Nama tidak boleh melebihi 100 aksara' }
                      })}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Masukkan nama penuh anda"
                    />
                    {errors.applicantName && (
                      <div className="mt-2 flex items-center text-red-600 text-sm">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.applicantName.message}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Alamat Emel <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      {...register('email', { 
                        required: 'Alamat Emel diperlukan',
                        pattern: {
                          value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                          message: 'Format email tidak sah'
                        }
                      })}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="contoh@email.com"
                    />
                    {errors.email && (
                      <div className="mt-2 flex items-center text-red-600 text-sm">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.email.message}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      No. Telefon <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      {...register('phoneNumber', { 
                        required: 'No. Telefon diperlukan',
                        pattern: {
                          value: /^[0-9+\-() ]{8,15}$/,
                          message: 'Format no. telefon tidak sah'
                        }
                      })}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Contoh: 04-1234567 atau 012-3456789"
                    />
                    {errors.phoneNumber && (
                      <div className="mt-2 flex items-center text-red-600 text-sm">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.phoneNumber.message}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    <span>Seterusnya</span>
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                    </svg>
                  </button>
                </div>
              </section>

              {/* Step 2: Date and Time Selection */}
              <section className={`${activeStep !== 2 ? 'hidden' : ''}`}>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-6">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 flex items-center">
                    <span className="bg-green-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                    Pilih Tarikh dan Masa
                  </h2>
                  <p className="text-sm text-gray-600">Pilih tarikh dan masa untuk tempahan anda (minimum 2 jam)</p>
                </div>

                {facilityData && (
                  <div className="space-y-6">
                    {/* Rate Information */}
                    {SportPricingLogic.hasDayNightRates(facilityData.rates) && (
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 p-4 rounded-lg">
                        <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                          </svg>
                          Kadar Sewaan
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                            <div className="flex items-center mb-2">
                              <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                              </svg>
                              <span className="font-medium text-blue-800">Kadar Siang</span>
                            </div>
                            <p className="text-sm text-blue-700">8:00 AM - 7:00 PM</p>
                            <p className="text-lg font-bold text-blue-800">RM{SportPricingLogic.getRateInfo(facilityData.rates).dayRate}/jam</p>
                          </div>
                          <div className="bg-indigo-50 border border-indigo-200 p-3 rounded">
                            <div className="flex items-center mb-2">
                              <svg className="w-4 h-4 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                              </svg>
                              <span className="font-medium text-indigo-800">Kadar Malam</span>
                            </div>
                            <p className="text-sm text-indigo-700">8:00 PM - 12:00 AM</p>
                            <p className="text-lg font-bold text-indigo-800">RM{SportPricingLogic.getRateInfo(facilityData.rates).nightRate}/jam</p>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-yellow-700">
                          <p>💡 <strong>Nota:</strong> Tempahan minimum 2 jam. Harga akan dikira mengikut kadar masa yang dipilih.</p>
                        </div>
                      </div>
                    )}

                    <SimpleBookingSelector
                      facilityRates={memoizedFacilityRates}
                      facilityId={facilityData.documentId}
                      supportsHourlyBooking={supportsHourlyBooking}
                      minimumDuration={facilityData.minimumDuration || 2}
                      onBookingChange={handleBookingChange}
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                      existingBookings={memoizedExistingBookings}
                    />

                    {bookingData && bookingData.isValid && (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">📋 Ringkasan Tempahan</h4>
                        <div className="space-y-1 text-sm text-blue-700">
                          <p><strong>Fasiliti:</strong> {facilityData.name}</p>
                          <p><strong>Tarikh:</strong> {format(new Date(bookingData.startDate), 'dd/MM/yyyy')}</p>
                          <p><strong>Masa:</strong> {bookingData.startTime} - {bookingData.endTime}</p>
                          <p><strong>Tempoh:</strong> {bookingData.duration} jam</p>
                          {priceBreakdown && <p><strong>Pecahan Harga:</strong> {priceBreakdown}</p>}
                          <div className="border-t border-blue-200 pt-2 mt-2">
                            <p className="font-semibold"><strong>Jumlah Harga:</strong> RM{totalPrice.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
                  >
                    <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                    </svg>
                  </button>
                </div>
              </section>

              {/* Step 3: Payment Upload */}
              <section className={`${activeStep !== 3 ? 'hidden' : ''}`}>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 flex items-center">
                    <span className="bg-purple-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                    Muat Naik Bukti Pembayaran
                  </h2>
                  <p className="text-sm text-gray-600">Sila muat naik bukti pembayaran untuk melengkapkan tempahan</p>
                </div>

                <div className="space-y-6">
                  {/* Payment Info */}
                  {totalPrice > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-yellow-800 mb-2">💳 Maklumat Pembayaran</h4>
                      <p className="text-sm text-yellow-700 mb-2">
                        <strong>Jumlah Bayaran:</strong> RM{totalPrice.toFixed(2)}
                      </p>
                      <p className="text-sm text-yellow-700">
                        Sila buat pembayaran ke akaun yang diberikan dan muat naik bukti pembayaran di bawah.
                      </p>
                    </div>
                  )}

                  {/* QR Code Section */}
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <h4 className="font-semibold mb-2">Imbas QR Code untuk Pembayaran</h4>
                    <div className="flex justify-center mb-2">
                      <Image
                        src="/qr.png"
                        alt="QR Code Pembayaran"
                        width={200}
                        height={200}
                        className="border border-gray-300 rounded"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQRModal(true)}
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      Klik untuk pandangan lebih besar
                    </button>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Bukti Pembayaran <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format yang disokong: JPEG, PNG, GIF, PDF (Max: 10MB)
                    </p>
                    {uploadError && (
                      <div className="mt-2 text-red-600 text-sm">{uploadError}</div>
                    )}
                  </div>

                  {uploadFile && (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-gray-700">{uploadFile.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadFile(null)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400 transition-colors"
                  >
                    <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path>
                    </svg>
                    <span>Kembali</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !uploadFile}
                    className="flex items-center bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-green-300 transition-colors"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>Menghantar...</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span>Hantar Tempahan</span>
                        <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
              </section>
            </form>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">QR Code Pembayaran</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-center">
              <Image
                src="/qr.png"
                alt="QR Code Pembayaran"
                width={250}
                height={250}
                className="mx-auto border border-gray-300 rounded"
              />
              <p className="text-sm text-gray-600 mt-2">
                Imbas kod ini untuk membuat pembayaran
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SportBookingForm() {
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
      <SportBookingFormContent />
    </Suspense>
  );
}

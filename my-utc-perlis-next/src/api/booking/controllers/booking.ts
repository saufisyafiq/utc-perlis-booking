'use strict';

/**
 * Booking controller
 */
const { createCoreController } = require('@strapi/strapi').factories;

// TypeScript interfaces for type safety
interface QueryFilters {
  [key: string]: any;
  bookingStatus?: string;
  $or?: Array<{[key: string]: any}>;
}

interface BookingData {
  id: number;
  documentId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  bookingStatus: string;
  rentDetails?: {
    duration?: string;
  };
}

interface StrapiContext {
  request: {
    query: {
      [key: string]: any;
      page?: string;
      pageSize?: string;
      status?: string;
      search?: string;
    };
  };
  badRequest: (message: string) => any;
  notFound: (message: string) => any;
  internalServerError: (message: string) => any;
}

module.exports = createCoreController('api::booking.booking', ({ strapi }: { strapi: any }) => ({
  /**
   * Get all published bookings with pagination using Document Service API
   * Uses Strapi v5 Document Service API with status: 'published'
   * @param {StrapiContext} ctx - Strapi context
   * @returns {Object} Paginated published bookings data
   */
  async getAllBookings(ctx: StrapiContext) {
    try {
      const { page = '1', pageSize = '5', ...filters } = ctx.request.query;
      
      // Convert page and pageSize to numbers
      const currentPage = parseInt(page, 10);
      const limit = parseInt(pageSize, 10);
      const start = (currentPage - 1) * limit; // Calculate start offset

      console.log(`[DEBUG] Fetching published bookings - Page: ${currentPage}, Limit: ${limit}, Start: ${start}`);

      // Build Document Service API parameters according to documentation
      const params = {
        status: 'published', // Only fetch published documents
        limit: limit,       // Use limit directly (not in pagination object)
        start: start,       // Use start directly (not in pagination object)  
        filters: {} as any,
        sort: { createdAt: 'desc' },
        populate: {
          facility: {
            fields: [
              'id',
              'documentId',
              'name',
              'location',
              'capacity',
              'amenities',
              'rates',
              'minimumDuration',
              'type',
              'facilityStatus',
              'equipmentRates',
              'guidelines'
            ]
          }
        },
        fields: [
          'id', 
          'documentId', 
          'name', 
          'jabatan', 
          'address', 
          'phoneNo', 
          'email',
          'purpose', 
          'eventName', 
          'startDate', 
          'endDate', 
          'startTime', 
          'endTime', 
          'attendance', 
          'totalPrice',
          'rentDetails',
          'meal',
          'bookingStatus',
          'paymentStatus',
          'statusReason',
          'processedAt',
          'sessionId',
          'packageType',
          'createdAt',
          'updatedAt',
          'publishedAt'
        ]
      };

      // Add status filter if provided
      if (filters.status) {
        params.filters.bookingStatus = {
          $eq: filters.status
        };
      }
      
      // Add search filter if provided
      if (filters.search) {
        params.filters.$or = [
          { name: { $containsi: filters.search } },
          { email: { $containsi: filters.search } },
          { eventName: { $containsi: filters.search } }
        ];
      }

      // Use Document Service API
      const documents = await strapi.documents('api::booking.booking').findMany(params);
      
      // Get total count for pagination (with same filters)
      const totalCount = await strapi.documents('api::booking.booking').count({
        status: 'published',
        filters: params.filters
      });

      console.log(`[DEBUG] API Response structure:`, {
        documentsType: typeof documents,
        documentsLength: Array.isArray(documents) ? documents.length : 'not array',
        totalCount: totalCount
      });

      // Document Service API returns documents directly (not wrapped in data object)
      const bookings = Array.isArray(documents) ? documents : [];

      console.log(`[INFO] Fetched ${bookings.length} published bookings out of ${totalCount} total (Page ${currentPage})`);

      // Calculate pagination metadata manually
      const totalPages = Math.ceil(totalCount / limit);
      
      // Return result in consistent format
      return {
        data: bookings,
        meta: {
          pagination: {
            page: currentPage,
            pageSize: limit,
            pageCount: totalPages,
            total: totalCount,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
          }
        }
      };
    } catch (error) {
      console.error('[ERROR] Error fetching published bookings:', error);
      return ctx.internalServerError('An error occurred while fetching published bookings');
    }
  },

  /**
   * Get availability for a facility in a date range
   * @param {StrapiContext} ctx - Strapi context
   * @returns {Object} Availability data
   */
  async getAvailability(ctx: StrapiContext) {
    try {
      const { facilityId } = ctx.request.query;
      
      if (!facilityId) {
        return ctx.badRequest('Facility ID is required');
      }
      
      // Get facility details
      const facility = await strapi.db.query('api::facility.facility').findOne({
        where: { documentId: facilityId },
        select: ['id', 'name', 'capacity', 'minimumDuration'],
        populate: ['rates'],
      });
      
      if (!facility) {
        return ctx.notFound('Facility not found');
      }
      
      // Get current date and set up date range (current date + 30 days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // FIXED: Create a new Date object for end date to prevent modifying 'today'
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 30); // Add 30 days properly
      
      // Format dates for query
      const formattedStartDate = today.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      console.log(`[DEBUG] Date range: ${formattedStartDate} to ${formattedEndDate}`);
      
      // Get all bookings for this facility within date range
      const bookings = await strapi.db.query('api::booking.booking').findMany({
        where: {
          facility: facility.id,
          $or: [
            { bookingStatus: 'APPROVED' },
            { bookingStatus: 'PENDING' }
          ],
          $and: [
            {
              $or: [
                { startDate: { $gte: formattedStartDate } },
                { endDate: { $gte: formattedStartDate } }
              ]
            },
            {
              $or: [
                { startDate: { $lte: formattedEndDate } },
                { endDate: { $lte: formattedEndDate } }
              ]
            }
          ]
        },
        select: ['id', 'documentId', 'startDate', 'endDate', 'startTime', 'endTime', 'bookingStatus'],
        populate: {
          rentDetails: true
        }
      });
      
      console.log(`[DEBUG] Found ${bookings.length} bookings for facility ${facilityId}`);
      
      // Log all bookings for debugging
      bookings.forEach((booking: BookingData) => {
        console.log(`[DEBUG] Booking ${booking.id} (${booking.documentId}): ${booking.startDate} to ${booking.endDate}, time: ${booking.startTime} - ${booking.endTime}, status: ${booking.bookingStatus}`);
      });
      
      // Generate availability data for each day in range
      const availabilityData = [];
      
      // Loop through each day in the date range
      const currentDate = new Date(today);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Find bookings for current date
        const dateBookings = bookings.filter((booking: BookingData) => {
          // Create date objects for comparison (without time part)
          const bookingStartDate = new Date(booking.startDate + 'T00:00:00Z');
          const bookingEndDate = new Date(booking.endDate + 'T00:00:00Z');
          const currDateCopy = new Date(dateStr + 'T00:00:00Z');
          
          // Check if current date falls within booking range
          return currDateCopy >= bookingStartDate && currDateCopy <= bookingEndDate;
        });
        
        console.log(`[DEBUG] Date ${dateStr} has ${dateBookings.length} bookings`);
        
        // Log each booking found for this date
        dateBookings.forEach((booking: BookingData) => {
          console.log(`[DEBUG] Date ${dateStr} has booking ${booking.id} (${booking.documentId})`);
        });
        
        // Map booking data
        const mappedBookings = dateBookings.map((booking: BookingData) => {
          // Create date objects for comparison (without time part)
          const bookingStartDate = new Date(booking.startDate + 'T00:00:00Z');
          const bookingEndDate = new Date(booking.endDate + 'T00:00:00Z');
          const currDateCopy = new Date(dateStr + 'T00:00:00Z');
          
          const isFirstDay = currDateCopy.getTime() === bookingStartDate.getTime();
          const isLastDay = currDateCopy.getTime() === bookingEndDate.getTime();
          const isMultiDayBooking = booking.startDate !== booking.endDate;
          
          let effectiveStartTime = '00:00';
          let effectiveEndTime = '23:59';
          
          // Adjust times based on which day in the multi-day booking
          if (isMultiDayBooking) {
            if (isFirstDay) {
              // For first day, use the original start time to end of day
              effectiveStartTime = booking.startTime ? booking.startTime.split(':').slice(0, 2).join(':') : '00:00';
              effectiveEndTime = '23:59';
            } else if (isLastDay) {
              // For last day, use start of day to the original end time
              effectiveStartTime = '00:00';
              effectiveEndTime = booking.endTime ? booking.endTime.split(':').slice(0, 2).join(':') : '23:59';
            }
            // For middle days, already set to full day (00:00-23:59)
          } else {
            // Single day booking
            effectiveStartTime = booking.startTime ? booking.startTime.split(':').slice(0, 2).join(':') : '00:00';
            effectiveEndTime = booking.endTime ? booking.endTime.split(':').slice(0, 2).join(':') : '23:59';
          }
          
          console.log(`[DEBUG] Booking ${booking.id} on ${dateStr}: ${isMultiDayBooking ? 'multi-day' : 'single-day'}, ${isFirstDay ? 'first day' : isLastDay ? 'last day' : 'middle day'}, times: ${effectiveStartTime}-${effectiveEndTime}`);
          
          return {
            id: booking.id,
            startTime: effectiveStartTime,
            endTime: effectiveEndTime,
            duration: booking.rentDetails?.duration || 'PER_JAM',
            status: booking.bookingStatus
          };
        });
        
        // Determine if day is fully booked (any full-day bookings or overlapping bookings that cover all hours)
        let isFullyBooked = false;
        
        // Check for full day bookings (00:00-23:59 or 08:00-23:59)
        const hasFullDayBooking = mappedBookings.some((booking: any) => 
          (booking.startTime === '00:00' && booking.endTime === '23:59') ||
          (booking.startTime === '08:00' && booking.endTime === '23:59')
        );
        
        if (hasFullDayBooking) {
          isFullyBooked = true;
        }
        
        // Calculate available time slots
        let availableSlots: Array<{startTime: string; endTime: string}> = [];
        
        if (isFullyBooked) {
          availableSlots = [];
        } else if (mappedBookings.length > 0) {
          // Define operating hours (default: 8am - 11pm)
          const operatingStart = '08:00';
          const operatingEnd = '23:00';
          
          // Sort bookings by start time
          const sortedBookings = [...mappedBookings].sort((a, b) => {
            return a.startTime.localeCompare(b.startTime);
          });
          
          // Initialize with full operating hours
          availableSlots = [{ startTime: operatingStart, endTime: operatingEnd }];
          
          // Remove booked time slots
          sortedBookings.forEach(booking => {
            const updatedSlots: Array<{startTime: string; endTime: string}> = [];
            
            availableSlots.forEach(slot => {
              // If booking completely overlaps slot, skip this slot
              if (booking.startTime <= slot.startTime && booking.endTime >= slot.endTime) {
                return;
              }
              
              // If booking starts before slot and ends within slot
              if (booking.startTime < slot.startTime && booking.endTime > slot.startTime && booking.endTime < slot.endTime) {
                updatedSlots.push({
                  startTime: booking.endTime,
                  endTime: slot.endTime
                });
              }
              // If booking starts within slot and ends after slot
              else if (booking.startTime > slot.startTime && booking.startTime < slot.endTime && booking.endTime > slot.endTime) {
                updatedSlots.push({
                  startTime: slot.startTime,
                  endTime: booking.startTime
                });
              }
              // If booking is completely within slot, split the slot
              else if (booking.startTime >= slot.startTime && booking.endTime <= slot.endTime) {
                if (booking.startTime > slot.startTime) {
                  updatedSlots.push({
                    startTime: slot.startTime,
                    endTime: booking.startTime
                  });
                }
                
                if (booking.endTime < slot.endTime) {
                  updatedSlots.push({
                    startTime: booking.endTime,
                    endTime: slot.endTime
                  });
                }
              }
              // If booking doesn't overlap with slot, keep the slot
              else {
                updatedSlots.push(slot);
              }
            });
            
            availableSlots = updatedSlots;
          });
          
          // If no available slots, mark as fully booked
          if (availableSlots.length === 0) {
            isFullyBooked = true;
          }
        } else {
          // No bookings, the entire operating hours are available
          availableSlots = [{ startTime: '08:00', endTime: '23:00' }];
        }
        
        // Add date availability data
        availabilityData.push({
          date: dateStr,
          isFullyBooked,
          bookings: mappedBookings,
          availableSlots: isFullyBooked ? [] : availableSlots
        });
        
        // Move to next day - make sure we increment correctly
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Format facility data for response
      const formattedFacility = {
        id: facility.documentId,
        name: facility.name,
        capacity: facility.capacity,
        minimumDuration: facility.minimumDuration,
        rates: {
          hourlyRate: facility.rates?.hourlyRate,
          fullDayRate: facility.rates?.fullDayRate,
          halfDayRate: facility.rates?.halfDayRate
        }
      };
      
      return {
        data: {
          facility: formattedFacility,
          availability: availabilityData
        }
      };
    } catch (error) {
      console.error('[ERROR] Error getting availability:', error);
      return ctx.internalServerError('An error occurred while fetching availability');
    }
  }
}));

// Helper function to convert minutes to time string (HH:MM)
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
} 
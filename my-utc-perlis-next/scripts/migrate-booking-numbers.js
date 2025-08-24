/**
 * Migration script to add booking numbers to existing bookings
 * Run this script to update all existing bookings with proper booking numbers
 * 
 * Usage: node scripts/migrate-booking-numbers.js
 */

const fetch = require('node-fetch');
require('dotenv').config();

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_API_URL || !STRAPI_API_TOKEN) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_STRAPI_API_URL or STRAPI_API_TOKEN');
  process.exit(1);
}

async function generateBookingNumber(year, sequence) {
  return `UTC-${year}-${sequence.toString().padStart(4, '0')}`;
}

async function migrateBookingNumbers() {
  try {
    console.log('🚀 Starting booking number migration...');
    
    // Fetch all bookings without booking numbers
    console.log('📥 Fetching bookings without booking numbers...');
    const response = await fetch(
      `${STRAPI_API_URL}/api/bookings?filters[bookingNumber][$null]=true&pagination[limit]=1000&sort=createdAt:asc`,
      {
        headers: {
          'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch bookings: ${response.status}`);
    }

    const data = await response.json();
    const bookings = data.data;

    console.log(`📊 Found ${bookings.length} bookings without booking numbers`);

    if (bookings.length === 0) {
      console.log('✅ All bookings already have booking numbers!');
      return;
    }

    // Group bookings by year
    const bookingsByYear = {};
    bookings.forEach(booking => {
      const createdAt = booking.createdAt || booking.attributes?.createdAt;
      const year = new Date(createdAt).getFullYear();
      
      if (!bookingsByYear[year]) {
        bookingsByYear[year] = [];
      }
      bookingsByYear[year].push(booking);
    });

    console.log('📅 Bookings by year:', Object.keys(bookingsByYear).map(year => `${year}: ${bookingsByYear[year].length}`).join(', '));

    let totalUpdated = 0;
    let totalFailed = 0;

    // Process each year
    for (const [year, yearBookings] of Object.entries(bookingsByYear)) {
      console.log(`\n📆 Processing ${yearBookings.length} bookings for year ${year}...`);
      
      // Check if there are existing booking numbers for this year
      const existingResponse = await fetch(
        `${STRAPI_API_URL}/api/bookings?filters[bookingNumber][$startsWith]=UTC-${year}&sort=bookingNumber:desc&pagination[limit]=1`,
        {
          headers: {
            'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
          },
        }
      );

      let startSequence = 1;
      if (existingResponse.ok) {
        const existingData = await existingResponse.json();
        if (existingData.data && existingData.data.length > 0) {
          const lastBookingNumber = existingData.data[0].bookingNumber || existingData.data[0].attributes?.bookingNumber;
          if (lastBookingNumber) {
            const sequenceMatch = lastBookingNumber.match(/UTC-\d{4}-(\d{4})/);
            if (sequenceMatch) {
              startSequence = parseInt(sequenceMatch[1], 10) + 1;
            }
          }
        }
      }

      console.log(`🔢 Starting sequence for ${year}: ${startSequence}`);

      // Update each booking
      for (let i = 0; i < yearBookings.length; i++) {
        const booking = yearBookings[i];
        const bookingId = booking.id;
        const documentId = booking.documentId || booking.attributes?.documentId;
        const sequence = startSequence + i;
        const bookingNumber = await generateBookingNumber(year, sequence);

        try {
          console.log(`📝 Updating booking ${bookingId} (${documentId}) with number: ${bookingNumber}`);
          
          const updateResponse = await fetch(
            `${STRAPI_API_URL}/api/bookings/${documentId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
              },
              body: JSON.stringify({
                data: {
                  bookingNumber: bookingNumber
                }
              }),
            }
          );

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error(`❌ Failed to update booking ${bookingId}:`, errorData);
            totalFailed++;
          } else {
            console.log(`✅ Updated booking ${bookingId} with ${bookingNumber}`);
            totalUpdated++;
          }

          // Add small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Error updating booking ${bookingId}:`, error.message);
          totalFailed++;
        }
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successfully updated: ${totalUpdated} bookings`);
    console.log(`❌ Failed to update: ${totalFailed} bookings`);

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateBookingNumbers();

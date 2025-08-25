'use strict';

/**
 * Custom booking routes
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/booking/availability',
      handler: 'api::booking.booking.getAvailability',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/booking/all',
      handler: 'api::booking.booking.getAllBookings',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/booking/payment-upload',
      handler: 'api::booking.booking.uploadPaymentProof',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    // You can add other custom booking routes here
  ],
};
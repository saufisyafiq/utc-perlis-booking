'use strict';

/**
 * Custom media-fixer routes
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/media-fixer/test',
      handler: 'api::media-fixer.media-fixer.test',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/media-fixer/fix-urls',
      handler: 'api::media-fixer.media-fixer.fixUrls',
      config: {
        policies: [],
        middlewares: [],
        auth: false, // Set to true in production for security
      },
    },
  ],
};

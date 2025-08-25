'use strict';

/**
 * media-fixer router
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/media-fixer/fix-urls',
      handler: 'media-fixer.fixUrls',
      config: {
        auth: false, // Set to true in production for security
      },
    },
  ],
};

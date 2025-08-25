export default ({ env }) => ({
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
    remote: {
      enabled: true, // Enable data transfer
    },
  },
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', 'https://strapi.utcperlis.com'),
  app: {
    keys: env.array('APP_KEYS'),
  },
});
